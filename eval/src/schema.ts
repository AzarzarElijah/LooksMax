// Structured-output schema for the analyze-scan pipeline, per PROJECT_CONTEXT.md §17 item 4.
// Shared between the Claude tool-use call and the OpenAI structured-output call so both
// providers are held to the exact same contract.

export const CATEGORY_NAMES = ["hair", "brows", "skin", "makeup"] as const;
export type CategoryName = (typeof CATEGORY_NAMES)[number];

const recommendationSchema = {
  type: "object",
  properties: {
    title: { type: "string", description: "Short recommendation title, e.g. 'Soft layered fringe'" },
    rationale: { type: "string", description: "Why this suits her specifically (face shape / skin tone / features)" },
    how_to: { type: "string", description: "Actionable how-to: what to ask a stylist for, how to apply, what product type" },
  },
  required: ["title", "rationale", "how_to"],
  additionalProperties: false,
} as const;

function categorySchema() {
  return {
    type: "object",
    properties: {
      score: { type: "integer", minimum: 0, maximum: 100, description: "Raw 0-100 score before safety-floor rescale" },
      potential_score: { type: "integer", minimum: 0, maximum: 100, description: "Raw 0-100 ceiling if recommendations are followed" },
      recommendations: {
        type: "array",
        items: recommendationSchema,
        minItems: 1,
        maxItems: 6,
      },
    },
    required: ["score", "potential_score", "recommendations"],
    additionalProperties: false,
  } as const;
}

export const analysisJsonSchema = {
  type: "object",
  properties: {
    detected_skin_tone: {
      type: "object",
      properties: {
        mst_scale: {
          type: "integer",
          minimum: 1,
          maximum: 10,
          description: "Monk Skin Tone Scale value, 1 (lightest) to 10 (deepest)",
        },
        label: { type: "string", description: "Short human-readable description, e.g. 'warm medium-deep'" },
      },
      required: ["mst_scale", "label"],
      additionalProperties: false,
    },
    overall_score: { type: "integer", minimum: 0, maximum: 100, description: "Raw 0-100, before safety-floor rescale" },
    overall_potential_score: { type: "integer", minimum: 0, maximum: 100 },
    categories: {
      type: "object",
      properties: {
        hair: categorySchema(),
        brows: categorySchema(),
        skin: categorySchema(),
        makeup: {
          type: ["object", "null"],
          properties: categorySchema().properties,
          required: categorySchema().required,
          additionalProperties: false,
          description: "Null when makeup_on is false for this scan",
        },
      },
      required: ["hair", "brows", "skin", "makeup"],
      additionalProperties: false,
    },
  },
  required: ["detected_skin_tone", "overall_score", "overall_potential_score", "categories"],
  additionalProperties: false,
} as const;

export interface AnalysisResult {
  detected_skin_tone: { mst_scale: number; label: string };
  overall_score: number;
  overall_potential_score: number;
  categories: {
    hair: { score: number; potential_score: number; recommendations: { title: string; rationale: string; how_to: string }[] };
    brows: { score: number; potential_score: number; recommendations: { title: string; rationale: string; how_to: string }[] };
    skin: { score: number; potential_score: number; recommendations: { title: string; rationale: string; how_to: string }[] };
    makeup: { score: number; potential_score: number; recommendations: { title: string; rationale: string; how_to: string }[] } | null;
  };
}

export function buildPrompt(makeupOn: boolean): string {
  return `You are the analysis engine for a women's beauty & style coaching app (13+ users, US/EU/UK). \
Analyze the attached selfie across exactly these categories: hair, brows, skin, makeup. \
The user has indicated makeup is ${makeupOn ? "ON" : "NOT on (bare-faced)"} right now.

Hard rules, follow exactly:
1. Tone is always positive-framed coaching ("this would suit you"), never a judgment of flaws. Never say a person looks bad.
2. Skin category is cosmetic-level only: type, texture, tone, radiance/dullness. NEVER name, diagnose, or hint at a medical/dermatological condition (acne, rosacea, eczema, psoriasis, dermatitis, infection, etc.) and never suggest seeing a doctor or dermatologist. Stay completely silent on anything that looks medical.
3. If makeup is NOT on, the "makeup" field in your output must be null (skip that category entirely) — do not analyze or guess at makeup technique.
4. Detect skin tone on the Monk Skin Tone (MST) Scale, 1 (lightest) to 10 (deepest). Any hair-color recommendation must be chosen to suit BOTH face shape and this detected skin tone — never suggest a hair color based on face shape alone.
5. This app is for women/girls only — do not include any male-oriented framing or product references.
6. Give each category (and overall) a raw 0-100 score and a raw 0-100 "potential score" ceiling reflecting the upside if recommendations are followed. Do not apply any floor yourself — return your honest raw assessment; score floor/rescaling is handled by the app afterward.
7. Every recommendation needs a short rationale tied to her specific features/skin tone, and a concrete how-to (what to ask a stylist for, how to apply, what product type).

Return your analysis using the return_analysis tool/function with the exact schema provided. Do not include any other commentary.`;
}
