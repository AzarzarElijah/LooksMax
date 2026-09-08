import { assertEquals } from "jsr:@std/assert@1";
import { validateAnalysisResult } from "./validate.ts";

function validResult(makeup: unknown = { score: 80, potential_score: 90, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] }) {
  return {
    detected_skin_tone: { mst_scale: 5, label: "warm medium" },
    overall_score: 80,
    overall_potential_score: 90,
    categories: {
      hair: { score: 80, potential_score: 90, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      brows: { score: 80, potential_score: 90, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      skin: { score: 80, potential_score: 90, recommendations: [{ title: "t", rationale: "r", how_to: "h" }] },
      makeup,
    },
  };
}

Deno.test("validateAnalysisResult accepts a fully populated valid result", () => {
  assertEquals(validateAnalysisResult(validResult()), true);
});

Deno.test("validateAnalysisResult accepts a null makeup category (bare-faced scan)", () => {
  assertEquals(validateAnalysisResult(validResult(null)), true);
});

Deno.test("validateAnalysisResult rejects a missing required field", () => {
  const result = validResult() as Record<string, unknown>;
  delete result.overall_score;
  assertEquals(validateAnalysisResult(result), false);
});

Deno.test("validateAnalysisResult rejects an out-of-range score", () => {
  const result = validResult();
  result.overall_score = 150;
  assertEquals(validateAnalysisResult(result), false);
});

Deno.test("validateAnalysisResult rejects a category with zero recommendations", () => {
  const result = validResult();
  result.categories.hair.recommendations = [];
  assertEquals(validateAnalysisResult(result), false);
});

Deno.test("validateAnalysisResult rejects a non-object input", () => {
  assertEquals(validateAnalysisResult("not an object"), false);
  assertEquals(validateAnalysisResult(null), false);
});
