import type { AnalysisResult, CategoryResult } from "../schema.ts";
import type { AnalysisProvider } from "./types.ts";

// Placeholder analysis provider — no external API call, no cost, no API key required.
//
// Why this exists: real analysis via a paid Claude/GPT-4V API key is intentionally deferred
// until near the end of the build (API keys get purchased once the rest of the app is basically
// finished, not during earlier development/testing). Until then, ANALYSIS_PROVIDER defaults to
// "mock" (see ./index.ts) so the full analyze-scan pipeline — content-safety check, schema
// validation, blocklist backstop, score rescale, DB writes, the mobile results screen — can be
// built and tested end-to-end for free. Swapping to real Claude/GPT-4V later is a one-line env
// var change (ANALYSIS_PROVIDER=claude|gpt4v with the matching API key set) — no code changes
// needed anywhere else, since this satisfies the exact same AnalysisProvider contract.
//
// This does NOT look at the photo's pixels — it's a small deterministic-per-photo generator
// (same base64 in -> same result out, different photo -> different result) that produces
// plausible, schema-valid, guardrail-compliant output. Good enough to exercise the full pipeline
// and UI; not a real stand-in for vision quality/accuracy testing (use eval/ for that once real
// keys are in play).

function makeRng(seed: string): () => number {
  let state = 0;
  for (let i = 0; i < seed.length; i += 7) {
    state = (state * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return () => {
    state = (state * 1103515245 + 12345) >>> 0;
    return (state >>> 8) / 0xffffff;
  };
}

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: readonly T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    out.push(copy.splice(Math.floor(rng() * copy.length), 1)[0]);
  }
  return out;
}

function scoreRange(min: number, max: number, rng: () => number): number {
  return Math.round(min + rng() * (max - min));
}

const MST_LABELS = [
  "very fair, cool undertone",
  "fair, neutral undertone",
  "light, warm undertone",
  "light-medium, neutral undertone",
  "medium, warm undertone",
  "medium-deep, neutral undertone",
  "deep, warm undertone",
  "deep, cool undertone",
  "very deep, neutral undertone",
  "very deep, warm undertone",
] as const;

const HAIR_RECS = [
  {
    title: "Soft face-framing layers",
    rationale: "Layers around the cheekbones add movement and softly highlight your features.",
    how_to: "Ask a stylist for long, face-framing layers starting at cheekbone length.",
  },
  {
    title: "Deep side part",
    rationale: "A deeper part tends to balance proportions better than a centered one.",
    how_to: "Part hair 70/30 rather than down the middle when styling.",
  },
  {
    title: "Root volume at the crown",
    rationale: "Added lift at the crown creates a more balanced silhouette.",
    how_to: "Blow-dry roots upward with a round brush, or ask about a volumizing perm.",
  },
  {
    title: "Glossing treatment",
    rationale: "A glossy finish makes any hair color and cut look more polished.",
    how_to: "Ask for an in-salon gloss treatment every 6-8 weeks, or use an at-home gloss mask.",
  },
  {
    title: "Soft waves",
    rationale: "Loose waves add texture and movement that suits most face shapes.",
    how_to: "Use a 1-inch curling wand on alternating sections, then brush out gently.",
  },
] as const;

const BROW_RECS = [
  {
    title: "Soft natural arch",
    rationale: "A gentle arch balances your features without looking severe.",
    how_to: "Ask a brow specialist for shaping that follows your natural arch, just cleaned up.",
  },
  {
    title: "Fill sparse areas",
    rationale: "Filling thin patches close to your natural color adds polish without looking drawn-on.",
    how_to: "Use a brow pencil in short, hair-like strokes, then blend with a spoolie.",
  },
  {
    title: "Clear brow gel",
    rationale: "Keeping brow hairs set in place gives a groomed look with zero extra effort.",
    how_to: "Brush a clear (or tinted) brow gel upward and outward each morning.",
  },
  {
    title: "Tidy the outer edge",
    rationale: "Cleaning up strays outside the natural line sharpens the whole shape.",
    how_to: "Tweeze only stray hairs outside your natural brow line, never inside it.",
  },
] as const;

