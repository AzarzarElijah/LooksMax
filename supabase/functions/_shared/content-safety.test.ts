import { assertEquals, assertThrows } from "jsr:@std/assert@1";
import { resolveDevBypass, type EnvReader } from "./content-safety.ts";

function envOf(vars: Record<string, string>): EnvReader {
  return { get: (key) => vars[key] };
}

Deno.test("resolveDevBypass is false when the flag is unset, regardless of APP_ENV", () => {
  assertEquals(resolveDevBypass(envOf({})), false);
  assertEquals(resolveDevBypass(envOf({ APP_ENV: "production" })), false);
});

Deno.test("resolveDevBypass is false when the flag is set to anything other than the literal string 'true'", () => {
  assertEquals(resolveDevBypass(envOf({ DEV_UNSAFE_SKIP_CONTENT_SAFETY: "1", APP_ENV: "development" })), false);
});

Deno.test("resolveDevBypass is true when the flag is 'true' and APP_ENV is exactly 'development'", () => {
  assertEquals(
    resolveDevBypass(envOf({ DEV_UNSAFE_SKIP_CONTENT_SAFETY: "true", APP_ENV: "development" })),
    true
  );
});

Deno.test("resolveDevBypass throws when the flag is set but APP_ENV is missing", () => {
  assertThrows(() => resolveDevBypass(envOf({ DEV_UNSAFE_SKIP_CONTENT_SAFETY: "true" })));
});

Deno.test("resolveDevBypass throws when the flag is set and APP_ENV is 'production'", () => {
  assertThrows(() =>
    resolveDevBypass(envOf({ DEV_UNSAFE_SKIP_CONTENT_SAFETY: "true", APP_ENV: "production" }))
  );
});

Deno.test("resolveDevBypass throws when the flag is set and APP_ENV is anything other than 'development'", () => {
  assertThrows(() =>
    resolveDevBypass(envOf({ DEV_UNSAFE_SKIP_CONTENT_SAFETY: "true", APP_ENV: "preview" }))
  );
});
