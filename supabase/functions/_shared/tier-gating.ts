// Free vs. paid gating logic, per PROJECT_CONTEXT.md §13.4 and §13.9.
// Pure functions, tested per the §19 Phase 1 note that safety/product-guardrail-critical
// pure functions get automated tests from Phase 1 onward.

export type SubscriptionTier = "free" | "paid";

export const FREE_TIER_RECOMMENDATION_CAP = 2;

export interface RankedRecommendation {
  rank: number;
}

// §13.4: free tier sees only the top 2 tips per category; paid sees the full ranked list.
// Applied at read time against `rank` — never stored as a flag (§16 recommendations table).
export function applyRecommendationCap<T extends RankedRecommendation>(
  recommendations: T[],
  tier: SubscriptionTier
): T[] {
  if (tier === "paid") return recommendations;
  return recommendations.filter((r) => r.rank <= FREE_TIER_RECOMMENDATION_CAP);
}

// §18/§19 decision #2: paid tier's "unlimited" re-scans carry an invisible fair-use cap of
// ~30/day — a technical backstop against runaway cost from a compromised account or bug, not a
// real-world restriction on genuine use. Implemented as a literal 30; the "~" in the spec signals
// it's not a fine-tuned business number, not that any other value would do.
export const PAID_TIER_DAILY_FAIR_USE_CAP = 30;

export interface ScanEligibilityInput {
  tier: SubscriptionTier;
  /** Count of this user's scans since the start of the current calendar month, before this attempt. */
  scansThisCalendarMonth: number;
  /** Count of this user's scans since the start of the current calendar day (UTC), before this attempt. Only meaningful for paid tier. */
  scansToday: number;
  bonusRescansRemaining: number;
}

export interface ScanEligibilityResult {
  allowed: boolean;
  reason?: "free_tier_monthly_limit" | "paid_tier_daily_fair_use_cap";
  /** True if this scan should consume one bonus credit (§13.8 referral rewards) rather than the free monthly allowance. */
  consumesBonusRescan: boolean;
}

// §13.9: free tier gets 1 scan/month baseline; paid is unlimited except for the daily fair-use
// cap above. A free user who has used their monthly scan can still go through on an earned
// referral/creator bonus credit (§13.8).
export function checkScanEligibility(input: ScanEligibilityInput): ScanEligibilityResult {
  if (input.tier === "paid") {
    if (input.scansToday >= PAID_TIER_DAILY_FAIR_USE_CAP) {
      return { allowed: false, reason: "paid_tier_daily_fair_use_cap", consumesBonusRescan: false };
    }
    return { allowed: true, consumesBonusRescan: false };
  }
  if (input.scansThisCalendarMonth < 1) {
    return { allowed: true, consumesBonusRescan: false };
  }
  if (input.bonusRescansRemaining > 0) {
    return { allowed: true, consumesBonusRescan: true };
  }
  return { allowed: false, reason: "free_tier_monthly_limit", consumesBonusRescan: false };
}
