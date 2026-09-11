// POST /analyze-scan — the Phase 1 walking-skeleton endpoint (§19).
//
// Client contract (Part 4 safety fix, superseding the earlier "client uploads to Storage first"
// design): the mobile app generates a scan id client-side and sends the accepted photo as base64
// bytes in the request body itself. Nothing is written to Storage — or exists anywhere this
// function's caller, or anyone else, could read — until AFTER a safe content-safety verdict AND
// a successful analysis. This function derives the storage path itself from the caller's
// verified identity + the scanId, and does the writing itself via its own service-role client —
// it never trusts a client-supplied path, and the client no longer has (or needs) a Storage
// insert policy for `scan-photos` (see supabase/migrations/20260908000100_close_client_storage_upload.sql).
//
// Body: { scanId: string (uuid), makeupOn: boolean, photoBase64: string, selectedStyleId?: string | null }

import { createClient } from "npm:@supabase/supabase-js@2.115.0";
import { decodeBase64 } from "jsr:@std/encoding@1/base64";
import {
  runAnalysisPipeline,
  ContentSafetyRejectedError,
  AnalysisFailedError,
  type PipelineResult,
  type RescaledCategoryResult,
} from "../_shared/pipeline.ts";
import { checkScanEligibility, type SubscriptionTier } from "../_shared/tier-gating.ts";

interface AnalyzeScanRequest {
  scanId: string;
  makeupOn: boolean;
  photoBase64: string;
  selectedStyleId?: string | null;
}

// Generous sanity ceiling, not a precisely-known platform request-size limit — a guided selfie
// JPEG at capture.tsx's quality 0.85 should be well under this. Exists so an oversized/malformed
// payload fails fast with a clear message instead of an opaque downstream error.
const MAX_PHOTO_BASE64_LENGTH = 15_000_000; // ~11 MB decoded

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function isValidRequest(body: unknown): body is AnalyzeScanRequest {
  if (typeof body !== "object" || body === null) return false;
  const b = body as Record<string, unknown>;
  return (
    typeof b.scanId === "string" &&
    b.scanId.length > 0 &&
    typeof b.makeupOn === "boolean" &&
    typeof b.photoBase64 === "string" &&
    b.photoBase64.length > 0
  );
}

function startOfCurrentMonthUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

