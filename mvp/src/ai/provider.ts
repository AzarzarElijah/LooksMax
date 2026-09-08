import type { AnalysisInput, AnalysisResult, AnalyzeOptions } from "./types";
import { MockAnalysisProvider } from "./mock-provider";
import { OpenAIAnalysisProvider } from "./openai-provider";

/**
 * Every analysis backend implements this. The UI depends only on this
 * interface (via `getAnalysisProvider`) so swapping mock <-> OpenAI <->
 * a future Claude provider never touches a screen component.
 *
 * Scoring philosophy (see project spec §7): scores are an engagement
 * mechanic, not a scientific measurement. Providers must keep language
 * encouraging and never diagnose medical conditions.
 */
export interface AnalysisProvider {
  readonly id: "mock" | "openai";
  analyze(input: AnalysisInput, options?: AnalyzeOptions): Promise<AnalysisResult>;
}

let cached: AnalysisProvider | null = null;

function readApiKey(): string | undefined {
  return import.meta.env.VITE_OPENAI_API_KEY as string | undefined;
}

/**
 * Picks the provider based on environment configuration:
 * - VITE_OPENAI_API_KEY present  -> OpenAIAnalysisProvider
 * - otherwise                    -> MockAnalysisProvider (demo mode)
 *
 * This is the ONLY place that decides which provider is active. Screens
 * import `getAnalysisProvider()`, never a concrete provider class.
 */
export function getAnalysisProvider(): AnalysisProvider {
  if (cached) return cached;
  const apiKey = readApiKey();
  cached =
    apiKey && apiKey.trim().length > 0
      ? new OpenAIAnalysisProvider(apiKey.trim())
      : new MockAnalysisProvider();
  return cached;
}

export function isDemoMode(): boolean {
  const apiKey = readApiKey();
  return !apiKey || apiKey.trim().length === 0;
}
