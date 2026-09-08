import { claudeProvider } from "./claude.ts";
import { gpt4vProvider } from "./openai.ts";
import { mockProvider } from "./mock.ts";
import type { AnalysisProvider } from "./types.ts";

// §15: provider is abstracted behind AnalysisProvider so swapping is a one-line config change.
//
// Real analysis via a paid Claude/GPT-4V API key is deliberately deferred until near the end of
// the build (API keys get purchased once the rest of the app is basically finished, not during
// earlier development). So ANALYSIS_PROVIDER defaults to "mock" — a free, no-API-key placeholder
// (see ./mock.ts) good enough to build and test the full pipeline/UI against. Once real keys are
// ready, set ANALYSIS_PROVIDER=claude or ANALYSIS_PROVIDER=gpt4v (whichever the eval/
// Claude-vs-GPT-4V comparison picks, per §17 item 9/§19 Phase 1) with the matching API key — no
// code change needed anywhere else.
export function getAnalysisProvider(): AnalysisProvider {
  const name = Deno.env.get("ANALYSIS_PROVIDER") ?? "mock";
  if (name === "gpt4v") return gpt4vProvider;
  if (name === "claude") return claudeProvider;
  if (name === "mock") return mockProvider;
  throw new Error(`Unknown ANALYSIS_PROVIDER "${name}". Expected "claude", "gpt4v", or "mock".`);
}
