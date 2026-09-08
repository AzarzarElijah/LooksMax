// Content-safety pre-check per PROJECT_CONTEXT.md §17 item 2: runs on every uploaded photo,
// before it is stored or sent to the analysis provider at all.
//
// NOT YET WIRED UP: hash-matching against known-CSAM databases (e.g. Thorn's Safer), which the
// project doc calls "close to a hard requirement" given a 13+ user base. That's a vendor
// integration/contract, not something to stub convincingly — do not ship without it. What's
// implemented here is the NSFW/general-moderation half only, via OpenAI's moderation endpoint.
//
// This also runs unconditionally regardless of ANALYSIS_PROVIDER, so it needs its own
// no-API-key fallback for the same reason mock.ts exists for analysis: real API keys are
// deliberately deferred until near the end of the build. If OPENAI_API_KEY isn't set, this
// always returns "safe" without calling any API — a placeholder, not a real safety check. The
// moment a real OPENAI_API_KEY is set, real moderation kicks in automatically, no code change
// needed. Never treat the placeholder path as sufficient for real user traffic.

import OpenAI from "npm:openai@7.10.0";

export interface ContentSafetyResult {
  safe: boolean;
  flaggedCategories: string[];
}

export type ContentSafetyChecker = (base64Jpeg: string) => Promise<ContentSafetyResult>;

let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  return client;
}

export const checkContentSafety: ContentSafetyChecker = async (base64Jpeg) => {
  if (!Deno.env.get("OPENAI_API_KEY")) {
    return { safe: true, flaggedCategories: [] };
  }

  const response = await getClient().moderations.create({
    model: "omni-moderation-latest",
    input: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } }],
  });

  const result = response.results[0];
  const flaggedCategories = Object.entries(result.categories)
    .filter(([, flagged]) => flagged)
    .map(([category]) => category);

  return { safe: !result.flagged, flaggedCategories };
};
