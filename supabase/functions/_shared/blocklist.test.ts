import { assertEquals } from "jsr:@std/assert@1";
import { scanForBlockedTerms } from "./blocklist.ts";

Deno.test("scanForBlockedTerms finds nothing in clean positive-framed text", () => {
  const result = {
    categories: {
      skin: {
        recommendations: [{ title: "Glow boost", rationale: "Brightens dullness", how_to: "Use a vitamin C serum in the morning." }],
      },
    },
  };
  assertEquals(scanForBlockedTerms(result), []);
});

Deno.test("scanForBlockedTerms catches a medical term nested deep in the object", () => {
  const result = {
    categories: {
      skin: {
        recommendations: [{ title: "x", rationale: "This could be a sign of rosacea.", how_to: "y" }],
      },
    },
  };
  const hits = scanForBlockedTerms(result);
  assertEquals(hits.length, 1);
  assertEquals(hits[0].term, "rosacea");
});

Deno.test("scanForBlockedTerms is case-insensitive", () => {
  const hits = scanForBlockedTerms({ text: "See a Dermatologist about this." });
  assertEquals(hits.some((h) => h.term === "dermatologist"), true);
});

Deno.test("scanForBlockedTerms catches diagnose/diagnosis via the 'diagnos' stem", () => {
  assertEquals(scanForBlockedTerms({ text: "we cannot diagnose this" }).length > 0, true);
  assertEquals(scanForBlockedTerms({ text: "a diagnosis is needed" }).length > 0, true);
});

Deno.test("scanForBlockedTerms scans across arrays of strings", () => {
  const hits = scanForBlockedTerms(["all clear here", "possible infection risk"]);
  assertEquals(hits.some((h) => h.term === "infection"), true);
});

Deno.test("scanForBlockedTerms returns one hit per matching term occurrence, not per string", () => {
  const hits = scanForBlockedTerms({ text: "acne and rosacea both mentioned" });
  assertEquals(hits.length, 2);
});
