// The analyze-scan pipeline, per PROJECT_CONTEXT.md §19 Phase 1:
//   content-safety check -> LLM call -> structured-output validation ->
//   guardrail blocklist backstop -> score rescale
// Deliberately standalone and DB/HTTP-free so it's directly testable on its own, before any UI
// exists around it (per the same Phase 1 note). supabase/functions/analyze-scan/index.ts wraps
// this with the actual HTTP handler and persistence.

import { getAnalysisProvider } from "./providers/index.ts";
import type { AnalysisProvider, ProviderAnalysisResult } from "./providers/types.ts";
import { checkContentSafety, type ContentSafetyChecker } from "./content-safety.ts";
import { validateAnalysisResult } from "./validate.ts";
import { scanForBlockedTerms } from "./blocklist.ts";
import { rescaleScore } from "./rescale.ts";
import type { AnalysisResult, CategoryResult } from "./schema.ts";

export class ContentSafetyRejectedError extends Error {
  constructor(public readonly flaggedCategories: string[]) {
    super(`Photo failed content-safety check: ${flaggedCategories.join(", ") || "flagged"}`);
    this.name = "ContentSafetyRejectedError";
  }
}

export class AnalysisFailedError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AnalysisFailedError";
  }
}

export interface RescaledCategoryResult {
  score: number;
  potentialScore: number;
  recommendations: CategoryResult["recommendations"];
}

export interface PipelineResult {
  provider: string;
  model: string;
  detectedSkinTone: { mstScale: number; label: string };
  overallScore: number;
  overallPotentialScore: number;
  categories: Record<"hair" | "brows" | "skin" | "makeup", RescaledCategoryResult | null>;
}

export interface PipelineDeps {
  provider: AnalysisProvider;
  checkContentSafety: ContentSafetyChecker;
}

function defaultDeps(): PipelineDeps {
  return { provider: getAnalysisProvider(), checkContentSafety };
}

async function callAndGuard(provider: AnalysisProvider, base64Jpeg: string, makeupOn: boolean): Promise<ProviderAnalysisResult> {
  const call = await provider.analyze(base64Jpeg, makeupOn);

  if (!validateAnalysisResult(call.result)) {
    throw new Error("Provider response failed schema validation.");
  }

  const hits = scanForBlockedTerms(call.result);
  if (hits.length > 0) {
    throw new Error(`Blocklist hit: ${hits.map((h) => h.term).join(", ")}`);
  }

  return call;
}

function toRescaled(cat: CategoryResult | null): RescaledCategoryResult | null {
  if (cat === null) return null;
  return {
    score: rescaleScore(cat.score),
    potentialScore: rescaleScore(cat.potential_score),
    recommendations: cat.recommendations,
  };
}

export async function runAnalysisPipeline(
  base64Jpeg: string,
  makeupOn: boolean,
  deps: PipelineDeps = defaultDeps()
): Promise<PipelineResult> {
  const safety = await deps.checkContentSafety(base64Jpeg);
  if (!safety.safe) {
    throw new ContentSafetyRejectedError(safety.flaggedCategories);
  }

  // §17 item 7: one automatic retry on malformed output or API failure, then fail gracefully —
  // no partial/garbled results are ever shown. A blocklist hit (item 6) is treated the same way:
  // reject and regenerate once before giving up.
  let call: ProviderAnalysisResult;
  try {
    call = await callAndGuard(deps.provider, base64Jpeg, makeupOn);
  } catch (firstError) {
    try {
      call = await callAndGuard(deps.provider, base64Jpeg, makeupOn);
    } catch (secondError) {
      throw new AnalysisFailedError(`Analysis failed after retry: ${(secondError as Error).message}`);
    }
  }

  const result: AnalysisResult = call.result;

  return {
    provider: call.provider,
    model: call.model,
    detectedSkinTone: { mstScale: result.detected_skin_tone.mst_scale, label: result.detected_skin_tone.label },
    overallScore: rescaleScore(result.overall_score),
    overallPotentialScore: rescaleScore(result.overall_potential_score),
    categories: {
      hair: toRescaled(result.categories.hair),
      brows: toRescaled(result.categories.brows),
      skin: toRescaled(result.categories.skin),
      makeup: toRescaled(result.categories.makeup),
    },
  };
}
