import type { AnalysisProvider } from "./provider";
import type {
  AnalysisInput,
  AnalysisResult,
  AnalyzeOptions,
  AnalysisStage,
  CategoryAnalysis,
  BeautyGoal,
  StylePreference,
} from "./types";

/**
 * Demo-mode provider. Produces realistic, varied, encouraging analysis
 * output WITHOUT calling any external API or looking at the photo pixels —
 * it flavors a bank of supportive copy using the user's stated goals and
 * style preferences so the result still feels personalized.
 *
 * This lets the whole app be demoed with zero API keys and zero spend.
 */
export class MockAnalysisProvider implements AnalysisProvider {
  readonly id = "mock" as const;

  async analyze(input: AnalysisInput, options?: AnalyzeOptions): Promise<AnalysisResult> {
    const stages: AnalysisStage[] = [
      "analyzing_features",
      "finding_colors",
      "identifying_strengths",
      "building_plan",
    ];

    for (const stage of stages) {
      if (options?.signal?.aborted) throw new DOMException("Aborted", "AbortError");
      options?.onStage?.(stage);
      await delay(650 + Math.random() * 350);
    }

    return buildMockResult(input);
  }
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickN<T>(arr: T[], n: number, rng: () => number): T[] {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length > 0) {
    const i = Math.floor(rng() * copy.length);
    out.push(copy.splice(i, 1)[0]);
  }
  return out;
}

function scoreInRange(min: number, max: number, rng: () => number): number {
  return Math.round(min + rng() * (max - min));
}

/** Small deterministic-per-photo RNG so the same upload doesn't feel wildly random on retries, without needing real image analysis. */
function makeRng(seedSource: string): () => number {
  let seed = 0;
  for (let i = 0; i < seedSource.length; i += 37) {
    seed = (seed * 31 + seedSource.charCodeAt(i)) >>> 0;
  }
  return () => {
    seed = (seed * 1103515245 + 12345) >>> 0;
    return (seed >>> 8) / 0xffffff;
  };
}

const HAS_GOAL = (goals: BeautyGoal[], g: BeautyGoal) => goals.includes(g);
const HAS_STYLE = (styles: StylePreference[], s: StylePreference) => styles.includes(s);

function buildMockResult(input: AnalysisInput): AnalysisResult {
  const rng = makeRng(input.photoDataUrl.slice(-2000) + input.profile.stylePreferences.join(","));
  const { goals, stylePreferences } = input.profile;

  const skin = buildSkin(rng, goals);
  const hair = buildHair(rng, goals);
  const face = buildFace(rng);
  const eyes = buildEyes(rng);
  const brows = buildBrows(rng);
  const lips = buildLips(rng);

  const categories = { skin, hair, face, eyes, brows, lips };
  const overallScore = Math.round(
    Object.values(categories).reduce((sum, c) => sum + c.score, 0) / Object.values(categories).length,
  );

  const lowestFirst = (Object.entries(categories) as [keyof typeof categories, CategoryAnalysis][]).sort(
    (a, b) => a[1].score - b[1].score,
  );

  const topOpportunities = lowestFirst.slice(0, 3).map(([key]) => capitalize(labelFor(key)));

  const style = buildStyle(rng, stylePreferences);
  const colors = buildColors(rng);
  const makeup = buildMakeup(rng, stylePreferences, goals);

  const priorityPlan = lowestFirst.slice(0, 3).map(([key, cat], i) => ({
    area: capitalize(labelFor(key)),
    change: cat.recommendations[0] ?? "Small daily refinement",
    why: reasonFor(key),
    difficulty: (["easy", "moderate", "involved"] as const)[Math.min(i, 2)],
    expectedImpact: (["high", "high", "medium"] as const)[Math.min(i, 2)],
  }));

  return {
    id: `scan_${Date.now()}_${Math.floor(rng() * 1e6)}`,
    createdAt: new Date().toISOString(),
    overallScore,
    summary: buildSummary(rng, goals),
    topOpportunities,
    categories,
    makeup,
    colors,
    style,
    priorityPlan,
    providerId: "mock",
  };
}

function labelFor(key: string) {
  return key;
}

function reasonFor(key: string): string {
  const map: Record<string, string> = {
    skin: "A brighter, more even canvas makes every other feature read more polished.",
    hair: "Hair frames the whole face — small styling changes shift the entire first impression.",
    face: "Framing and shaping choices here affect how balanced your features look at a glance.",
    eyes: "Eyes are the first thing people focus on — small definition tweaks go a long way.",
    brows: "Brows anchor your expression, so shape changes have an outsized visual effect.",
    lips: "Lip color and shape are an easy, low-effort way to add polish.",
  };
  return map[key] ?? "This is one of your highest-leverage, lowest-effort changes.";
}

