# Safety & Privacy Architecture (Planning Document)

**Status:** Planning / not implemented. No application code, migrations, config, or tests
change as a result of this document.

**Scope:** This document designs the target architecture for (1) age/jurisdiction-aware
policy, (2) photo safety quarantine, (3) a swappable CSAM/safety vendor abstraction, (4) the
compliance workflow for suspected CSAM, (5) data lifecycle/retention, and (6) the concrete
delta against what's built today. It supersedes nothing in `PROJECT_CONTEXT.md` — it fills in
the detail behind §17 item 2 (content-safety pre-check) and §13.11 (age gate & consent), both
of which were left as open items there.

**Explicit non-goals of this document and of the work that follows it, until stated
otherwise:**
- No CSAM vendor is chosen, contacted, or integrated here (not Thorn, PhotoDNA, Hive, Google,
  or anyone else).
- No jurisdiction-specific legal question (13-17 consent requirements, BIPA, EU/UK minor
  profiling rules, launch jurisdictions) is answered here — those are tracked as open decisions
  in §7 and require counsel, not engineering judgment.
- Nothing in this document is implemented by writing it. §8 gives the order in which pieces of
  it should eventually be built.

---

## 1. Age architecture

### Design principle: derive, don't duplicate

The current schema (`supabase/migrations/20260906000000_initial_schema.sql`) stores
`users.birthdate` and `users.region` (a two-value enum: `US` / `EU_UK`) as raw facts. That's
the right instinct — **keep storing raw facts, not conclusions.** The mistake to avoid going
forward is adding booleans like `is_minor`, `needs_parental_consent`, or
`profiling_allowed` as columns. Booleans like that:
- go stale silently (a user's age cohort changes the day they turn 14/18, with no event to
  trigger a column update),
- multiply combinatorially the moment a second axis (jurisdiction) is added, and
- encode a legal conclusion in the data model before the legal question is answered (§7).

Instead, model this as **raw facts in, policy resolved at decision time.**

### The three raw axes

1. **Age cohort** — derived, never stored, computed from `birthdate` at the moment it's
   needed:
   - `under_13` — should not exist as an active account at all (already blocked at signup by
     `handle_new_user()` in `20260906000400_handle_new_user_trigger.sql`); this cohort exists
     in the model only as a defense-in-depth check, not a supported state.
   - `13_17`
   - `18_plus`

   Computed as `age_cohort(birthdate, as_of_date)` — a pure function, analogous in spirit to
   `rescaleScore()` or `checkScanEligibility()` in `supabase/functions/_shared/`. Pure,
   testable, no I/O. Cohort boundaries live in one place so a future regulatory change (e.g. a
   jurisdiction that draws the line at 16, not 13 or 18) is a config change, not a schema
   migration.

