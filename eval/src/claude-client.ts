import Anthropic from "@anthropic-ai/sdk";
import { analysisJsonSchema, buildPrompt, type AnalysisResult } from "./schema.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface ProviderCallResult {
  provider: "claude";
  model: string;
  latencyMs: number;
  result: AnalysisResult;
  rawUsage: unknown;
}

export async function analyzeWithClaude(base64Jpeg: string, makeupOn: boolean): Promise<ProviderCallResult> {
  const model = process.env.CLAUDE_MODEL ?? "claude-sonnet-5";
  const start = Date.now();

  const response = await anthropic.messages.create({
    model,
    max_tokens: 4096,
    tools: [
      {
        name: "return_analysis",
        description: "Return the structured beauty/style analysis result for this selfie.",
        input_schema: analysisJsonSchema as unknown as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: "return_analysis" },
    messages: [
      {
        role: "user",
        content: [
          {
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Jpeg },
          },
          { type: "text", text: buildPrompt(makeupOn) },
        ],
      },
    ],
  });

  const latencyMs = Date.now() - start;
  const toolUse = response.content.find((block) => block.type === "tool_use");
  if (!toolUse || toolUse.type !== "tool_use") {
    throw new Error(`Claude did not return a tool_use block. Stop reason: ${response.stop_reason}`);
  }

  return {
    provider: "claude",
    model,
    latencyMs,
    result: toolUse.input as AnalysisResult,
    rawUsage: response.usage,
  };
}
