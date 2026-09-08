import OpenAI from "npm:openai@7.10.0";
import { analysisJsonSchema, buildPrompt, type AnalysisResult } from "../schema.ts";
import type { AnalysisProvider } from "./types.ts";

let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  return client;
}

export const gpt4vProvider: AnalysisProvider = {
  name: "gpt4v",
  async analyze(base64Jpeg, makeupOn) {
    const model = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o";
    const start = Date.now();

    const response = await getClient().chat.completions.create({
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

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("GPT-4V returned no content.");
    }

    return {
      provider: "gpt4v",
      model,
      latencyMs: Date.now() - start,
      result: JSON.parse(content) as AnalysisResult,
    };
  },
};
