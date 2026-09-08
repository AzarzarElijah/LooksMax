import Anthropic from "npm:@anthropic-ai/sdk@0.124.0";
import { analysisJsonSchema, buildPrompt, type AnalysisResult } from "../schema.ts";
import type { AnalysisProvider } from "./types.ts";

let client: Anthropic | undefined;
function getClient(): Anthropic {
  if (!client) client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY") });
  return client;
}

export const claudeProvider: AnalysisProvider = {
  name: "claude",
  async analyze(base64Jpeg, makeupOn) {
    const model = Deno.env.get("CLAUDE_MODEL") ?? "claude-sonnet-5";
    const start = Date.now();

    const response = await getClient().messages.create({
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
            { type: "image", source: { type: "base64", media_type: "image/jpeg", data: base64Jpeg } },
            { type: "text", text: buildPrompt(makeupOn) },
          ],
        },
      ],
    });

    const toolUse = response.content.find((block) => block.type === "tool_use");
    if (!toolUse || toolUse.type !== "tool_use") {
      throw new Error(`Claude did not return a tool_use block. Stop reason: ${response.stop_reason}`);
    }

    return {
      provider: "claude",
      model,
      latencyMs: Date.now() - start,
      result: toolUse.input as AnalysisResult,
    };
  },
};