2. **Jurisdiction** — currently collapsed into `region` (`US` | `EU_UK`). That two-value enum
   is too coarse for what §7 will eventually require: EU and UK diverged post-Brexit (UK GDPR
   vs. EU GDPR are separately amendable), and US state law is not uniform (Illinois BIPA,
   California/Maryland age-appropriate-design-code-style laws, etc. — see §7). The
   forward-looking shape is a `jurisdiction` concept with two parts:
   - a **country/region code** (raw fact, e.g. ISO 3166 country, or a coarser bucket if that's
     all that's knowable at signup),
   - a **regulatory regime** derived from that code via a lookup table/config (e.g.
     `US-IL -> [FTC, BIPA]`, `EU -> [GDPR]`, `UK -> [UK_GDPR]`) — this lookup is exactly the
     kind of thing that should be a small versioned config, not hardcoded logic, because it
     will change as launch jurisdictions expand (§7) and as law changes.

   This document does not resolve what granularity of location is actually collectible/reliable
   (self-declared region vs. IP-based inference vs. app-store storefront) — that's an open
   product/legal question, not an architecture one. The architectural point is: keep the raw
   signal and the regime-lookup separate, so refining one doesn't require touching the other.

3. **Consent status** — already correctly modeled as a *versioned, typed, timestamped fact
   table* (`consents`: `user_id, consent_type, version, region_at_time, granted_at`), not
   columns on `users`. This is the pattern to extend, not replace. New `consent_type` values
   will be needed once §7's legal questions resolve — e.g. `parental_consent` and/or
   `parental_notice_acknowledged` for the `13_17` cohort in jurisdictions that require them.
   Because `consents` already versions by wording and stamps `region_at_time`, adding a new
   consent type later is additive (new rows, new allowed `consent_type` value), not a
   backfill/migration of existing users.

### The policy resolution function

Everything that needs to vary by age/jurisdiction/consent — is profiling/personalization
allowed, is promotional/paid-placement content eligible to be shown, does this cohort need a
parental-consent or parental-notice gate before proceeding — should be answered by one
**pure policy-resolution function**, not scattered conditionals:

```
resolvePolicy(input: {
  ageCohort: "13_17" | "18_plus",       // "under_13" never reaches this - blocked earlier
  jurisdiction: JurisdictionCode,
  consents: ConsentRecord[],            // this user's current versioned consent rows
}) -> {
  appUsageAllowed: boolean,
  requiresParentalConsent: boolean,     // config-driven per (ageCohort, jurisdiction) - §7
  requiresParentalNotice: boolean,      // distinct from consent - some regimes want notice only
  profilingAllowed: boolean,            // feeds §13.5 style/niche personalization,
                                         // recommendation ranking
  promotionalPlacementEligible: boolean,// feeds §13.6 "Promoted" paid-placement inventory
  dataRetentionPolicy: RetentionPolicyId,
}
```

This mirrors the shape already used for `AnalysisProvider` (`providers/types.ts`) and
`checkScanEligibility()` (`tier-gating.ts`): a small, pure, directly-testable function that the
HTTP-handling layer (`analyze-scan/index.ts` today, and any future onboarding/consent Edge
Function) calls and acts on, rather than embedding the logic inline. The **input rules
themselves** (which cohort/jurisdiction combination requires what) should live in a small
config object or table keyed by `(age_cohort, jurisdiction_regime)`, separate from the
resolution function's control flow — so that when §7's legal answers land, updating the
config is the whole change, not a rewrite of call sites.

**Explicitly not assumed:** this document does not assume `13_17` requires parental consent in
any or all jurisdictions. The config table starts empty/unknown for that cell and is filled in
only once §7's legal item is answered — until then, the safest default is documented in §7,
not silently baked into this section.

### Why this shape survives the open legal questions

Whatever §7 resolves the 13-17 answer to be — parental consent, parental notice, or neither,
possibly split by jurisdiction — this design absorbs it as:
1. a new `consent_type` row (if consent/notice is required),
2. a config-table entry for `resolvePolicy`'s `requiresParentalConsent`/`requiresParentalNotice`
   output for that cohort/jurisdiction cell,
3. an Edge-Function-level gate (analogous to today's `Stack.Protected` consent gate in
   `mobile/src/app/_layout.tsx`) that blocks progress until the required consent row exists.

No schema migration, no user-table boolean, no rewrite of the scoring/recommendation code that
reads `profilingAllowed`/`promotionalPlacementEligible` — those call sites are written once
against the policy function's output shape and don't change when the underlying rule does.

---

## 2. Photo safety architecture

### The invariant

**An unscanned image must never become available through normal user-facing scan storage.**
Concretely: nothing lands in the `scan-photos` bucket (or wherever "approved" storage
eventually lives) or gets referenced by a `scans` row until it has a recorded `clean` safety
verdict. Today's pipeline violates the spirit of this by construction, not by bug: the mobile
client uploads directly into `scan-photos` (`mobile/src/lib/scan-api.ts` ->
`supabase.storage.from('scan-photos').upload(...)`), and `analyze-scan/index.ts` downloads
from that same bucket and runs `checkContentSafety()` *after* the photo already sits in
user-facing storage. §6 below tracks this as a required change; this section describes the
target shape.

### Pipeline stages

```
1. photo upload         -> client uploads to a QUARANTINE bucket only, never scan-photos
2. private quarantine   -> object exists, un-referenced by any scans row, not user-readable
                            beyond "my own upload is pending"
3. automatic safety scan -> orchestration step: calls the safety-vendor abstraction (§3)
4. CSAM detection        -> one specific verdict channel within step 3
5. general NSFW/content  -> the other verdict channel within step 3 (today's checkContentSafety)
   safety
6. approved              -> a recorded, immutable verdict: "clean" (or "nsfw_rejected", or a
                            compliance-hold verdict - see §4)
7. promote to normal      -> ONLY on a "clean" verdict: copy/move the object into approved
   storage                  storage, create the scans row referencing it there
8. AI beauty analysis     -> today's `runAnalysisPipeline()`, unchanged in shape, now only ever
                            invoked against promoted, verdict-clean photos
9. retention/deletion     -> per §5, different retention rules for quarantine vs. approved
                            storage, and for the compliance-hold path (§4)
```

The key structural addition versus today is step 2-6: a **quarantine boundary with its own
storage bucket and its own tracking record**, so "has this been scanned, and what did the scan
say" is a queryable fact independent of whether the AI beauty analysis has run yet — those are
two different pipelines today accidentally sharing one bucket and one implicit trust
assumption.

A tracking record (call it `photo_intake` conceptually — no schema is being written here) needs
at minimum: an identifier, the quarantine storage path, an owner (user id), an upload
timestamp, and a status. Status is the state machine below.

### Status/behavior per case

| Case | Status transition | Storage outcome | User-facing behavior |
|---|---|---|---|
| **Clean image** | `uploaded` -> `scanning` -> `clean` -> `promoted` | Promoted (moved/copied) to approved storage; quarantine copy deleted or retained briefly per §5 | Proceeds to AI beauty analysis normally, no visible safety step beyond today's existing "processing" state |
| **Known-CSAM match** | `uploaded` -> `scanning` -> `csam_match` (terminal for the intake pipeline; opens the §4 compliance workflow) | **Never** promoted. Quarantine copy frozen — no further writes, no deletion, not even by the user's own deletion request (§5, §4) | Generic failure message, no wording that confirms *why* ("something went wrong processing this photo" — same shape as an NSFW rejection, deliberately not distinguishable to the uploader; exact required wording/behavior is a §7 lawyer question, not decided here) |
| **Suspected novel CSAM** (vendor returns a non-hash-match, lower-confidence classifier signal) | `uploaded` -> `scanning` -> `suspected_csam` -> routed to `compliance_review` (§4) | Not promoted, frozen, same as a confirmed match, pending human/compliance review | Same generic failure message as above — the uploader-facing behavior does not differ between "confirmed" and "suspected pending review," since tipping off the difference is itself a risk |
| **NSFW rejection** (general content-safety, not CSAM) | `uploaded` -> `scanning` -> `nsfw_rejected` (terminal, ordinary rejection, no compliance workflow) | Not promoted; quarantine copy deleted after a short standard retention window (§5) | User-facing rejection message — this is today's existing `ContentSafetyRejectedError` / HTTP 422 path in `pipeline.ts`, unchanged in spirit |
| **Provider timeout** | `uploaded` -> `scanning` -> retry (existing one-retry pattern from `pipeline.ts` extends naturally here) -> on repeated timeout, `scan_failed_transient` | Not promoted (fail closed) | Client sees a retryable error ("try again"), not a rejection — distinct from NSFW/CSAM outcomes so the client knows whether to let the user retry the same photo or force a new capture |
| **Provider outage** (vendor down, not just one slow call) | New uploads still land in quarantine; scanning step short-circuits via a circuit breaker rather than hammering a dead vendor | **Nothing is promoted while the vendor is down** — fail closed, never fall back to "assume clean" | New scans are blocked app-wide with a maintenance-style message rather than bypassing the safety scan; this is a deliberate availability/safety tradeoff the product must accept |
| **Webhook failure** (for any vendor that reports results asynchronously rather than in the same request/response) | An object stuck in `scanning` past an expected SLA | Not promoted (fail closed by construction — promotion only happens on an explicit `clean` result being recorded, never on absence of a rejection) | Needs a reconciliation job that polls/re-queries the vendor for any intake record stuck in `scanning` past a timeout threshold — a lost webhook must never silently resolve to "treated as clean." This reconciliation job is itself a required piece of the architecture, not an edge case to special-case away |
| **Abandoned upload** (client uploads to quarantine, then the app crashes/backgrounds/user leaves the flow before a scan ever kicks off) | Never leaves `uploaded` | TTL-based deletion: quarantine objects with no scan-status progression after N hours are deleted by a scheduled job (same `pg_cron`/`pg_net` mechanism already used for `sync-product-catalog`/`calculate-creator-commissions` per §18) | Nothing user-visible; this is pure hygiene, keeps quarantine storage from growing unbounded with orphaned uploads |
| **Duplicate upload** (same photo re-uploaded, e.g. a client-side retry after a network blip) | Content-hash (not necessarily perceptual — exact-match is enough for this case) dedup check before creating a new intake record; if an existing intake record for that hash already has a terminal `clean` or `nsfw_rejected` verdict, reuse it rather than re-scanning | No duplicate object needs to be created in quarantine at all if hash matches an already-terminal record | Transparent to the user — same outcome as if it were scanned fresh, just cheaper. **Exception:** a hash match against a `csam_match`/`suspected_csam` record must never be short-circuited into a "clean" reuse — dedup only fast-paths the clean/rejected outcomes, never the compliance-hold ones |
| **User deletion request** | Deletion flow must check intake/compliance status before honoring erasure | Ordinary quarantine/approved objects: deleted per §13.9's existing per-scan/account deletion semantics, extended to also delete the quarantine copy if one still exists. **Objects under `csam_match`/`suspected_csam`/any compliance hold: deletion is refused/deferred** — the object is preserved regardless of the user's erasure request, because legal preservation obligations (§4, §7) can override a user erasure right. The exact legal basis and duration is a §7 lawyer question; architecturally, the deletion flow must have a hold-check step that can say no | If a hold blocks deletion, the account/other-scan deletion should still proceed for everything *not* under hold — a compliance hold on one photo must not become an excuse to refuse a user's entire erasure request |

### Why quarantine has to be a separate bucket, not a status column on the existing bucket

A status column on an object living in a bucket the client already has `select` access to
(as `scan-photos` does today, per the RLS-style storage policies in
`20260906000200_storage.sql`) is not a real boundary — it relies on every code path
remembering to check the column. A **separate bucket with no client-side read policy** makes
"can the user's own client fetch this photo" the actual enforcement mechanism, not a
convention. Promotion becomes a real state transition (object moves to a different bucket with
a different policy), not a flag flip that every future reader must remember to respect.

---

## 3. Vendor abstraction

Modeled directly on the existing `AnalysisProvider` pattern (`providers/types.ts`,
`providers/index.ts`) that already abstracts Claude vs. GPT-4V behind one interface picked via
an env var — the same shape, applied to safety scanning instead of beauty analysis.

```ts
// Conceptual shape — not implemented, no vendor named or wired.

type SafetyVerdict =
  | "clean"
  | "nsfw"
  | "csam_match"        // vendor asserts a known-hash match
  | "suspected_csam"     // vendor's classifier flags without a hash match - needs human review
  | "error";             // vendor call failed - caller must fail closed, not treat as clean

interface SafetyScanResult {
  vendor: string;
  vendorScanId: string;          // vendor's own reference id, for audit trail - NOT the image
  verdict: SafetyVerdict;
  flaggedCategories?: string[];  // for the "nsfw" verdict only, mirrors today's ContentSafetyResult
  confidence?: number;           // meaningful mainly for "suspected_csam"
}

// Vendors differ in integration shape: some are synchronous (call, get a verdict back in the
// same request), some are async (submit, get a verdict later via webhook or polling). The
// abstraction has to cover both without leaking which one a given vendor uses into caller code.
interface SafetyProvider {
  name: string;
  submit(photoRef: QuarantinedPhotoRef): Promise<
    | { mode: "sync"; result: SafetyScanResult }
    | { mode: "async"; pendingScanId: string }   // caller records "scanning" and waits
  >;
  // Only meaningful for async vendors; a sync-only vendor's implementation of this can be
  // a no-op that's never called.
  normalizeWebhook(payload: unknown): SafetyScanResult;
}

// Same swap mechanism already used for ANALYSIS_PROVIDER (§17 item 9 / .env.example):
// getSafetyProvider() reads an env var, returns the configured implementation. Swapping
// vendors is a config change plus a new implementation file behind this interface - the
// upload/quarantine/promotion pipeline in §2 never changes.
```

Two things this abstraction deliberately does *not* do, on purpose:
- It does not assume every vendor covers both CSAM and NSFW in one call — some vendors are
  CSAM-hash-matching only, others are general moderation only (today's `content-safety.ts`
  is already the general-moderation-only case, via OpenAI's moderation endpoint). The pipeline
  in §2 should be able to call **two different providers** behind this same interface shape
  (one for CSAM, one for NSFW) if that ends up being the right vendor mix — nothing here
  assumes a single vendor does both.
- It does not assume synchronous request/response. Several real CSAM-detection vendors (this
  document does not name or evaluate any) use async submission + webhook callback patterns,
  which is exactly why §2's "webhook failure" case and this interface's `async` branch exist
  together — designed in from the start rather than retrofitted once a specific vendor's
  integration model is known.

---

## 4. Compliance workflow (conceptual states only — no reporting functionality implemented)

```
detected -> quarantined -> compliance_review -> reporting_required -> reported
                                                        |
                                                        v
                                              preservation_required (parallel, not sequential)
                                                        |
                                                        v
                                                    resolved
```

- **detected** — a `SafetyProvider` (§3) returns `csam_match` or `suspected_csam` for a
  quarantined photo (§2). This is a machine signal, not a legal or human conclusion.
- **quarantined** — already true by construction (§2: it was never promoted), but this state
  explicitly marks the object as held under the compliance workflow rather than the ordinary
  quarantine TTL-deletion path — it must be exempted from any "abandoned upload" auto-deletion
  job.
- **compliance_review** — a human/process step. **Vendor detection does not automatically
  transfer legal responsibility to the vendor.** A `csam_match`/`suspected_csam` verdict from
  a vendor is an input to this platform's own legal obligations, not a discharge of them — the
  operator of this app remains the responsible party for whatever reporting/preservation duties
  apply, regardless of which vendor's classifier produced the detection. This step is where a
  designated human process (not yet defined — org/staffing question, not an engineering one)
  confirms next action.
- **reporting_required** — the compliance review concludes a legal reporting obligation exists
  (e.g., to a relevant national authority/hotline in the operating jurisdiction). *Which*
  authority, under what statute, and on what timeline is a §7 lawyer question — this document
  only names the state, not the destination or mechanism.
- **reported** — the report has been filed through whatever process compliance_review
  determined. No reporting integration/API call is implemented by this document or by the
  phase that follows it until that process is legally defined.
- **preservation_required** — drawn as a state that can be entered directly from `detected` in
  parallel with the rest of the flow, not strictly after `reported`, because preservation
  obligations (not deleting evidence) typically need to start immediately on detection and
  persist independent of where the reporting workflow itself has gotten to. Interacts directly
  with §2's "user deletion request" case: while this flag is set, deletion of the underlying
  object is refused.
- **resolved** — the workflow's terminal state, reached only once both the reporting path (if
  required) and the preservation obligation (if any) have been satisfied per whatever process
  and retention duration compliance_review/legal determines.

This document defines the state names and their intended meaning so that the eventual schema
and process design have a shared vocabulary. It does not implement a table, an admin UI, a
notification, or a reporting API call for any of these states.

---

## 5. Data lifecycle — where the photo and derived data can exist

| Location | What can live there | Intended retention | Must never be logged/stored there |
|---|---|---|---|
| **Device** | The original captured/selected photo, pre-upload | Governed by the OS/app's own local storage — not this backend's concern beyond ensuring the app doesn't needlessly cache it after a successful upload | N/A (client-side, not a backend concern) |
| **Quarantine storage** | The uploaded photo, unscanned or mid-scan | Short — deleted on a terminal `clean` (after successful promotion), `nsfw_rejected` (short standard window), or abandoned-upload TTL (§2). **Held indefinitely under a compliance hold** (§4) regardless of these defaults | Nothing beyond the object itself and its intake-record metadata (timestamp, user id, status) — no derived AI content, no vendor response bodies stored alongside it beyond a reference id |
| **Approved storage** (`scan-photos` today) | Only photos with a recorded `clean` verdict, referenced by a `scans` row | Per §13.9's existing account/per-scan deletion model — retained until the user deletes the scan or account, no separate safety-driven retention beyond that (the safety question was already resolved before the photo arrived here) | N/A beyond the photo itself — this bucket was never meant to hold vendor/scan metadata |
| **Edge Functions** (in-memory, per-invocation) | The photo bytes transiently, during the scan/analysis call chain (already true today — `analyze-scan/index.ts` holds `base64Jpeg` in memory only for the duration of the request) | Zero persistence beyond the request lifetime — this is already the pattern in `pipeline.ts`, which is deliberately DB/HTTP-free and returns derived results only | **Must never log the photo bytes or base64 payload** — `console.error(err)` calls already present in `analyze-scan/index.ts` must stay scoped to error objects, never to request bodies containing image data |
| **Safety vendor** (§3) | Whatever the vendor's own integration requires it to receive (the photo, or a hash of it, depending on vendor architecture — not decided here) | Governed by the vendor's own data-handling terms once one is chosen (§7) — this is a vendor-contract question, not something this architecture can promise on its own | This platform must never log the vendor's raw response body if it could contain image data or a reconstructable representation of one — only the normalized `SafetyScanResult` (verdict, vendor scan id, category labels) should ever be persisted or logged on this platform's side |
| **AI provider** (Claude/GPT-4V, `providers/claude.ts` / `providers/openai.ts`) | The photo bytes, sent only after a `clean` verdict (per §2's invariant — this is the main behavior change from today, where the photo reaches the AI provider before/without a recorded safety verdict) | Governed by the provider's own API data-use terms (already a pre-existing consideration for this pipeline, not new to this document) | Same logging discipline as Edge Functions above — no photo bytes in any log line touching this call |
| **Database** (Postgres via Supabase) | Storage *paths*, not image bytes; scan scores/recommendations; intake-record status/timestamps (§2, §4); consent records (§1) | Per §13.9/§16's existing hard-delete model, extended: an intake record under compliance hold is the one row type that must survive a user's deletion request (§2's "user deletion request" case) | The database should never contain a column holding raw image bytes or base64 — this is already true of the current schema (`photo_storage_path text`, a pointer) and must stay true for any new intake/compliance tables |
| **Analytics/logging** (PostHog, Sentry per §15) | Event names, timings, error types, user/scan ids | Per each tool's own configured retention | **Must never receive photo bytes, base64 payloads, or full vendor/AI-provider response bodies.** Error reporting (Sentry) in particular needs explicit scrubbing/breadcrumb configuration so an unhandled exception in the upload/scan path doesn't accidentally serialize a request body containing image data into a crash report |
| **Backups** (Supabase-managed Postgres backups, and Storage's own redundancy) | Whatever the primary store legitimately holds (paths/metadata in DB backups; actual objects in Storage's redundancy) — no separate data category | Inherits the primary store's retention/deletion semantics; a genuinely erased row/object should not persist in a live-queryable backup past the platform's normal backup-rotation window | Same rule as the primary store — if it wasn't supposed to be in the DB or in Storage, it's not supposed to be in a backup of either. This surfaces a real tension worth flagging explicitly: a hard-delete requirement (§13.9/GDPR erasure) and a compliance-preservation hold (§4) can point in opposite directions on the *same* backup snapshot — resolving that tension is a §7 lawyer question, not an engineering one |

---

## 6. Existing architecture impact

This section compares the target design above against what's actually built today. **Nothing
listed here is changed by this document** — this is the punch list for whenever
implementation begins (see §8 for sequencing).

| Area | Today | Will eventually need to change to |
|---|---|---|
| `mobile/src/lib/scan-api.ts` | Uploads directly to `scan-photos` (the approved/user-facing bucket) at `{userId}/{scanId}.jpg`, then invokes `analyze-scan` against that same path | Upload to a **quarantine** bucket/path first; `analyze-scan` (or a new preceding function) becomes responsible for promotion, not direct client write to approved storage. The client's contract changes from "I wrote directly to the bucket the app will read from" to "I submitted something that must clear a scan before it's usable" |
| Mobile capture flow (`capture.tsx`, `confirm.tsx`) | No safety-pending state — confirm/retake is a local quality gate only (blur/lighting/face-in-frame per §13.1), then hands off assuming the next step is straight to analysis | Needs a "your photo is being checked" state distinct from "your photo is being analyzed" (§2's `scanning` status is not the same wait as the AI beauty-analysis wait) so a slow or async vendor scan doesn't read to the user as a hung AI call |
| Storage buckets/policies (`20260906000200_storage.sql`) | One private bucket (`scan-photos`) with client insert+select policies scoped by folder-per-user | A second bucket (quarantine) with **insert-only, no client select** policy — the client should not be able to read back its own quarantined upload, since "can I see it" should track "has it been approved," not "did I upload it." Promotion (quarantine -> approved) has to be a privileged (service-role) operation, not a client copy |
| `analyze-scan` (`supabase/functions/analyze-scan/index.ts`) | Downloads from `scan-photos` (already-approved-by-assumption storage) and runs `checkContentSafety()` as one step inside the same call that also runs the beauty-analysis pipeline and writes `scans`/`scan_category_scores`/`recommendations` | Splits into (at least) two responsibilities: an intake/scan step that operates on quarantine objects and only ever produces a promotion-or-rejection outcome, and the existing beauty-analysis step, which should only ever be invocable against an already-promoted, clean photo. Today's single-function design conflates "is this photo safe" with "what does the AI think of this photo," which §2's invariant requires be separated |
| Safety pipeline (`_shared/content-safety.ts`, `_shared/pipeline.ts`) | `checkContentSafety()` implements NSFW-only moderation (via OpenAI's moderation endpoint) and is explicitly commented as not yet including CSAM hash-matching; `pipeline.ts` calls it as the first step of the *same* call that also runs the beauty-analysis LLM call | Needs to be restructured behind the `SafetyProvider` abstraction (§3), decoupled from `runAnalysisPipeline()`'s single-call shape so a `csam_match`/`suspected_csam` verdict can route to the §4 compliance workflow instead of just throwing `ContentSafetyRejectedError` (today's only outcome bucket, which correctly handles NSFW but has no separate path for a CSAM signal) |
| Database schema | No table represents "an uploaded photo pending/undergoing a safety scan" — `scans` rows are only created *after* a full successful analysis (`analyze-scan/index.ts` inserts into `scans` only on the success path) | Needs an intake-record table (§2) that exists independently of `scans`, created at upload time, tracking quarantine status through to promotion — and a compliance-hold representation (§4) that can block deletion independent of the normal `scans` row lifecycle |
| Deletion flow | §13.9/§18's `delete-scan`/`delete-account` functions delete the Storage object and DB row together, unconditionally, with no hold-check concept | Needs a hold-check step before honoring deletion of any object with an associated intake record under `csam_match`/`suspected_csam`/compliance review (§2's "user deletion request" case) — deletion of everything else proceeds unaffected |
| Edge Functions (overall) | One provider abstraction exists (`AnalysisProvider`) for the beauty-analysis LLM call; no equivalent exists yet for safety scanning | A second, parallel `SafetyProvider` abstraction (§3), following the same env-var-driven swap pattern already established, plus (if an async vendor is eventually chosen) a webhook-receiving Edge Function and a reconciliation/polling job for the "webhook failure" case in §2 |

---

## 7. Open decisions

**Confirmed requirements** — settled by prior product/legal work already reflected in
`PROJECT_CONTEXT.md`, not open:
- Minimum age 13, no under-13 accounts (§13.11, already enforced server-side in the signup
  trigger).
- v1 launch geography is US + EU/UK, GDPR biometric-data rules (explicit consent, erasure,
  residency) are in scope from v1 (§2/§11).
- Account deletion is a true hard-delete for personal data; commission ledger rows are
  retained with the user reference nulled (§16).

**Likely interpretations** — reasonable working assumptions this document leans on, but which
are not confirmed legal conclusions and should be revisited once counsel weighs in:
- A vendor's automated CSAM detection does not, on its own, satisfy this platform's own
  reporting obligations — treated here as an architectural assumption (§4), consistent with
  how CSAM-detection vendors generally position their own tools, but not verified against this
  specific app's jurisdiction mix by counsel.
- Legal preservation obligations for suspected-CSAM material can override a user's erasure
  request for that specific object — assumed in §2/§5's design, not confirmed as to duration or
  exact legal basis.
- "Suspected novel CSAM" (a classifier signal without a hash match) warrants the same
  quarantine/no-promotion treatment as a confirmed hash match, pending human review — a
  conservative default chosen for architecture purposes, not a confirmed regulatory requirement.

**Lawyer-required questions** — genuinely open, tracked here rather than guessed at:

| Decision | Why it matters | Required answer/source | Blocks implementation? |
|---|---|---|---|
| 13-17 parental consent/notice requirements | Determines whether §1's policy-resolution function needs a parental-consent gate, a notice-only gate, or neither, and whether it varies by jurisdiction | Counsel review of COPPA (13+ exempt but state laws may still apply), EU GDPR Art. 8 (member-state digital-consent age varies 13-16), UK GDPR | Blocks §13.11/Phase 7 per PROJECT_CONTEXT.md §19; does not block the vendor-independent architecture work in §8 items 1-4 |
| BIPA (Illinois biometric privacy) applicability to face analysis | Illinois' Biometric Information Privacy Act imposes specific consent/retention/destruction-schedule requirements on biometric identifiers derived from a face photo — may apply to this app's face-shape/skin-tone analysis regardless of general GDPR compliance | Counsel review of whether BIPA (and similar state laws, e.g. Texas CUBI, Washington's biometric law) applies to this app's specific data flows, and if so what a compliant consent/retention flow looks like for Illinois (and other BIPA-style-state) users | Blocks any US launch decision that doesn't explicitly exclude/handle Illinois and similar states; does not block quarantine/CSAM architecture work |
| EU/UK minor profiling requirements | GDPR restricts profiling of children more tightly than adults in some contexts; §13.5's style/niche personalization and any recommendation ranking could qualify as profiling | Counsel review of GDPR Art. 22 / ICO guidance on children's data and automated decision-making/profiling, as applied to the `13_17` cohort specifically | Blocks finalizing `profilingAllowed` defaults in §1's policy config for `13_17` + EU/UK; does not block the architecture itself, which is designed to hold either answer |
| Promotional/paid-placement recommendation restrictions for minors | Several jurisdictions restrict targeted/commercial content to minors more than to adults; §13.6's "Promoted" paid-placement tier may need to be suppressed or altered for the `13_17` cohort | Counsel review, likely combined with the profiling question above | Blocks finalizing `promotionalPlacementEligible` defaults for `13_17`; does not block the architecture |
| Launch jurisdictions (final list) | Everything in §1's jurisdiction axis and §7's other rows is scoped by which jurisdictions actually launch — expanding beyond US + EU/UK changes the regime-lookup config, potentially non-trivially (e.g. entering a jurisdiction with its own biometric or minors law) | Business decision, informed by all the legal rows above | Blocks nothing in the architecture itself (designed to add jurisdictions as config), but blocks finalizing the regime-lookup table's actual contents |
| CSAM vendor selection | §3's abstraction is vendor-agnostic by design, but no scanning can actually run without picking one | Vendor evaluation (features, sync vs. async model, hash-database coverage, jurisdictional availability) — a product/engineering evaluation, not purely legal, but often gated by legal review of the vendor's own terms | Blocks §8 item 7 (vendor integration) specifically; does not block items 1-6 |
| Vendor pricing/approval | Even a technically-fitting vendor may require contract/procurement approval and budget sign-off | Business decision once a shortlist exists from the evaluation above | Blocks §8 item 7; does not block earlier items |
| Reporting obligations (which authority, what trigger, what timeline) | §4's `reporting_required`/`reported` states are named but not mechanized — what actually has to happen legally on a confirmed match | Counsel review, per operating jurisdiction — e.g. NCMEC reporting obligations for US-facing services, and equivalent bodies for other launch jurisdictions | Blocks implementing any part of §4 beyond the state names; does not block §2/§3's quarantine and vendor-abstraction work, which is designed to route into §4 without needing to know its internals yet |
| Retention/preservation requirements for compliance-hold material | §5 flags a direct tension between GDPR erasure rights and preservation duties on the same object — the actual retention duration and legal basis for preservation isn't decided | Counsel review, likely jurisdiction-specific | Blocks finalizing §5's compliance-hold retention row and §2's "user deletion request" hold-check exact behavior; does not block building the hold-check mechanism itself, which just needs to exist and default to "refuse" until told otherwise |

---

## 8. Recommended implementation sequence

Ordered so that everything buildable without a legal answer or a vendor contract gets built
first, and nothing later in the list is a prerequisite for anything earlier in it.

1. **Vendor-independent architecture** — define the `SafetyProvider` interface (§3) and the
   intake-record concept (§2) in code, with no real vendor behind it yet (a stub/no-op
   implementation is enough to unblock the pipeline shape).
2. **Quarantine storage boundary** — add the quarantine bucket and its restrictive policies;
   change the upload path (`scan-api.ts` and the corresponding storage migration) so photos
   land there first, not in `scan-photos` directly.
3. **Safety workflow** — wire the intake-record state machine (§2's table) end to end using the
   stub `SafetyProvider`, including the promotion step into approved storage on a `clean`
   verdict, and the compliance-hold routing (§4's state names, still with no reporting
   mechanism behind them) on a `csam_match`/`suspected_csam` stub outcome.
4. **Deletion/lifecycle** — extend `delete-scan`/`delete-account` with the hold-check step
   (§2, §5), and add the abandoned-upload TTL cleanup job, before any real vendor is in the
   loop — this is the highest-consequence piece to get wrong (an erasure request must never
   silently fail to check a hold, and a hold must never silently fail to protect an object) and
   is worth hardening on stub data first.
5. **Age/jurisdiction hooks** — add the `age_cohort`/policy-resolution scaffolding from §1
   (the pure function, the config-table shape), wired to existing `profilingAllowed`/
   `promotionalPlacementEligible` call sites, with the actual per-cohort/jurisdiction answers
   left as placeholders pending §7.
6. **Provider evaluation** — evaluate real CSAM/safety vendors against the `SafetyProvider`
   interface shape already built, informed by which vendors actually fit (sync vs. async model,
   jurisdictional coverage, pricing) — this is now a much smaller decision because the
   interface it has to satisfy already exists and is proven out end-to-end against a stub.
7. **Vendor integration** — implement the chosen vendor behind `SafetyProvider`, including
   webhook handling and the reconciliation job if the vendor is async (§2's webhook-failure
   case).
8. **Jurisdiction-specific rules** — fill in §1's policy config and §4's actual reporting
   mechanism once §7's legal answers land — by this point it's a config/data change against
   already-built scaffolding, not new architecture.
9. **Mobile UX** — build the "photo pending safety check" state (§6) and any user-facing
   consent/notice screens the §7 answers require, now that the backend states they need to
   reflect actually exist.
10. **Beauty recommendation/product engine** — resume/continue §13.3-§13.6 feature work (scores,
    plan, style system, product engine) against a pipeline that now genuinely enforces "no
    unscanned photo reaches AI analysis," rather than the current pipeline where that's true
    only by assumption.

### Bottom line

- **BUILD NOW:** items 1-5 above (vendor-independent architecture, quarantine boundary, safety
  workflow with a stub provider, deletion/lifecycle hardening, age/jurisdiction scaffolding).
  None of it requires a vendor contract or a legal answer — it's the structural work that makes
  every later step safer and cheaper.
- **WAIT FOR LEGAL:** item 8 (jurisdiction-specific rules — §7's parental-consent/notice,
  BIPA, EU/UK profiling, and reporting-obligation questions) and the launch-jurisdiction
  decision that scopes it.
- **WAIT FOR VENDOR:** item 7 (vendor integration itself) — item 6 (evaluation) can start
  early since it doesn't require a signed contract, but integration work waits on a selected,
  contracted vendor.
- **WAIT FOR API KEYS:** nothing in this document is gated on API keys specifically — that
  gate applies to the unrelated, already-flagged Claude-vs-GPT-4V `eval/` comparison
  (PROJECT_CONTEXT.md §17 item 9), not to any part of the safety/privacy architecture above.
