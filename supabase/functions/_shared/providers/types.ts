import type { AnalysisResult } from "../schema.ts";

export interface ProviderAnalysisResult {
  provider: "claude" | "gpt4v" | "mock";
  model: string;
  latencyMs: number;
  result: AnalysisResult;
}

// §15: the AI/analysis provider is abstracted behind this interface so swapping the winner of
// the eval/ Claude-vs-GPT-4V comparison is a one-line config change, not a rewrite. "mock" is a
// third option (no API key, no cost, no external call) used during development/testing — real
// keys are only wired up near the end of the build (see ./index.ts and ./mock.ts).
export interface AnalysisProvider {
  name: "claude" | "gpt4v" | "mock";
  analyze(base64Jpeg: string, makeupOn: boolean): Promise<ProviderAnalysisResult>;
}
