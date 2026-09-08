import { assertEquals } from "jsr:@std/assert@1";
import { rescaleScore, SCORE_FLOOR } from "./rescale.ts";

Deno.test("rescaleScore maps raw 0 to the floor", () => {
  assertEquals(rescaleScore(0), SCORE_FLOOR);
});

Deno.test("rescaleScore maps raw 100 to 100", () => {
  assertEquals(rescaleScore(100), 100);
});

Deno.test("rescaleScore preserves relative ordering between two raw scores", () => {
  const low = rescaleScore(30);
  const high = rescaleScore(70);
  assertEquals(low < high, true);
});

Deno.test("rescaleScore never returns below the floor even for out-of-range raw input", () => {
  assertEquals(rescaleScore(-50) >= SCORE_FLOOR, true);
  assertEquals(rescaleScore(500) <= 100, true);
});

Deno.test("rescaleScore always returns a whole number", () => {
  for (const raw of [1, 17, 33, 49, 66, 82, 99]) {
    assertEquals(Number.isInteger(rescaleScore(raw)), true);
  }
});

Deno.test("rescaleScore respects a custom floor", () => {
  assertEquals(rescaleScore(0, 50), 50);
  assertEquals(rescaleScore(100, 50), 100);
});