function buildSummary(rng: () => number, goals: BeautyGoal[]): string {
  const openers = [
    "You've already got a lot working in your favor — this plan is about polish, not overhaul.",
    "Your features have real strengths to build around — here's how to make them pop.",
    "There's a clear, achievable path to leveling up your look from here.",
    "A few focused changes will make a bigger difference than a total makeover would.",
  ];
  const goalNote = HAS_GOAL(goals, "overall_appearance")
    ? " We kept this broad since you're focused on your overall appearance."
    : "";
  return pick(openers, rng) + goalNote;
}

function buildSkin(rng: () => number, goals: BeautyGoal[]): CategoryAnalysis {
  const score = scoreInRange(62, 88, rng);
  const observations = pick(
    [
      "Your skin appears to have a healthy, even tone with a natural glow in good lighting.",
      "Your skin appears mostly clear with a slightly uneven texture in a few areas.",
      "Your skin appears to have good natural radiance, with some visible dryness around the cheeks.",
      "Your skin appears smooth overall, with a bit of shine concentrated in the T-zone.",
    ],
    rng,
  );
  const pool = [
    "A gentle daily SPF will protect your glow and prevent uneven tone over time.",
    "A lightweight, hydrating moisturizer could even out texture without feeling heavy.",
    "Try a gentle exfoliating step 1-2x a week to keep your natural brightness coming through.",
    "A vitamin C serum in the morning can help brighten and even out your tone gradually.",
    "Blotting sheets or a mattifying primer can help balance shine through the day.",
    "A hydrating mist can refresh your glow midday without disturbing makeup.",
  ];
  return {
    score,
    observations,
    recommendations: pickN(pool, HAS_GOAL(goals, "better_skin") ? 3 : 2, rng),
  };
}

function buildHair(rng: () => number, goals: BeautyGoal[]): CategoryAnalysis {
  const score = scoreInRange(60, 90, rng);
  const observations = pick(
    [
      "Your hair has nice natural texture that could be styled to add more shape around your face.",
      "Your hair length currently covers a lot of your face shape — a trim could open things up.",
      "Your hair has healthy shine, and a face-framing layer could add movement.",
      "Your part and volume pattern is a little flat on top — some styling could add lift.",
    ],
    rng,
  );
  const pool = [
    "Face-framing layers around the cheekbones would soften and highlight your features.",
    "A slightly shorter length could bring more attention to your eyes and jawline.",
    "Adding volume at the crown creates a more balanced silhouette with your face shape.",
    "A deep side part tends to complement your proportions better than a center part.",
    "Soft waves (heat or no-heat) would add movement without much daily effort.",
    "A glossing treatment every few weeks would boost shine with minimal upkeep.",
  ];
  return {
    score,
    observations,
    recommendations: pickN(pool, HAS_GOAL(goals, "better_hair") ? 3 : 2, rng),
  };
}

function buildFace(rng: () => number): CategoryAnalysis {
  const score = scoreInRange(65, 90, rng);
  return {
    score,
    observations: pick(
      [
        "Your face shape has balanced proportions with soft, approachable angles.",
        "You have well-defined cheekbones that catch the light nicely.",
        "Your jawline is your strongest structural feature — styling can draw more attention to it.",
        "Your face has a soft, rounded quality that reads as warm and approachable.",
      ],
      rng,
    ),
    recommendations: pickN(
      [
        "Contour placement along the cheekbones would enhance your natural structure.",
        "A hairstyle that keeps your jawline visible plays to your strengths.",
        "Soft, upward blush placement can lift your whole face shape.",
        "Angled brows can add definition that balances softer face features.",
      ],
      2,
      rng,
    ),
  };
}

function buildEyes(rng: () => number): CategoryAnalysis {
  const score = scoreInRange(66, 92, rng);
  return {
    score,
    observations: pick(
      [
        "Your eyes have a lovely natural shape that responds well to subtle definition.",
        "Your eye spacing and shape suit a soft, smoky liner technique.",
        "Your eyes have great symmetry — makeup can enhance without needing to correct much.",
        "Your eyes have a warm, expressive quality that brightens with the right liner shape.",
      ],
      rng,
    ),
    recommendations: pickN(
      [
        "A thin tightline along the upper lash line adds definition without looking heavy.",
        "Curling lashes before mascara opens up your eyes significantly.",
        "A soft brown eyeliner (instead of black) would look more natural on you.",
        "Light shimmer on the inner corner can brighten your whole eye area.",
      ],
      2,
      rng,
    ),
  };
}

function buildBrows(rng: () => number): CategoryAnalysis {
  const score = scoreInRange(58, 88, rng);
  return {
    score,
    observations: pick(
      [
        "Your brows have good natural density with room for a more defined shape.",
        "Your brow shape is a little inconsistent between the two sides — grooming would balance it.",
        "Your brows are naturally full, which is a great base to work with.",
        "Your brow arch is currently soft — a bit more definition would frame your eyes nicely.",
      ],
      rng,
    ),
    recommendations: pickN(
      [
        "A soft, natural arch would balance your face shape well.",
        "Filling in sparse areas with a brow pencil close to your natural color adds polish.",
        "A clear brow gel keeps hairs in place without looking overdone.",
        "Light shaping (tweezing stray hairs) can clean up the line without changing the shape.",
      ],
      2,
      rng,
    ),
  };
}

