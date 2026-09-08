import type { AnalysisProvider } from "./provider";
import type {
  AnalysisInput,
  AnalysisResult,
  AnalyzeOptions,
  AnalysisStage,
} from "./types";
import { AnalysisError } from "./types";

const DEFAULT_MODEL = "gpt-4o-mini";
const CHAT_COMPLETIONS_URL = "https://api.openai.com/v1/chat/completions";

/**
 * Real analysis backend. Sends the selfie + onboarding profile to OpenAI's
 * vision-capable chat completions endpoint and asks for a strict JSON
 * response matching our `AnalysisResult` shape.
 *
 * PROTOTYPE NOTE: this calls the OpenAI API directly from the browser using
 * a key from `VITE_OPENAI_API_KEY`, which is fine for local demo use but
 * exposes the key to anyone who opens devtools. The production app (see
 * supabase/functions/analyze-scan) instead proxies this through a backend
 * Edge Function with a server-side key — do the same before shipping this
 * for real. See mvp/README.md "Known limitations".
 */
export class OpenAIAnalysisProvider implements AnalysisProvider {
  readonly id = "openai" as const;
  private readonly apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyze(input: AnalysisInput, options?: AnalyzeOptions): Promise<AnalysisResult> {
    const emit = (stage: AnalysisStage) => options?.onStage?.(stage);

    emit("analyzing_features");
    const stageTimer = simulateRemainingStages(emit, options?.signal);

    try {
      const model = (import.meta.env.VITE_OPENAI_MODEL as string | undefined) || DEFAULT_MODEL;

      const response = await fetch(CHAT_COMPLETIONS_URL, {
        method: "POST",
        signal: options?.signal,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            {
              role: "user",
              content: [
                { type: "text", text: buildUserPrompt(input) },
                { type: "image_url", image_url: { url: input.photoDataUrl } },
              ],
            },
          ],
          response_format: {
            type: "json_schema",
            json_schema: { name: "beauty_analysis", strict: true, schema: RESPONSE_SCHEMA },
          },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        if (response.status === 401) {
          throw new AnalysisError("Your OpenAI API key looks invalid. Check mvp/.env and try again.");
        }
        if (response.status === 429) {
          throw new AnalysisError("OpenAI rate limit or quota reached. Try again in a moment.");
        }
        throw new AnalysisError(`Analysis failed (${response.status}). Please try again.`, body);
      }

      const json = await response.json();
      const content = json?.choices?.[0]?.message?.content;
      if (!content || typeof content !== "string") {
        throw new AnalysisError("The AI returned an empty result. Please try again.");
      }

      let parsed: unknown;
      try {
        parsed = JSON.parse(content);
      } catch (e) {
        throw new AnalysisError("The AI returned a response we couldn't read. Please try again.", e);
      }

      return finalizeResult(parsed);
    } catch (err) {
      if (err instanceof AnalysisError) throw err;
      if (err instanceof DOMException && err.name === "AbortError") throw err;
      throw new AnalysisError(
        "Couldn't reach the analysis service — check your connection and try again.",
        err,
      );
    } finally {
      stageTimer.cancel();
    }
  }
}

/** Advances the loading-stage UI while the single API call is in flight, so the experience matches the mock provider's staged feel. */
function simulateRemainingStages(emit: (s: AnalysisStage) => void, signal?: AbortSignal) {
  const remaining: AnalysisStage[] = ["finding_colors", "identifying_strengths", "building_plan"];
  const timers = remaining.map((stage, i) =>
    setTimeout(() => {
      if (!signal?.aborted) emit(stage);
    }, (i + 1) * 1400),
  );
  return { cancel: () => timers.forEach(clearTimeout) };
}

const SYSTEM_PROMPT = `You are a warm, supportive AI beauty consultant inside a beauty coaching app.
You analyze a selfie and return structured, encouraging feedback — never clinical or scientific-sounding claims.

Rules you must always follow:
- Never use insulting, degrading, or harsh language (e.g. "ugly", "unattractive", "bad-looking"). Frame everything as "here's how to make your features work even better."
- Never diagnose or name medical/dermatological conditions (acne, rosacea, eczema, etc). Describe skin only in observational terms like "your skin appears...".
- Do not claim scores are objective or scientific measurements — they are a supportive, subjective assessment.
- Do not attempt to determine or state the person's identity, age (beyond using the age group given), race, or any biometric identity signal. Do not perform facial recognition.
- Keep recommendations practical, specific, and achievable (styling, color, makeup, skincare habits) — never medical or cosmetic-surgery advice.
- Respond ONLY with the JSON object matching the provided schema.`;

function buildUserPrompt(input: AnalysisInput): string {
  const { profile } = input;
  return [
    `Age group: ${profile.ageGroup}`,
    `Beauty goals: ${profile.goals.join(", ") || "general improvement"}`,
    `Style preferences: ${profile.stylePreferences.join(", ") || "no strong preference"}`,
    "",
    "Analyze the attached selfie and return the full structured beauty analysis JSON described in your instructions. Tailor recommendations to the stated goals and style preferences.",
  ].join("\n");
}

function finalizeResult(parsed: unknown): AnalysisResult {
  if (!parsed || typeof parsed !== "object") {
    throw new AnalysisError("The AI returned an unexpected response shape.");
  }
  return {
    ...(parsed as Omit<AnalysisResult, "id" | "createdAt" | "providerId">),
    id: `scan_${Date.now()}`,
    createdAt: new Date().toISOString(),
    providerId: "openai",
  };
}

const categorySchema = (extra: Record<string, unknown> = {}) => ({
  type: "object",
  additionalProperties: false,
  properties: {
    score: { type: "integer", minimum: 40, maximum: 100 },
    observations: { type: "string" },
    recommendations: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4 },
    ...extra,
  },
  required: ["score", "observations", "recommendations", ...Object.keys(extra)],
});

const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  properties: {
    overallScore: { type: "integer", minimum: 40, maximum: 100 },
    summary: { type: "string" },
    topOpportunities: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
    categories: {
      type: "object",
      additionalProperties: false,
      properties: {
        skin: categorySchema(),
        hair: categorySchema(),
        face: categorySchema(),
        eyes: categorySchema(),
        brows: categorySchema(),
        lips: categorySchema(),
      },
      required: ["skin", "hair", "face", "eyes", "brows", "lips"],
    },
    makeup: {
      type: "object",
      additionalProperties: false,
      properties: {
        applicabilityScore: { type: "integer", minimum: 40, maximum: 100 },
        recommendedStyle: { type: "string" },
        recommendations: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 5 },
      },
      required: ["applicabilityScore", "recommendedStyle", "recommendations"],
    },
    colors: {
      type: "object",
      additionalProperties: false,
      properties: {
        paletteName: { type: "string" },
        palette: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 6 },
        prioritize: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
        minimize: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
      required: ["paletteName", "palette", "prioritize", "minimize"],
    },
    style: {
      type: "object",
      additionalProperties: false,
      properties: {
        recommendedAesthetic: { type: "string" },
        suggestions: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 5 },
      },
      required: ["recommendedAesthetic", "suggestions"],
    },
    priorityPlan: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          area: { type: "string" },
          change: { type: "string" },
          why: { type: "string" },
          difficulty: { type: "string", enum: ["easy", "moderate", "involved"] },
          expectedImpact: { type: "string", enum: ["low", "medium", "high"] },
        },
        required: ["area", "change", "why", "difficulty", "expectedImpact"],
      },
    },
  },
  required: ["overallScore", "summary", "topOpportunities", "categories", "makeup", "colors", "style", "priorityPlan"],
};
