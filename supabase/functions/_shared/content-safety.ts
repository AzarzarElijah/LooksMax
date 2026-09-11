// Content-safety pre-check per PROJECT_CONTEXT.md §17 item 2: runs on every uploaded photo,
// before it is stored or sent to the analysis provider at all.
//
// NOT YET WIRED UP: hash-matching against known-CSAM databases (e.g. Thorn's Safer), which the
// project doc calls "close to a hard requirement" given a 13+ user base. That's a vendor
// integration/contract, not something to stub convincingly — do not ship without it. What's
// implemented here is the NSFW/general-moderation half only, via OpenAI's moderation endpoint.
//
// Fails CLOSED: any time a real moderation verdict can't be obtained — no OPENAI_API_KEY
// configured, or the moderation call itself throws/times out/errors — the photo is treated as
// unsafe, never silently passed through. The one exception is the explicit local-dev bypass
// below (DEV_UNSAFE_SKIP_CONTENT_SAFETY), a separate, independently-controlled switch from "is a
// key configured" — that conflation (one flag serving as both a safety gate and a dev
// convenience) is exactly what caused this to fail open before. This module refuses to even
// start if that flag is set anywhere it isn't explicitly declared as a development environment.

import OpenAI from "npm:openai@7.10.0";

export interface ContentSafetyResult {
  safe: boolean;
  flaggedCategories: string[];
}

export type ContentSafetyChecker = (base64Jpeg: string) => Promise<ContentSafetyResult>;

// Per-request, not a global client timeout — set here rather than on the OpenAI client
// constructor so it applies only to this call. Well under the Supabase Edge Function wall-clock
// limit (150s free / 400s paid, see PROJECT_CONTEXT.md), so a hung moderation call fails fast
// into the catch block below (and its fail-closed verdict) instead of the platform silently
// killing the whole invocation with a bare 504 first. maxRetries is likewise set explicitly
// (rather than left at the SDK's default of 2) so a hanging backend can chain at most one retry —
// worst case ~2x this timeout, not 3x — keeping total latency bounded and predictable.
const MODERATION_REQUEST_TIMEOUT_MS = 20_000;
const MODERATION_MAX_RETRIES = 1;

const DEV_BYPASS_FLAG = "DEV_UNSAFE_SKIP_CONTENT_SAFETY";

export interface EnvReader {
  get(key: string): string | undefined;
}

// Isolated as its own exported function (rather than inlined below) purely so this
// misconfiguration guard is unit-testable without a real Deno.env — see content-safety.test.ts.
// Real callers always use the default (Deno.env).
export function resolveDevBypass(env: EnvReader = Deno.env): boolean {
  const bypassRequested = env.get(DEV_BYPASS_FLAG) === "true";
  if (!bypassRequested) return false;

  const appEnv = env.get("APP_ENV");
  if (appEnv !== "development") {
    throw new Error(
      `${DEV_BYPASS_FLAG} is set to "true" but APP_ENV is "${appEnv ?? "unset"}", not ` +
        `"development". Refusing to start: this flag must never be active outside a local/dev ` +
        `environment. Set APP_ENV=development if this really is local dev, or unset ` +
        `${DEV_BYPASS_FLAG} otherwise.`
    );
  }
  return true;
}

// Evaluated once at module load (cold start), not per-request — a misconfigured deploy fails
// loudly and immediately (the function never boots) rather than only failing safety-relevantly
// on the first real request.
const devBypassActive = resolveDevBypass();

let client: OpenAI | undefined;
function getClient(): OpenAI {
  if (!client) client = new OpenAI({ apiKey: Deno.env.get("OPENAI_API_KEY") });
  return client;
}

export const checkContentSafety: ContentSafetyChecker = async (base64Jpeg) => {
  if (devBypassActive) {
    return { safe: true, flaggedCategories: [] };
  }

  if (!Deno.env.get("OPENAI_API_KEY")) {
    return { safe: false, flaggedCategories: ["moderation_unavailable_no_key"] };
  }

  try {
    const response = await getClient().moderations.create(
      {
        model: "omni-moderation-latest",
        input: [{ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Jpeg}` } }],
      },
      { timeout: MODERATION_REQUEST_TIMEOUT_MS, maxRetries: MODERATION_MAX_RETRIES }
    );

    const result = response.results[0];
    const flaggedCategories = Object.entries(result.categories)
      .filter(([, flagged]) => flagged)
      .map(([category]) => category);

    return { safe: !result.flagged, flaggedCategories };
  } catch (err) {
    console.error("[content-safety] moderation call failed — failing closed:", err);
    return { safe: false, flaggedCategories: ["moderation_unavailable_error"] };
  }
};