const SKIN_RECS = [
  {
    title: "Daily SPF",
    rationale: "Sun protection preserves an even tone and keeps your natural glow longer.",
    how_to: "Apply a broad-spectrum SPF 30+ every morning, even indoors.",
  },
  {
    title: "Lightweight hydration",
    rationale: "A hydrating layer evens out texture without feeling heavy.",
    how_to: "Use a gel-based moisturizer morning and night after cleansing.",
  },
  {
    title: "Gentle weekly exfoliation",
    rationale: "Regular gentle exfoliation keeps your natural brightness coming through.",
    how_to: "Use a mild chemical exfoliant (like a low-strength AHA) 1-2x a week, not more.",
  },
  {
    title: "Vitamin C in the morning",
    rationale: "A vitamin C serum gradually brightens and evens out tone.",
    how_to: "Apply a few drops after cleansing, before moisturizer, each morning.",
  },
] as const;

const MAKEUP_RECS = [
  {
    title: "Dewy, lightweight base",
    rationale: "A lighter base lets your natural texture and glow show through.",
    how_to: "Mix a few drops of illuminating primer into your regular foundation.",
  },
  {
    title: "Cream blush placed high",
    rationale: "Placing blush higher on the cheeks gives a fresh, lifted look.",
    how_to: "Dab a cream blush on the apples of your cheeks and blend upward toward the temple.",
  },
  {
    title: "Soft brown liner",
    rationale: "Brown liner adds definition without looking as heavy as black.",
    how_to: "Smudge a soft brown pencil along the upper lash line, then blend with a small brush.",
  },
  {
    title: "One coat of mascara",
    rationale: "A single coat opens up the eyes without adding heaviness.",
    how_to: "Curl lashes first, then apply one coat of a lengthening mascara.",
  },
] as const;

function buildCategory(
  pool: readonly { title: string; rationale: string; how_to: string }[],
  rng: () => number,
  scoreMin: number,
  scoreMax: number,
): CategoryResult {
  const score = scoreRange(scoreMin, scoreMax, rng);
  const potential = Math.min(100, score + scoreRange(6, 18, rng));
  return {
    score,
    potential_score: potential,
    recommendations: pickN(pool, 2 + Math.floor(rng() * 2), rng),
  };
}

export const mockProvider: AnalysisProvider = {
  name: "mock",
  async analyze(base64Jpeg, makeupOn) {
    const start = Date.now();
    // Small artificial delay so loading states can still be exercised/tested realistically.
    await new Promise((resolve) => setTimeout(resolve, 200 + Math.random() * 300));

    const rng = makeRng(base64Jpeg.slice(0, 500) + base64Jpeg.slice(-500) + base64Jpeg.length);

    const hair = buildCategory(HAIR_RECS, rng, 55, 90);
    const brows = buildCategory(BROW_RECS, rng, 55, 90);
    const skin = buildCategory(SKIN_RECS, rng, 55, 90);
    const makeup = makeupOn ? buildCategory(MAKEUP_RECS, rng, 60, 92) : null;

    const scored = [hair, brows, skin, ...(makeup ? [makeup] : [])];
    const overall_score = Math.round(scored.reduce((sum, c) => sum + c.score, 0) / scored.length);
    const overall_potential_score = Math.round(
      scored.reduce((sum, c) => sum + c.potential_score, 0) / scored.length,
    );

    const result: AnalysisResult = {
      detected_skin_tone: {
        mst_scale: 1 + Math.floor(rng() * 10),
        label: pick(MST_LABELS, rng),
      },
      overall_score,
      overall_potential_score,
      categories: { hair, brows, skin, makeup },
    };

    return {
      provider: "mock",
      model: "mock-v1",
      latencyMs: Date.now() - start,
      result,
    };
  },
};