function buildLips(rng: () => number): CategoryAnalysis {
  const score = scoreInRange(64, 90, rng);
  return {
    score,
    observations: pick(
      [
        "Your lip shape is naturally balanced and suits both bold and neutral colors.",
        "Your lips have a soft, rounded shape that looks great with a slight overline.",
        "Your natural lip color is a great base for a your-lips-but-better tint.",
        "Your lips have nice definition that a light gloss would enhance.",
      ],
      rng,
    ),
    recommendations: pickN(
      [
        "A tinted balm in a your-lips-but-better shade keeps things natural and polished.",
        "A lip liner just at the edge can add subtle definition without looking overdone.",
        "A warm rose or berry tone would complement your coloring nicely.",
        "A dab of gloss at the center of both lips adds dimension fast.",
      ],
      2,
      rng,
    ),
  };
}

function buildMakeup(rng: () => number, styles: StylePreference[], goals: BeautyGoal[]) {
  const recommendedStyle = HAS_STYLE(styles, "glam")
    ? "Soft glam"
    : HAS_STYLE(styles, "natural") || HAS_STYLE(styles, "minimal")
      ? "Your-skin-but-better natural"
      : HAS_STYLE(styles, "clean_girl")
        ? "Clean girl dewy"
        : "Soft everyday polish";

  return {
    applicabilityScore: scoreInRange(70, 92, rng),
    recommendedStyle,
    recommendations: pickN(
      [
        "A dewy, lightweight base beats full-coverage foundation for your skin's natural texture.",
        "Cream blush placed high on the cheeks gives a fresh, lifted look.",
        "A soft brown eyeliner smudged along the lash line adds depth without heaviness.",
        "One coat of a lengthening mascara keeps the eye area looking bright, not heavy.",
        "A warm-toned bronzer along the cheekbones and jaw adds natural-looking dimension.",
        "Setting spray over a light powder keeps everything looking fresh, not cakey.",
      ],
      HAS_GOAL(goals, "better_makeup") ? 4 : 3,
      rng,
    ),
  };
}

const PALETTES = [
  {
    paletteName: "Warm Autumn",
    palette: ["#B5651D", "#C98A4B", "#8A5A44", "#D9A441", "#6E4B3A"],
    prioritize: ["Terracotta", "Warm olive", "Camel", "Mustard gold"],
    minimize: ["Icy pastels", "Cool bright blue", "Stark black-and-white"],
  },
  {
    paletteName: "Soft Summer",
    palette: ["#A9BCD0", "#C6A9C9", "#8FA8A3", "#D9C6D0", "#6E7F8C"],
    prioritize: ["Dusty rose", "Soft lavender", "Sage", "Muted denim"],
    minimize: ["Neon shades", "Orange-based warm tones", "Harsh black"],
  },
  {
    paletteName: "Bright Spring",
    palette: ["#E8598B", "#F2B705", "#3AAED8", "#6FCF97", "#F2784B"],
    prioritize: ["Coral", "Clear turquoise", "Warm yellow", "Bright grass green"],
    minimize: ["Muted taupe tones", "Dusty mauve", "Heavy black"],
  },
  {
    paletteName: "Cool Winter",
    palette: ["#1F3A5F", "#8C1C4D", "#3D3D3D", "#C0C0C0", "#6B2D5C"],
    prioritize: ["True red", "Emerald", "Icy blue", "Crisp white"],
    minimize: ["Muted earth tones", "Warm orange", "Dusty peach"],
  },
];

function buildColors(rng: () => number) {
  return pick(PALETTES, rng);
}

function buildStyle(rng: () => number, styles: StylePreference[]) {
  const label = (s: StylePreference) =>
    ({
      natural: "Natural",
      clean_girl: "Clean Girl",
      glam: "Glam",
      soft: "Soft",
      feminine: "Feminine",
      minimal: "Minimal",
      trendy: "Trendy",
    })[s];

  const chosen = styles.length > 0 ? styles.map(label).join(" + ") : "Soft Everyday";

  return {
    recommendedAesthetic: chosen,
    suggestions: pickN(
      [
        "Structured pieces in your palette's neutrals create an easy, put-together base.",
        "Gold-toned accessories will complement your warmer undertones.",
        "Silver-toned jewelry will complement your cooler undertones.",
        "Soft, flowy fabrics lean into a feminine, approachable aesthetic.",
        "Tailored, clean lines lean into a more polished, minimal aesthetic.",
        "One statement accessory (bag, earrings, or shoes) keeps trend pieces feeling curated.",
      ],
      3,
      rng,
    ),
  };
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