function startOfCurrentDayUtc(): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Missing Authorization header" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  // Verify the caller's identity from their own JWT before doing anything privileged.
  const authClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: userData, error: authError } = await authClient.auth.getUser();
  if (authError || !userData.user) return json({ error: "Invalid session" }, 401);
  const userId = userData.user.id;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!isValidRequest(body)) {
    return json({ error: "scanId (string), makeupOn (boolean), and photoBase64 (string) are required" }, 400);
  }
  if (body.photoBase64.length > MAX_PHOTO_BASE64_LENGTH) {
    return json({ error: "Photo is too large" }, 413);
  }

  // scans/scan_category_scores/recommendations/users have no client-side write policy — only
  // Edge Functions write them, via the service-role client (see the RLS migration).
  const db = createClient(supabaseUrl, serviceRoleKey);

  const { data: userRow, error: userRowError } = await db
    .from("users")
    .select("subscription_tier, bonus_rescans_remaining, referred_by_user_id")
    .eq("id", userId)
    .single();
  if (userRowError || !userRow) return json({ error: "User record not found" }, 404);

  const tier = userRow.subscription_tier as SubscriptionTier;

  const [{ count: totalScanCount }, { count: scansThisMonth }, { count: scansToday }] = await Promise.all([
    db.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId),
    db.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", startOfCurrentMonthUtc()),
    db.from("scans").select("id", { count: "exact", head: true }).eq("user_id", userId).gte("captured_at", startOfCurrentDayUtc()),
  ]);

  const eligibility = checkScanEligibility({
    tier,
    scansThisCalendarMonth: scansThisMonth ?? 0,
    scansToday: scansToday ?? 0,
    bonusRescansRemaining: userRow.bonus_rescans_remaining,
  });
  if (!eligibility.allowed) {
    if (eligibility.reason === "paid_tier_daily_fair_use_cap") {
      return json({ error: "Daily scan limit reached, please try again tomorrow", reason: eligibility.reason }, 429);
    }
    return json({ error: "Monthly free scan limit reached", reason: eligibility.reason }, 402);
  }

  // Nothing is written anywhere yet — the safety check inside runAnalysisPipeline runs against
  // these in-memory bytes before anything is persisted, per Part 4's storage reorder.
  let pipelineResult: PipelineResult;
  try {
    pipelineResult = await runAnalysisPipeline(body.photoBase64, body.makeupOn);
  } catch (err) {
    if (err instanceof ContentSafetyRejectedError) {
      return json({ error: "Photo failed content-safety check" }, 422);
    }
    if (err instanceof AnalysisFailedError) {
      return json({ error: "Analysis failed, please try again" }, 502);
    }
    console.error(err);
    return json({ error: "Unexpected error" }, 500);
  }

  // Only now — safety verdict was safe AND analysis succeeded — does the photo get written
  // anywhere. Path is derived from the caller's verified identity, never trusted from the client.
  const photoStoragePath = `${userId}/${body.scanId}.jpg`;
  const { error: uploadError } = await db.storage
    .from("scan-photos")
    .upload(photoStoragePath, decodeBase64(body.photoBase64), { contentType: "image/jpeg", upsert: true });
  if (uploadError) {
    console.error(uploadError);
    return json({ error: "Failed to save scan" }, 500);
  }

  const { error: insertScanError } = await db.from("scans").insert({
    id: body.scanId,
    user_id: userId,
    photo_storage_path: photoStoragePath,
    makeup_on: body.makeupOn,
    overall_score: pipelineResult.overallScore,
    overall_potential_score: pipelineResult.overallPotentialScore,
    selected_style_id: body.selectedStyleId ?? null,
  });
  if (insertScanError) {
    console.error(insertScanError);
    // The photo above uploaded successfully but has no `scans` row to reference it — clean it
    // up rather than leave an orphaned photo in `scan-photos` with nothing pointing to it. Best
    // effort: if the delete itself fails, log it but still report the original insert failure to
    // the caller, since that's the actionable error here.
    const { error: cleanupError } = await db.storage.from("scan-photos").remove([photoStoragePath]);
    if (cleanupError) console.error("[analyze-scan] failed to clean up orphaned photo:", cleanupError);
    return json({ error: "Failed to save scan" }, 500);
  }

  const presentCategories: [string, RescaledCategoryResult][] = Object.entries(pipelineResult.categories).filter(
    (entry): entry is [string, RescaledCategoryResult] => entry[1] !== null
  );

  const { error: scoresError } = await db.from("scan_category_scores").insert(
    presentCategories.map(([categoryId, cat]) => ({
      scan_id: body.scanId,
      category_id: categoryId,
      score: cat.score,
      potential_score: cat.potentialScore,
    }))
  );
  if (scoresError) console.error(scoresError);

  const { error: recsError } = await db.from("recommendations").insert(
    presentCategories.flatMap(([categoryId, cat]) =>
      cat.recommendations.map((rec, index) => ({
        scan_id: body.scanId,
        category_id: categoryId,
        rank: index + 1,
        title: rec.title,
        rationale: rec.rationale,
        how_to_content: rec.how_to,
      }))
    )
  );
  if (recsError) console.error(recsError);

  // Consume a bonus credit rather than the free monthly allowance, if that's what let this scan
  // through (§13.8/§13.9). Only debit AFTER a successful analysis — a failed/rejected attempt
  // above never reaches here, so it never costs the user anything.
  if (eligibility.consumesBonusRescan) {
    const { error } = await db.rpc("increment_bonus_rescans", { target_user_id: userId, amount: -1 });
    if (error) console.error(error);
  }

  // §13.8: the referrer's credit fires on the invitee's FIRST scan ever, not on signup.
  if ((totalScanCount ?? 0) === 0 && userRow.referred_by_user_id) {
    const { data: referralRow } = await db
      .from("referrals")
      .select("id, referrer_user_id")
      .eq("invitee_user_id", userId)
      .is("invitee_first_scan_at", null)
      .maybeSingle();

    if (referralRow) {
      const now = new Date().toISOString();
      const { error: referralUpdateError } = await db
        .from("referrals")
        .update({ invitee_first_scan_at: now, reward_granted_at: now })
        .eq("id", referralRow.id);
      if (referralUpdateError) console.error(referralUpdateError);

      // Two-sided reward: both invitee and referrer get one bonus re-scan credit.
      const { error: inviteeCreditError } = await db.rpc("increment_bonus_rescans", { target_user_id: userId, amount: 1 });
      if (inviteeCreditError) console.error(inviteeCreditError);
      const { error: referrerCreditError } = await db.rpc("increment_bonus_rescans", {
        target_user_id: referralRow.referrer_user_id,
        amount: 1,
      });
      if (referrerCreditError) console.error(referrerCreditError);
    }
  }

  return json({
    scanId: body.scanId,
    provider: pipelineResult.provider,
    model: pipelineResult.model,
    detectedSkinTone: pipelineResult.detectedSkinTone,
    overallScore: pipelineResult.overallScore,
    overallPotentialScore: pipelineResult.overallPotentialScore,
    categories: pipelineResult.categories,
  });
});
