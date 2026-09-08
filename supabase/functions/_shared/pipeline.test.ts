import { assertEquals, assertRejects } from "jsr:@std/assert@1";
import { runAnalysisPipeline, ContentSafetyRejectedError, AnalysisFailedError } from "./pipeline.ts";
import type { AnalysisProvider, ProviderAnalysisResult } from "./providers/types.ts";
import type { ContentSafetyChecker } from "./content-safety.ts";
import type { AnalysisResult } from "./schema.ts";

const SAFE_CHECK: ContentSafetyChecker = () => Promise.resolve({ safe: true, flaggedCategories: [] });
const UNSAFE_CHECK: ContentSafetyChecker = () => Promise.resolve({ safe: false, flaggedCategories: ["sexual"] });

function cleanResult(): AnalysisResult {
  return {
    detected_skin_tone: { mst_scale: 4, label: "warm light-medium" },
    overall_score: 60,
    overall_potential_score: 85,
    categories: {
      hair: { score: 60, potential_score: 85, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      brows: { score: 60, potential_score: 85, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      skin: { score: 60, potential_score: 85, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      makeup: null,
    },
  };
}

function providerReturning(result: AnalysisResult): AnalysisProvider {
  return {
    name: "claude",
    analyze: (): Promise<ProviderAnalysisResult> =>
      Promise.resolve({ provider: "claude", model: "test-model", latencyMs: 1, result }),
  };
}

Deno.test("runAnalysisPipeline rejects before calling the provider when content-safety fails", async () => {
  let providerCalled = false;
  const provider: AnalysisProvider = {
    name: "claude",
    analyze: () => {
      providerCalled = true;
      return Promise.resolve({ provider: "claude", model: "m", latencyMs: 1, result: cleanResult() });
    },
  };

  await assertRejects(
    () => runAnalysisPipeline("base64", false, { provider, checkContentSafety: UNSAFE_CHECK }),
    ContentSafetyRejectedError
  );
  assertEquals(providerCalled, false);
});

Deno.test("runAnalysisPipeline rescales scores on a clean result", async () => {
  const provider = providerReturning(cleanResult());
  const result = await runAnalysisPipeline("base64", false, { provider, checkContentSafety: SAFE_CHECK });
  assertEquals(result.overallScore >= 70, true);
  assertEquals(result.categories.makeup, null);
  assertEquals(result.categories.hair?.recommendations.length, 1);
});

Deno.test("runAnalysisPipeline retries once on a blocklist hit, then succeeds", async () => {
  let calls = 0;
  const provider: AnalysisProvider = {
    name: "claude",
    analyze: () => {
      calls++;
      const result = cleanResult();
      if (calls === 1) {
        result.categories.skin.recommendations[0].rationale = "possible rosacea flare-up";
      }
      return Promise.resolve({ provider: "claude", model: "m", latencyMs: 1, result });
    },
  };

  const result = await runAnalysisPipeline("base64", false, { provider, checkContentSafety: SAFE_CHECK });
  assertEquals(calls, 2);
  assertEquals(result.overallScore >= 70, true);
});

Deno.test("runAnalysisPipeline fails gracefully after two consecutive blocklist hits", async () => {
  const provider: AnalysisProvider = {
    name: "claude",
    analyze: () => {
      const result = cleanResult();
      result.categories.skin.recommendations[0].rationale = "signs of acne";
      return Promise.resolve({ provider: "claude", model: "m", latencyMs: 1, result });
    },
  };

  await assertRejects(
    () => runAnalysisPipeline("base64", false, { provider, checkContentSafety: SAFE_CHECK }),
    AnalysisFailedError
  );
});
