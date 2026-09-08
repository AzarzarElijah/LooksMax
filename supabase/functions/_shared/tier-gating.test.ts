import { assertEquals } from "jsr:@std/assert@1";
import { applyRecommendationCap, checkScanEligibility, PAID_TIER_DAILY_FAIR_USE_CAP } from "./tier-gating.ts";

Deno.test("applyRecommendationCap caps free tier at the top 2 by rank", () => {
  const recs = [{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }];
  assertEquals(applyRecommendationCap(recs, "free"), [{ rank: 1 }, { rank: 2 }]);
});

Deno.test("applyRecommendationCap returns the full list for paid tier", () => {
  const recs = [{ rank: 1 }, { rank: 2 }, { rank: 3 }, { rank: 4 }];
  assertEquals(applyRecommendationCap(recs, "paid"), recs);
});

Deno.test("applyRecommendationCap handles fewer than 2 recommendations", () => {
  const recs = [{ rank: 1 }];
  assertEquals(applyRecommendationCap(recs, "free"), [{ rank: 1 }]);
});

Deno.test("checkScanEligibility allows paid tier well under the daily fair-use cap, without touching bonus credits", () => {
  const result = checkScanEligibility({ tier: "paid", scansThisCalendarMonth: 12, scansToday: 0, bonusRescansRemaining: 0 });
  assertEquals(result, { allowed: true, consumesBonusRescan: false });
});

Deno.test("checkScanEligibility allows paid tier's first scan of the day", () => {
  const result = checkScanEligibility({ tier: "paid", scansThisCalendarMonth: 0, scansToday: 0, bonusRescansRemaining: 0 });
  assertEquals(result, { allowed: true, consumesBonusRescan: false });
});

Deno.test("checkScanEligibility allows paid tier exactly one scan under the daily fair-use cap", () => {
  const result = checkScanEligibility({
    tier: "paid",
    scansThisCalendarMonth: 0,
    scansToday: PAID_TIER_DAILY_FAIR_USE_CAP - 1,
    bonusRescansRemaining: 0,
  });
  assertEquals(result, { allowed: true, consumesBonusRescan: false });
});

Deno.test("checkScanEligibility denies paid tier exactly at the daily fair-use cap", () => {
  const result = checkScanEligibility({
    tier: "paid",
    scansThisCalendarMonth: 0,
    scansToday: PAID_TIER_DAILY_FAIR_USE_CAP,
    bonusRescansRemaining: 0,
  });
  assertEquals(result.allowed, false);
  assertEquals(result.reason, "paid_tier_daily_fair_use_cap");
  assertEquals(result.consumesBonusRescan, false);
});

Deno.test("checkScanEligibility denies paid tier well past the daily fair-use cap", () => {
  const result = checkScanEligibility({
    tier: "paid",
    scansThisCalendarMonth: 0,
    scansToday: PAID_TIER_DAILY_FAIR_USE_CAP + 50,
    bonusRescansRemaining: 0,
  });
  assertEquals(result.allowed, false);
  assertEquals(result.reason, "paid_tier_daily_fair_use_cap");
});

Deno.test("checkScanEligibility never consumes a bonus credit for a paid-tier denial", () => {
  const result = checkScanEligibility({
    tier: "paid",
    scansThisCalendarMonth: 0,
    scansToday: PAID_TIER_DAILY_FAIR_USE_CAP,
    bonusRescansRemaining: 5,
  });
  assertEquals(result.consumesBonusRescan, false);
});

Deno.test("checkScanEligibility allows a free user's first scan of the month", () => {
  const result = checkScanEligibility({ tier: "free", scansThisCalendarMonth: 0, scansToday: 0, bonusRescansRemaining: 0 });
  assertEquals(result, { allowed: true, consumesBonusRescan: false });
});

Deno.test("checkScanEligibility denies a free user's second scan of the month with no bonus credits", () => {
  const result = checkScanEligibility({ tier: "free", scansThisCalendarMonth: 1, scansToday: 1, bonusRescansRemaining: 0 });
  assertEquals(result.allowed, false);
  assertEquals(result.reason, "free_tier_monthly_limit");
  assertEquals(result.consumesBonusRescan, false);
});

Deno.test("checkScanEligibility lets a free user spend a bonus credit past the monthly limit", () => {
  const result = checkScanEligibility({ tier: "free", scansThisCalendarMonth: 3, scansToday: 1, bonusRescansRemaining: 2 });
  assertEquals(result.allowed, true);
  assertEquals(result.consumesBonusRescan, true);
});

Deno.test("checkScanEligibility ignores scansToday entirely for free tier (cap is monthly, not daily)", () => {
  const result = checkScanEligibility({ tier: "free", scansThisCalendarMonth: 0, scansToday: 999, bonusRescansRemaining: 0 });
  assertEquals(result, { allowed: true, consumesBonusRescan: false });
});
