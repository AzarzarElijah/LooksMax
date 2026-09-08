# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

LooksMax is an AI beauty/style coaching app: a user takes a guided selfie, an LLM analyzes
hair/brows/skin/makeup, and returns scores + a personalized recommendation plan. The full product
spec, guardrails, and decision history live in `PROJECT_CONTEXT.md` at the repo root — read it
before making any product or architecture decision. It documents a strict 10-step process the
user wants followed (vision → features → feature detail → architecture → data model → AI design →
backend/frontend/APIs → build plan → build); §19 is the current build plan and phase order, and
its numbered sections (§13.x for feature specs, §16 for the data model, §17 for the AI pipeline
design) are the canonical reference for *why* the code is shaped the way it is. Don't skip ahead
of the currently-confirmed step or make unilateral tech decisions — flag them instead, per the
process the user has set.

The repo is four independent projects sharing one Supabase backend:

- `mobile/` — the Expo/React Native app (the actual product)
- `dashboard/` — a separate Next.js web app for the creator/affiliate dashboard (§13.7)
- `supabase/` — Postgres migrations, RLS policies, and Edge Functions (Deno) — the shared backend
- `eval/` — a one-off, standalone Node/TS script comparing Claude vs. GPT-4V on the analysis
  pipeline (§17 item 9); not part of the shipped app, has never been run against real API keys

## Commands

### mobile/ (Expo/React Native)
```
cd mobile
npm install
npx expo start          # dev server
npx tsc --noEmit -p tsconfig.json   # type-check (no separate build step)
npx expo lint            # ESLint
```
No test runner is configured yet.

### dashboard/ (Next.js)
```
cd dashboard
npm install
npm run dev       # dev server
npm run build     # production build
npm run lint      # ESLint
```

### eval/ (provider comparison harness)
```
cd eval
npm install
cp .env.example .env   # fill in ANTHROPIC_API_KEY / OPENAI_API_KEY first
npm run eval            # runs src/run-eval.ts against eval/test-photos, writes eval/results/
```

### supabase/functions/ (Edge Functions, Deno)
```
supabase/functions/_shared/*.test.ts   # Deno.test files (rescale, blocklist, tier-gating, validate, pipeline)
```
Run with `deno test --allow-env --allow-net _shared/` from `supabase/functions/` (task is
declared in `supabase/functions/deno.json`), or `supabase functions serve` to run locally. Neither
the Deno CLI nor the Supabase CLI is currently installed in this environment — verify
availability before assuming these commands work.

### Database
Migrations live in `supabase/migrations/`, applied in filename (timestamp) order via
`supabase db push` / `supabase migration up`. There is no seed script.

## Architecture

**Backend split (Supabase):** direct client-to-Supabase (via `@supabase/supabase-js` + RLS) for
plain CRUD the client can be trusted with — reading a user's own scans/history/consents, browsing
`styles`/`products`. Anything needing a secret key or cross-user business logic is a Supabase Edge
Function using the service-role key, which bypasses RLS entirely. Most tables intentionally have
*no* client-side INSERT/UPDATE policy (see `supabase/migrations/20260906000100_rls_policies.sql`)
— writes to `scans`, `scan_category_scores`, `recommendations`, and `users.subscription_tier`/
`bonus_rescans_remaining` only happen from Edge Functions. The exception is `consents`, which the
client inserts directly (own-row RLS policy), and `public.users` itself, which has no client
INSERT policy at all — that row is created by a Postgres trigger
(`supabase/migrations/20260906000400_handle_new_user_trigger.sql`) reading
birthdate/region out of the Supabase Auth signup metadata, not by application code.

**The `analyze-scan` pipeline** (`supabase/functions/analyze-scan/index.ts` +
`supabase/functions/_shared/`) is the core of the product. It's deliberately split into two
layers:
- `_shared/pipeline.ts` is a standalone, DB/HTTP-free function: content-safety check → LLM call →
  structured-output validation → medical-term blocklist backstop (one retry on failure) → score
  rescale (floor-to-100 mapping so no score is ever shown below the safety floor). This is the
  piece with automated tests, because it's the safety-critical part.
- `analyze-scan/index.ts` wraps that pipeline with the HTTP handler: verifies the caller's JWT,
  checks free/paid scan eligibility (`_shared/tier-gating.ts`), downloads the photo from Storage,
  runs the pipeline, writes the DB rows, handles referral-credit crediting, and consumes a
  bonus-rescan credit on success.
- The AI provider (Claude vs. GPT-4V) is abstracted behind `_shared/providers/` — swap via the
  `ANALYSIS_PROVIDER` env var, no code change needed once `eval/` picks a winner.
- `_shared/schema.ts`, `_shared/rescale.ts`, and `_shared/blocklist.ts` are kept in step with the
  near-identical copies in `eval/src/` (the eval harness and the production pipeline must judge/
  run the exact same contract) — if you change the scoring rules, prompt, or schema in one, check
  whether the other needs the same change.
- Edge Functions run on Deno and import npm packages via `npm:pkg@exact-version` specifiers (pin
  the exact version — check `eval/package-lock.json` or `mobile/package.json` for the version
  already in use elsewhere in the repo, so the Deno and Node sides don't drift) and Deno-std via
  `jsr:` specifiers. Metro (the mobile bundler) cannot resolve these, so shared logic that both
  the Edge Function and the mobile app need (e.g. the free-tier recommendation cap) is
  **duplicated**, not imported across the boundary — see `_shared/tier-gating.ts` vs. the inline
  cap logic in `mobile/src/app/results.tsx`.

**Mobile app routing (Expo Router):** the root `mobile/src/app/_layout.tsx` renders a single
`Stack` with `Stack.Protected` guards that gate the whole app on auth + consent state:
uninitialized → `loading`, no session → `sign-in`/`sign-up`, session but missing a current-version
consent → `consent`, otherwise → the `(tabs)` group plus the full-screen `capture`/`confirm`/
`results`/`disclosures` routes. Auth state lives in `store/auth-store.ts` (a Zustand store synced
to `supabase.auth.onAuthStateChange`, not polled); consent state is a TanStack Query hook
(`hooks/use-consent-status.ts`) reading the versioned `consents` table — bump
`BIOMETRIC_CONSENT_VERSION`/`BLANKET_DISCLOSURE_VERSION` there (and in the matching DB rows'
expectations) when the acknowledged wording changes, which re-gates existing users automatically.
The in-progress scan (captured photo + makeup answer) is held in `store/scan-store.ts`, a second
small Zustand store scoped to just that flow, reset once results are shown.

**Data model:** see `PROJECT_CONTEXT.md` §16 for the full entity list and the reasoning behind it
(e.g. `categories` is a lookup table, not an enum, so v2 categories are new rows not a migration;
account deletion hard-deletes personal data but keeps creator commission ledger rows with the user
reference nulled out).
