// Defensive re-check of a provider's structured output, per PROJECT_CONTEXT.md §17 item 4.
// Both providers already enforce this shape via schema/tool-use (see schema.ts) — this is a
// backstop against a provider silently deviating from its contract, not the primary guarantee.

import { CATEGORY_NAMES, type AnalysisResult, type CategoryResult } from "./schema.ts";

function isRecommendation(value: unknown): value is CategoryResult["recommendations"][number] {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return typeof v.title === "string" && typeof v.rationale === "string" && typeof v.how_to === "string";
}

function isIntInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}

function isCategoryResult(value: unknown): value is CategoryResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;
  return (
    isIntInRange(v.score, 0, 100) &&
    isIntInRange(v.potential_score, 0, 100) &&
    Array.isArray(v.recommendations) &&
    v.recommendations.length >= 1 &&
    v.recommendations.every(isRecommendation)
  );
}

export function validateAnalysisResult(value: unknown): value is AnalysisResult {
  if (typeof value !== "object" || value === null) return false;
  const v = value as Record<string, unknown>;

  const skinTone = v.detected_skin_tone as Record<string, unknown> | undefined;
  if (typeof skinTone !== "object" || skinTone === null) return false;
  if (!isIntInRange(skinTone.mst_scale, 1, 10)) return false;
  if (typeof skinTone.label !== "string") return false;

  if (!isIntInRange(v.overall_score, 0, 100)) return false;
  if (!isIntInRange(v.overall_potential_score, 0, 100)) return false;

  const categories = v.categories as Record<string, unknown> | undefined;
  if (typeof categories !== "object" || categories === null) return false;

  for (const name of CATEGORY_NAMES) {
    const cat = categories[name];
    if (name === "makeup" && cat === null) continue;
    if (!isCategoryResult(cat)) return false;
  }

  return true;
}
