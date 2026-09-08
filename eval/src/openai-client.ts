import OpenAI from "openai";
import { analysisJsonSchema, buildPrompt, type AnalysisResult } from "./schema.js";
import type { ProviderCallResult } from "./claude-client.js";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function analyzeWithGpt4v(
  base64Jpeg: string,
  makeupOn: boolean
): Promise<Omit<ProviderCallResult, "provider"> & { provider: "gpt4v" }> {
  const model = process.env.OPENAI_MODEL ?? "gpt-4o";
  const start = Date.now();

  const response = await openai.chat.completions.create({
    model,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: buildPrompt(makeupOn) },
          { type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } },
        ],
      },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "return_analysis",
        schema: analysisJsonSchema,
        strict: true,
      },
    },
  });

  const latencyMs = Date.now() - start;
  const content = response.choices[0]?.message?.content;
  if (!content) {
    throw new Error("GPT-4V returned no content.");
  }

  return {
    provider: "gpt4v",
    model,
    latencyMs,
    result: JSON.parse(content) as AnalysisResult,
    rawUsage: response.usage,
  };
}
