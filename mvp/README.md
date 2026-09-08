# Glow — Beauty/Glow-Up MVP (Prototype)

A standalone, throwaway prototype of the LooksMax product idea, built to test the core loop with
real users: **selfie → AI analysis → scores → personalized glow-up plan.**

This is **not** the production app. The production app lives in `mobile/`, `dashboard/`,
`supabase/`, and `eval/` at the repo root, and this directory does not import from or modify any
of it. Everything here is self-contained under `mvp/`.

## What this is

A mobile-first single-page web app (Vite + React + TypeScript + Tailwind v4) that walks a user
through:

Welcome → onboarding (age, goals, style) → selfie upload → AI analysis (staged loading) →
results (overall score, category scores, top opportunities) → category detail pages → a
prioritized glow-up plan → mock product recommendations → progress/history → a premium mockup.

It runs entirely in the browser. There is no backend server, no database, and no Supabase
connection — state lives in `localStorage` on the device.

## How to run it

```
cd mvp
npm install
npm run dev
```

Open the printed local URL (e.g. `http://localhost:5173`) in a phone-width browser window, or
open dev tools and toggle device emulation — the UI is designed mobile-first and centers itself
in a phone-width column on wider screens.

```
npm run build     # production build (also runs tsc -b)
npx tsc -b        # type-check only
```

There is no test runner configured (matches the rest of this repo's MVP-stage tooling).

## Demo mode (no API key required)

By default, `VITE_OPENAI_API_KEY` is unset, so the app runs against `MockAnalysisProvider`
(`src/ai/mock-provider.ts`) — it produces realistic, varied, encouraging analysis output flavored
by the user's stated goals/style, entirely client-side, with zero API spend. The analyzing screen
shows a small "Demo mode — no API key configured" label so this is never ambiguous.

The full app — onboarding, upload, analysis, results, plan, products, progress, premium mockup —
works completely in this mode. This is the mode you'd hand to test users by default.

## Using live AI analysis (OpenAI)

```
cp .env.example .env.local
# then edit .env.local and set VITE_OPENAI_API_KEY=sk-...
npm run dev
```

With a key set, `getAnalysisProvider()` (`src/ai/provider.ts`) switches to
`OpenAIAnalysisProvider` (`src/ai/openai-provider.ts`), which sends the selfie + onboarding
profile to OpenAI's `gpt-4o-mini` (configurable via `VITE_OPENAI_MODEL`) using a strict JSON
schema response format, so the model returns the exact same `AnalysisResult` shape the mock
provider produces. The UI never knows or cares which provider is active.

**Known limitation:** this calls the OpenAI API directly from the browser with a key read from
`import.meta.env`, which is fine for local prototyping but exposes the key to anyone who opens
devtools. Do not ship this pattern — the production pipeline
(`supabase/functions/analyze-scan/index.ts`) proxies the equivalent call through a Supabase Edge
Function with a server-side key for exactly this reason. If this prototype needs to be shared
with outside testers using a real key, put a thin server-side proxy in front of it first.

## Architecture

```
src/
  app/            router + root error boundary
  screens/        one component per screen (onboarding/, plus top-level screens)
  components/     shared UI: ui/ primitives (Button, Card, ScoreRing, Chip...) + ProductCard
  navigation/     bottom tab bar, tab layout, route path constants
  ai/             provider abstraction — see below
  data/           mock product catalog
  storage/        localStorage-backed zustand stores (onboarding, scan history, premium flag)
  utils/          image resizing, formatting, category metadata
```

### AI provider abstraction

```
AnalysisProvider (interface, src/ai/provider.ts)
    ├── MockAnalysisProvider   (src/ai/mock-provider.ts)  — active with no API key
    └── OpenAIAnalysisProvider (src/ai/openai-provider.ts) — active when VITE_OPENAI_API_KEY is set
```

`getAnalysisProvider()` is the only place that decides which implementation is active; screens
import that function and never a concrete class. Adding a Claude provider later means adding
`src/ai/claude-provider.ts` implementing `AnalysisProvider` and one branch in `getAnalysisProvider`
— no screen changes required, mirroring the `ANALYSIS_PROVIDER` env-var swap pattern used in the
production `analyze-scan` Edge Function.

### Data storage

Everything persists to `localStorage` under a `glow_mvp_` prefix (`src/storage/local-store.ts`):
onboarding profile, scan history (capped at the 12 most recent scans, photos resized/compressed
to keep well under the ~5MB quota), and the premium-unlocked flag. There is no server-side
storage and nothing is written to the production Supabase project. Clearing site data resets the
prototype to a fresh install.

## What's mocked / not implemented

Per the brief, this MVP intentionally does **not** implement:

- Real payments (Stripe, App Store billing) — `src/screens/PremiumScreen.tsx` has a prototype
  "Unlock Glow-Up Pro" button that just flips a local flag.
- A real product database or affiliate integration — `src/data/mock-products.ts` is a small
  hardcoded catalog structured so a real database/API can replace it without UI changes.
- The production CSAM/quarantine safety pipeline, jurisdictional compliance engine, or parental
  consent infrastructure — the age gate in `src/screens/onboarding/AgeScreen.tsx` blocks under-13
  and branches 13-17 vs 18+ for prototype purposes only; it is not a legal/compliance
  implementation. See `docs/SAFETY_AND_PRIVACY_ARCHITECTURE.md` at the repo root for what the
  real thing looks like.
- Facial recognition, biometric identity profiling, or medical diagnosis — explicitly out of
  scope and not present anywhere in this code. The AI system prompt (`src/ai/openai-provider.ts`)
  and the mock content bank both enforce the supportive-consultant tone and non-medical framing
  described in the product spec (`PROJECT_CONTEXT.md` §7, §13.2).
- Push notifications, referrals, social sharing, an admin dashboard, or analytics.

## How this differs from the production app

| | Production (`mobile/`, `supabase/`) | This MVP (`mvp/`) |
|---|---|---|
| Platform | Expo/React Native app | Vite + React web SPA |
| Backend | Supabase (Postgres, RLS, Edge Functions) | None — client-only, `localStorage` |
| Auth | Supabase Auth | None |
| AI call | Server-side Edge Function, provider abstracted via `ANALYSIS_PROVIDER` env var | Client-side call, provider abstracted via `getAnalysisProvider()` |
| Safety pipeline | Content-safety check, blocklist backstop, score rescale (`_shared/pipeline.ts`) | None — prototype only, not safety-critical infrastructure |
| Payments | Not yet built | Not built; mockup success state only |
| Data persistence | Postgres, RLS-scoped per user | `localStorage`, single device, single "user" |

This MVP shares the product *idea*, tone, and general screen flow with the confirmed spec in
`PROJECT_CONTEXT.md`, but every line of code here is new — nothing is imported from `mobile/`,
`dashboard/`, `supabase/`, or `eval/`.
