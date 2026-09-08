# Project Context: Stacylite — AI Beauty & Skincare Coach

This document is the complete context for this project. Read it fully before we start planning or building anything. Do not make technical decisions or write code yet — this is the shared understanding we'll build everything on top of.

---

## 1. The Core Idea

An app where a user uploads a selfie and receives a personalized, AI-generated plan for how to look and feel their best — covering hair, brows, skin, and makeup. The app is **not** a "rating" app that scores or judges appearance. It's a **positive-framed coaching tool**: instead of telling a user what's wrong with her, it tells her what would look great *on her* — a hairstyle suited to her face shape, a brow shape that complements her features, a skincare routine suited to her skin type.

The inspiration: users are already doing an informal version of this by uploading selfies to ChatGPT and asking "what would look best on me." This app is a purpose-built, polished version of that behavior, with better UX, saved history, curated product recommendations, and a business model behind it.

**One-line pitch:** "Upload a selfie, get a personalized plan for how to look your best."

## 2. Target Users

- Girls/women only (see §11 amendment, 2026-09-05) — interested in beauty, hair, skincare, and self-improvement content — the same demographic active in self-care TikTok/Instagram content.
- Likely skews younger (teens through mid-20s), which has real implications for tone, safety, and psychological impact — this must stay positive and constructive, never anxiety-inducing or comparison-driven. This is a hard requirement, not a nice-to-have.
- Users who currently do this informally via ChatGPT or ask friends "what should I do with my hair/brows/skin" — this app formalizes and improves that workflow.

## 3. Face-Scanning / Analysis System

- User takes or uploads a selfie through a guided capture flow (lighting/angle coaching to ensure good input quality).
- AI analyzes the photo across categories: **hair** (style/color suited to face shape), **brows** (shape), **skin** (tone, texture, type — health-framed, not "flaws"), **makeup** (application technique, if applicable).
- Output is a set of personalized recommendations per category, always framed as "this would suit you" / "this could enhance your look" — never as a score, grade, or "what's wrong with you."
- Explicitly NOT a rating/scoring app (this was an earlier idea considered and rejected — worth stating so Claude in Cursor doesn't default back to a scoring mechanic).

## 4. Personalized Recommendations & Plans

- Skincare routine builder based on detected skin type/concerns.
- Styling plan: haircut suggestions, brow shaping guidance, makeup techniques to try.
- Step-by-step guidance for how to achieve each recommended look.
- (Future/v2, not v1): AI-generated visual try-on — a preview image showing the user with the suggested hairstyle/brows/makeup on her actual face, likely as a slider/before-after comparison. This is deferred because it's the highest-risk, most technically demanding feature (image generation quality, realism, cost). v1 ships without it; it's planned as a strong post-launch update.

## 5. Free vs. Premium Experience

- **Important product principle:** the free/paid split must NOT work by hiding "what's wrong" behind a paywall — that would recreate the anxiety-driven mechanic we explicitly want to avoid. Instead, gate on **depth and volume**, not on withholding negative information.
- Free tier: full analysis across all categories, but lighter detail (e.g. 2-3 tips per category), limited re-scans per month.
- Paid tier: deeper personalized plan, full routine builder, unlimited re-scans/tracking, priority/more detailed product matching, (later) unlimited visual try-on generations.

## 6. Sponsorship & Monetization

- Product recommendations tied to analysis results (e.g., a specific brow gel matching a recommended brow shape).
- Sponsored products must be **clearly labeled as sponsored**, separate and visually distinct from organic/editorial recommendations, so the recommendation engine's core logic isn't perceived as (or actually) pay-to-recommend. This matters for user trust and long-term retention, and avoids the backlash similar apps have faced for feeling exploitative.
- Affiliate links on non-sponsored recommendations too, so revenue isn't solely dependent on paid sponsorship placement.
- Subscription revenue (paid tier) as the primary monetization line; sponsorship/affiliate as a secondary layer.

## 7. Marketing Strategy

- Primary channel: paid partnerships with self-care/beauty TikTok creators who demo the app on themselves.
- Creator/affiliate dashboard planned as a feature so partners can track referrals (trackable codes/links, possibly commission-based).
- Referral incentives for regular users too (e.g., free premium scan credits for invites).

## 8. Scope Philosophy — Important

This context describes the **starting point**, not the full app. The intent is for this app to grow into a much larger product over time, with more features added in future updates beyond what's listed here (visual try-on being the first known one). When we define features and architecture, they should be built with **extensibility in mind** — don't over-optimize for a fixed, narrow scope, since new feature categories will be added later. Flag decisions that would make future extension harder.

## 9. Explicit Non-Goals / Guardrails

- This is not a "rate my face" or looksmaxxing-style app. No numeric scores, no grades, no "flaws" framing.
- Sponsored content must never be indistinguishable from genuine recommendations.
- Given the likely younger user base, avoid any mechanic that could reasonably encourage comparison anxiety, disordered behavior, or excessive self-scrutiny (e.g. no public leaderboards, no "before/after" shaming loops, no daily nagging to rescan).

## 10. Platform & Process

- Both iOS and Android from the start (cross-platform).
- v1 excludes AI visual try-on (planned for a post-launch update).
- Working process for this project, in order:
  1. Context file (this document)
  2. Full vision walkthrough with Claude
  3. Define all general features
  4. Detail every feature (inputs, AI behavior, user-facing output, free vs. paid split)
  5. Complete architecture design
  6. Database and data model design
  7. AI/analysis system design
  8. Backend, frontend, APIs, integrations
  9. Complete build plan
  10. Start building

**Status (2026-09-05):** Steps 1-9 are all done — see §13 (step 4), §15 (step 5), §16 (step 6), §17 (step 7), §18 (step 8), §19 (step 9, the phased build plan). **Step 10 — start building — is next.** Two items remain open, each already noted as a blocker on its specific build phase in §19 rather than blocking everything: §13.11's 13-17 consent legal question (blocks Phase 7) and §17's Claude-vs-GPT-4V hands-on test (blocks the start of Phase 1, so it should be the very first thing done in step 10).

---

## 11. Amendments Made During Planning (2026-09-04)

These decisions were made during the step 2 vision walkthrough and **supersede** the conflicting statements above where noted. Original sections are left intact above for history; this section is authoritative where it conflicts.

**Age & region (new):**
- Minimum age 13, no under-13 accounts.
- v1 launch geography: US + EU/UK. GDPR biometric-data rules (explicit consent, right to erasure, data residency) are in scope from v1.

**Numeric scores (reverses Section 3 / Section 9's "no numeric scores"):**
- The app WILL include a numeric score (e.g. "82") alongside a "potential score after recommendations" (e.g. "91"), to make improvement feel motivating and concrete.
- Safety-first design is required to keep this consistent with the spirit of the original guardrail: high floor so no user ever sees a discouraging number (e.g. never below ~70-75), whole numbers only (no clinical decimals), always shown paired with a specific positive recommendation, no cross-user comparison or leaderboards, no visible "you used to be lower" history shaming. Exact mechanics to be finalized at step 4.

**Sponsorship & disclosure (revises Section 6 / Section 9's "must never be indistinguishable"):**
- Two-tier model: (1) baseline recommendations are affiliate-monetized but selected purely on genuine fit — light, general/blanket disclosure only (e.g. settings/about page), no per-item tag required; (2) paid preferential placement is also allowed (a brand pays to rank above what the algorithm would otherwise pick) — these specific items require a small, unobtrusive inline disclosure tag (e.g. "Promoted"), per FTC (US) and UCPD/Omnibus (EU/UK) requirements. No separate/segregated "sponsored" section in either case — both live in the normal recommendation list.
- Sponsorship must never cause an irrelevant or poor-fit product to be recommended outright (baseline tier); paid placement may reorder among relevant options but the underlying recommendation logic itself is not for sale to off-topic products.

**Category scope (expands Section 3):**
- Analysis and recommendations expand beyond hair/brows/skin/makeup to include adornment/style categories: nails, jewelry/piercings/accessories, and clothing/style direction.
- Explicitly OUT of scope for now: body shape/proportion analysis or recommendations. This is a deliberate guardrail to avoid expanding body-image risk for a 13+ user base. Revisit only with a dedicated safety discussion.
- Product recommendations correspondingly expand beyond skincare/makeup to anything that completes a recommended look (hair products, nail products, jewelry/accessories, etc.).
- **Revised at step 4 (2026-09-04):** nails, jewelry/piercings/accessories, and clothing/style direction all moved to v2. Reason: the v1 input is a face-only guided selfie, which doesn't show hands/nails, most jewelry, or clothing — these categories need a different capture mechanism (e.g. an optional body/hand photo) that v1 deliberately doesn't add, to keep the capture flow short. v1 analysis scope is hair, brows, skin, makeup only. Revisit category scope once a body-visible input source exists.

**Style/niche system (new feature, expands Section 4):**
- Two-directional system:
  1. **"I want this aesthetic"** — user picks a target style/niche (e.g. Goth), app personalizes how to achieve it well on her specific features (hair, makeup, brows, nails, accessories, style direction, products) rather than generic guidance.
  2. **"What suits me?"** — AI analyzes her and suggests which aesthetics/niches would likely complement her best, with the same personalized depth.

**Target users are women/girls only (amends Section 2, confirmed 2026-09-05):** this is not a general/gender-neutral app — no men's-specific analysis, recommendations, aesthetics, or product categories need to be designed or supported anywhere in the product (capture flow, analysis categories, style/niche taxonomy, product catalog). Simplifies scope everywhere from here on — flag if any future feature idea implicitly assumes a general-audience/male user.

**Skin-tone-aware recommendations (new cross-cutting guardrail, confirmed 2026-09-05):** any recommendation that has a color/shade dimension (hair color, makeup shades, eventually clothing/accessory color once those ship in v2) must be filtered/weighted by the user's detected skin tone, not decided on face shape or aesthetic fit alone. Reason: a recommendation that's a great match for face shape or a chosen aesthetic but a poor match for skin tone (e.g. suggesting platinum blonde hair dye for a deep skin tone without accounting for undertone/contrast) is a real quality failure, not just a stylistic quibble. This affects: §13.2's hair color analysis (must factor in detected skin tone, not just face shape), §13.4's plan content, §13.5's style/niche system (an aesthetic's typical color palette must be adapted to skin tone, not applied generically), and §13.6's product engine (already included skin-tone matching for product selection — this guardrail generalizes that same requirement to the recommendation content itself, not just the product picks). Full mechanics (e.g. how skin tone is categorized/detected) belong in the AI/analysis system design at step 7.

## 12. Step 3 Deliverable: General Feature List (confirmed 2026-09-04)

No onboarding/style quiz — recommendations are driven by the photo (and later, style/niche selection), not a separate questionnaire. Creator/affiliate dashboard is a v1 feature, not deferred.

**Core loop:** guided selfie capture; AI face & style analysis (hair, brows, skin, makeup — nails/jewelry/accessories/clothing moved to v2, see §11 revision); score & potential score; personalized recommendation plan; step-by-step how-to guidance.

**Style/niche system:** "I want this look" mode; "What suits me" mode.

**Product & monetization:** product recommendation engine (affiliate + promoted); creator/affiliate dashboard (v1); referral program.

**Account & progression:** history/progress tracking (non-shaming framing); free vs. premium tiers.

**Trust & safety layer:** disclosure system (blanket + inline "Promoted" tags); age gate & consent flow (13+, region-aware biometric consent).

Next: step 4 — detail each feature (inputs, AI behavior, user-facing output, free vs. paid split).

---

## 13. Step 4 Deliverable: Feature Details (in progress, started 2026-09-04)

### 13.1 Camera-Guided Selfie Capture (confirmed 2026-09-04)

**Inputs:**
- Live front-facing camera feed (primary/default path).
- Gallery upload also allowed as a fallback path (camera-first, not camera-only).
- Single front-facing shot only — no side-profile capture step.
- Output of this feature: one accepted photo file, handed off to the AI analysis feature.

**AI/system behavior during capture:**
- Real-time on-device guidance only (face-outline target, "move closer/further," "center your face," "more light needed," "hold still" for blur) — this is lightweight capture-quality coaching, not the deep hair/skin/brow analysis, which is a separate downstream feature.
- Pass/fail quality gate before a live-camera photo is accepted (blur, lighting, face fully in frame).
- A gallery-uploaded photo skips live coaching but still runs the same quality check retroactively before being accepted; if it fails, user is prompted to retake/reselect.

**User-facing output:**
- Live coaching prompts during camera capture.
- Confirm/retake screen after capture (or after a gallery upload fails/passes quality check).
- Hands off to the analysis pipeline (next feature to detail).
- Accepted photo is retained and viewable in the user's history alongside the scores/plan it produced (not discarded after analysis) — supports visual progress tracking. Note: this means biometric image retention is in scope for GDPR erasure/consent handling (per existing age/region guardrails), not just derived results.

**Free vs. paid split:**
- No gating at capture itself (camera guidance, gallery upload, quality gate all identical on free and paid) — gating applies at the analysis/history/rescan-volume level instead, consistent with the "gate on depth/volume, not access" guardrail.

Next: detail the AI face & style analysis feature (hair/brows/skin/makeup/nails/accessories).

### 13.2 AI Face & Style Analysis (confirmed 2026-09-04)

**v1 category scope:** hair, brows, skin, makeup only. Nails, jewelry/piercings/accessories, and clothing/style direction are deferred to v2 (see §11 revision) — the face-only selfie doesn't show hands, most jewelry, or clothing, and v1 deliberately keeps the capture flow to a single shot.

**Inputs:**
- The accepted selfie photo from the capture feature (§13.1).
- A direct user answer to "are you wearing makeup right now?" (bare-faced vs. makeup-on), asked explicitly rather than inferred by the AI — feeds the makeup category and helps the AI correctly interpret skin tone/texture instead of misreading foundation as bare skin.
- The user's style/niche selection ("I want this look" vs. "what suits me") is a separate feature to be detailed later in step 4 — not decided here whether/how it feeds this analysis pass.

**AI behavior:**
- Runs one analysis pass across four categories per photo:
  - **Hair:** style recommendations suited to face shape; color recommendations suited to *both* face shape and detected skin tone (see §11's skin-tone-aware recommendations guardrail, 2026-09-05) — never a color suggestion based on face shape/aesthetic alone.
  - **Brows:** shape recommendations suited to face features.
  - **Skin:** cosmetic-level only — type, texture, tone, radiance/dullness. Explicitly does not name, diagnose, or flag medical-looking conditions (acne, rosacea-like redness, eczema, etc.) — stays silent on anything that would cross into dermatological territory, to avoid diagnosis/liability risk. (No "gentle nudge to see a dermatologist" language either — full silence on medical-looking traits, not a softened mention.)
  - **Makeup:** application-technique feedback, only run if the user indicated makeup is on; skipped/not applicable if bare-faced.
- Produces both an overall score and per-category sub-scores (hair, brows, skin, makeup), each paired with its own potential-score-after-recommendations. Per-category granularity means each sub-score independently needs the existing safety-first floor (never below ~70-75, whole numbers only, always paired with a specific positive recommendation) — this applies per category, not just to the overall number.

**User-facing output:**
- Overall score + overall potential score.
- Per-category sub-scores + sub-potential-scores (hair, brows, skin, makeup).
- Per-category recommendation content feeding into the personalized plan (next feature to detail covers the plan/recommendation output itself in depth).

**Free vs. paid split:**
- Scores (overall + per-category) and potential scores are shown on both free and paid — consistent with the guardrail that gating is on depth/volume, not on withholding information.
- Depth of the accompanying recommendations (number of tips per category, routine detail) is where free vs. paid differs — to be finalized when the recommendation plan feature is detailed next.

Next: detail the score & potential score presentation and the personalized recommendation plan feature.

### 13.3 Score & Potential Score Presentation (confirmed 2026-09-05)

**Inputs:** the overall + per-category scores and potential scores produced by the analysis feature (§13.2).

**AI/system behavior:**
- Score and potential score shown together, per category and overall (e.g. "82 → 91"), never the current score alone — the delta is always visible without extra taps.
- Potential score is a *ceiling contingent on following the recommendations shown*, not a countdown/decaying value — no urgency or scarcity mechanic, consistent with the no-anxiety guardrail.
- The ceiling is fixed regardless of style/niche selection (§13.5) — picking a style changes recommendation *content*, not the score math. Keeps scores from feeling arbitrary or gameable by switching styles.
- The potential score only becomes the new current score after a new photo re-scan — no self-reported "mark as done" recompute. Keeps scores tied to photo evidence, not unverified self-report.
- No score-over-time trend view anywhere in the app (including history, §14.7) — fully avoids a "before/after" shaming-loop mechanic. History retains past photos/plans, never a score trend chart.

**User-facing output:**
- Score/potential-score pair shown per category and overall, wherever scores appear.
- No trend/graph of past scores.
- Visual treatment (ring/bar/plain number) is a UI-design decision, deferred to the actual UI design pass (step 5+), not decided here.

**Free vs. paid split:** none — same on both tiers (already confirmed in §13.2).

Next: detail the personalized recommendation plan feature.

### 13.4 Personalized Recommendation Plan / Step-by-Step Guidance (confirmed 2026-09-05)

**Inputs:** per-category recommendation content from the analysis pass (§13.2); free vs. paid tier status; style/niche selection (§14.3 — plan/style interaction still open, see that section).

**AI/system behavior:**
- For each category (hair, brows, skin, makeup), the analysis produces a ranked list of recommendations; this feature turns that list into actionable guidance — not just "get a blunt fringe" but a short how-to (what to ask a stylist for, how to apply, what product type to use).
- Free tier shows the top 2 tips per category; paid tier shows the full list plus deeper how-to detail (step-by-step technique breakdowns, routine sequencing for skin/makeup).
- How-to content is first-party AI-generated text/diagrams only for v1 — no linked creator or user-generated video content, to avoid content-moderation and licensing overhead. Creator content is a possible later add-on.
- The plan is static per scan — regenerated fresh on each new scan, with no feedback loop that reshapes it based on "didn't like this" input. Adaptive plans are a possible v2 feature.
- Recommendations link out to the product recommendation engine (§14.4) where a physical product would help (e.g. a specific brow gel).

**User-facing output:**
- A per-category plan screen: recommendation → short rationale ("suits your face shape because...") → how-to steps → linked product(s) if applicable.
- A persistent "your plan" home view aggregating all categories, likely the main post-scan landing screen.

**Free vs. paid split:** free tier capped at top 2 tips per category; paid tier gets the full recommendation list plus deeper how-to detail.

Next: detail the style/niche system.

### 13.5 Style/Niche System (confirmed 2026-09-05)

**Inputs:** either (a) a user-picked target aesthetic from a curated list ("I want to look Goth"), or (b) a request for AI-suggested aesthetics based on the analysis (§13.2) — the two-directional modes from §11.

**AI/system behavior:**
- Curated, fixed aesthetic/niche list (not open-ended free-text) — keeps recommendation quality controllable and reference imagery curatable, at the cost of not covering every possible style someone might type in.
- Mode 1 ("I want this look"): user selects from the curated list; AI regenerates the full recommendation plan (§13.4) for that style, filtered/weighted toward achieving that aesthetic well *on her specific features* rather than generic style guidance. One active plan at a time — selecting a style replaces the base plan rather than layering an alternate view alongside it.
- Mode 2 ("What suits me"): AI ranks a shortlist of aesthetics from the curated list against her analysis results and presents top matches with rationale. Re-runs on every new scan, consistent with scores (§13.3) and the plan (§13.4) also regenerating per scan.
- The score/potential score ceiling stays fixed regardless of style chosen (already confirmed in §13.3) — style changes recommendation content only, never the score math.

**User-facing output:**
- A style/niche picker screen (curated list with reference imagery per aesthetic).
- Style-regenerated version of the recommendation plan when Mode 1 is used.
- A ranked "aesthetics that suit you" results screen for Mode 2.

**Free vs. paid split:** free — available on both tiers, since it's a likely engagement/shareability driver for the creator-marketing strategy (§7), not a premium differentiator.

Next: detail the product recommendation engine.

### 13.6 Product Recommendation Engine — Affiliate + Promoted (confirmed 2026-09-05)

**Inputs:** per-category recommendation content (§13.4) that implies a product category (e.g. "brow gel," "tinted moisturizer"); catalog of affiliate/partner products sourced from an affiliate network feed (e.g. Amazon Associates, ShopMy, RewardStyle/LTK); any active paid-promotion placements.

**AI/system behavior:**
- For each recommendation that maps to a product type, the engine selects candidate products from the catalog and ranks by genuine fit (skin type/tone match, category match, price band) for the baseline affiliate tier.
- Paid placement can re-rank a sponsoring brand's product upward among already-relevant candidates (per §11's rule: cannot inject off-topic/poor-fit products) and attaches the inline "Promoted" tag.
- Catalog excludes body-modification-adjacent categories (e.g. weight-loss/dieting, skin-lightening products) as a guardrail consistent with §9/§11's body-image protections, even though this feature's normal scope (hair/brow/skin/makeup products) wouldn't naturally include those anyway.
- Catalog sourced via an affiliate network feed rather than fully manual curation — fastest path to real coverage; feed metadata quality is a dependency to validate once a specific network is chosen (step 8+).

**User-facing output:**
- Inline product cards attached to relevant recommendation steps in the plan (§13.4), not a separate storefront.
- A short rationale shown with each product (e.g. "matches your skin tone"), consistent with the plan feature already showing rationale for its recommendations.
- "Promoted" tag on paid-placement items; general disclosure notice elsewhere (settings/about, per §11).

**Free vs. paid split:** available on both tiers — gating product recommendations behind paid would undercut the affiliate/promoted revenue model, which depends on broad reach.

Next: detail the creator/affiliate dashboard.

### 13.7 Creator/Affiliate Dashboard (confirmed 2026-09-05)

**Inputs:** creator's unique referral code/link; referred users' signups and conversions (paid subscriptions) attributed to that code.

**AI/system behavior:** none AI-specific — a standard affiliate-tracking dashboard feature (attribution, commission calculation).

**User-facing output:**
- Creator-facing web dashboard: referral link/code, signups, conversions, earned commission, payout status.
- An admin-facing manual approval flow for onboarding new creator partners — creators apply/are invited, and you approve each one rather than self-serve signup, keeping brand-fit control tight given the young-skewing user base.

**Commission structure:** percentage of subscription revenue generated by referred users (not a flat per-signup fee), so creator incentive aligns with driving retained, paying users rather than just raw signups. Exact percentage is a business/pricing decision to finalize later (step 6+ territory once pricing itself is set).

**Timing:** a v1 launch-day requirement, not deferred — the creator-partnership marketing strategy (§7) depends on this existing before creators can be onboarded.

**Free vs. paid split:** not applicable — this is a separate creator-facing surface, not a user tier.

Next: detail the referral program (regular users).

### 13.8 Referral Program — Regular Users (confirmed 2026-09-05)

**Inputs:** user's referral code/link; invitee signup and first-scan events.

**AI/system behavior:** none — straightforward referral tracking, similar mechanics to the creator dashboard (§13.7) but for regular users with non-monetary rewards.

**Reward structure:**
- Two-sided: both inviter and invitee receive one free premium re-scan credit.
- Anti-abuse gate: the inviter's credit only fires once the invitee has completed their first scan, not merely on account signup — prevents reward farming via empty/fake accounts.

**User-facing output:** referral code/share sheet; a simple "X friends joined, Y credits earned" status view; credited scans applied automatically once earned.

**Free vs. paid split:** the reward *is* premium access (re-scan credits) — the mechanic exists specifically to let free users earn paid-tier value.

Next: detail history/progress tracking.

### 13.9 History / Progress Tracking (confirmed 2026-09-05)

**Inputs:** all past accepted selfies (§13.1, retained per the earlier note on biometric storage) and their associated scores/plans over time.

**AI/system behavior:** none beyond storing and retrieving past scan results; no AI comparison/judgment between scans. No score-over-time trend or chart anywhere (already confirmed in §13.3) — history is a photo+plan archive only, fully avoiding the shaming-loop risk.

**User-facing output:**
- A history view listing past scans with date, photo thumbnail, and that scan's score/plan (no trend visualization across scans).
- Deletion controls at both levels: full account deletion (satisfies the GDPR erasure-right baseline) and per-scan deletion (lets a user remove an individual past photo/scan without deleting the whole account) — this dual-level deletion needs to be reflected in the data model at step 6.

**Free vs. paid split:**
- Free tier: last 1 scan visible in history, 1 re-scan per month.
- Paid tier: full unlimited history and unlimited re-scans.

Next: detail the disclosure system.

### 13.10 Disclosure System (confirmed 2026-09-05)

**Inputs:** none beyond the product/recommendation data already covered in §13.6; this is the UI/legal-compliance layer over it.

**AI/system behavior:** none — a compliance/UI feature, not an AI feature.

**User-facing output:**
- A one-time blanket disclosure acknowledgment shown during signup/onboarding (e.g. "this app may earn commission on recommended products," user must tap to acknowledge) — stronger legal footing than passive availability alone, and remains accessible afterward in settings/about too.
- Inline "Promoted" tag on paid-placement items specifically, shown at the point of the recommendation itself.

**Free vs. paid split:** not applicable — same on both tiers.

**Flag for pre-launch legal review (not resolved by product decision alone):** the exact disclosure wording/placement should be checked against actual current FTC (US) and UCPD/Omnibus (EU/UK) guidance before launch — this section covers the product/UX shape, not a legal sign-off.

Next: detail the age gate & consent flow.

---

## 14. (Retired) Step 4 Drafts

This section originally held solo-drafted, unconfirmed versions of §13.3–13.11, written while the user was away on 2026-09-04. All of them have since been reviewed, resolved, and folded into §13 as confirmed (2026-09-05) — see §13.3 through §13.11 above. This section is kept empty as a marker rather than renumbering everything.

### 13.11 Age Gate & Consent Flow (confirmed 2026-09-05, one item still legally open)

**Inputs:** user-entered birthdate (or age confirmation) at signup; region (for determining which consent flow applies, e.g. EU/UK GDPR vs. US).

**AI/system behavior:** none — a compliance/onboarding feature.

**User-facing output:**
- Age entry at signup; block signup if under 13.
- Biometric consent for all users: a fuller explainer screen (not just a checkbox) describing what happens to the photo (analyzed, stored, deletable) before a single explicit consent action — matches GDPR's "explicit and informed" consent bar better than a buried checkbox, and applied universally rather than only for EU/UK users for consistency.
- An accessible right-to-erasure flow, per §13.9's dual-level (account + per-scan) deletion.
- For 13-17 users specifically: some heightened consent/parental-notice flow is likely required depending on jurisdiction.

**Free vs. paid split:** not applicable.

**Still open — genuinely needs real legal research, not a product decision:** exactly what's required for the 13-17 cohort — parental consent, parental notice, or neither — and whether it differs between the US (COPPA doesn't apply above 13, but some state laws like age-appropriate design codes might) and EU/UK (GDPR Article 8 sets a "digital age of consent" that some member states set as low as 13 and others as high as 16). This item should stay open as a real pre-launch task (get actual current legal guidance) rather than being decided from general knowledge here.

---

**Step 4 status:** §13.1 through §13.11 now cover every feature from the §12 list, all confirmed except the single flagged legal item in §13.11. Per user decision (2026-09-05), that legal item is tracked in parallel rather than blocking progress — step 5 (technical architecture) starts now.

---

## 15. Step 5 Deliverable: Technical Architecture (confirmed 2026-09-05)

**Build context:** solo build (user + Claude Code, no dedicated team) — every choice below leans toward mainstream, well-documented, managed options that minimize DIY infrastructure/ops work, over more flexible but higher-maintenance custom builds.

**Confirmed:**
- **Mobile app:** React Native, built with **Expo** (implied by the EAS choice below, since EAS is Expo's build/submit service) — single JS/TS codebase for iOS + Android, large ecosystem, well-represented in AI training data (helps an AI-assisted solo build move fast).
- **Backend:** Supabase (managed Postgres + Auth + Storage + Edge Functions) — chosen over Firebase because the app's data (users, scans, per-category scores, referral credits, creator commissions) is naturally relational, and Supabase avoids the deepest Google-ecosystem lock-in.
- **AI/analysis provider:** not yet finalized — will test both Claude (Anthropic) and GPT-4V (OpenAI) on real sample selfies before choosing, per user decision. The analysis pipeline should be built with the provider abstracted behind an interface so swapping is cheap. (Full prompt/pipeline design is step 7, not here — this is just the architecture-level "which vendor, behind what interface" decision.)
- **Subscriptions/payments:** RevenueCat — wraps required Apple/Google in-app purchase APIs behind one cross-platform SDK with built-in entitlement tracking, avoiding solo-dev IAP/receipt-validation plumbing.
- **Creator/affiliate dashboard hosting:** Next.js on Vercel — separate web app from the mobile codebase, minimal-ops hosting, integrates natively with Supabase.
- **Push notifications:** Firebase Cloud Messaging, used only for push delivery (not data storage) — avoids real Firebase lock-in while using the most battle-tested push option from a React Native app.
- **Analytics:** PostHog. **Crash/error reporting:** Sentry. Both chosen over Firebase's equivalents to avoid pulling in Firebase for anything beyond push, and both have React Native SDKs and generous free tiers.
- **CI/CD and app-store release:** EAS (Expo Application Services) — cloud builds, over-the-air updates, and App Store/Play Store submission in one managed service, avoiding hand-rolled native build pipelines.
- **Media storage/CDN:** Supabase Storage — already part of the backend, and its row-level-security policies can directly enforce per-user access and the account+per-scan deletion requirements from §13.9, avoiding a second storage vendor.
- **Affiliate network:** ShopMy — purpose-built for beauty/fashion creator and app affiliate integration, closest catalog fit for a women's beauty recommendation app (vs. a more generic option like Amazon Associates).

**Step 5 status:** all major architecture decisions are made. Next: step 6, database and full data model design.

---

## 16. Step 6 Deliverable: Database & Data Model (confirmed 2026-09-05)

Postgres (via Supabase). Entities below are derived directly from the confirmed features in §13, with the three modeling decisions below folded in.

**users**
`id, email, birthdate, region (US | EU_UK), subscription_tier (free | paid, cached from RevenueCat), revenuecat_customer_id, own_referral_code (unique), referred_by_user_id (nullable FK → users), bonus_rescans_remaining (int, default 0), created_at`

**consents** (versioned, not columns on `users`, so a change in disclosure wording doesn't erase the record of what was actually agreed to)
`id, user_id (FK), consent_type (biometric | blanket_disclosure), version, region_at_time, granted_at`

**categories** (lookup table, not a fixed enum — v1 rows are just hair/brows/skin/makeup, marked `active`; v2 adds nails/jewelry/clothing here later with no schema change)
`id, name, active`

**scans**
`id, user_id (FK), photo_storage_path, makeup_on (bool), captured_at, overall_score, overall_potential_score, selected_style_id (nullable FK → styles)`
— hard-deletable row (per-scan erasure, §13.9); deleting it removes the row and its photo from Supabase Storage entirely, no soft-delete/anonymized stub.

**scan_category_scores**
`id, scan_id (FK), category_id (FK → categories), score, potential_score`

**recommendations**
`id, scan_id (FK), category_id (FK → categories), rank, title, rationale, how_to_content`
— free-tier cap (top 2, §13.4) is derived from `rank` at query time, not a stored flag.

**styles** (the curated aesthetic/niche taxonomy, §13.5)
`id, name, description, reference_image_urls, active`

**scan_style_suggestions** (Mode 2 "what suits me" output)
`id, scan_id (FK), style_id (FK), rank, rationale`

**products** (synced from the ShopMy feed, §13.6)
`id, external_id, name, brand, category_id (FK → categories), price, image_url, skin_tone_tags, affiliate_link, active`

**recommendation_products**
`id, recommendation_id (FK), product_id (FK), rank, rationale, is_promoted (bool), promotion_id (nullable FK → promotions)`

**promotions** (paid placement campaigns)
`id, product_id (FK), sponsor_name, start_date, end_date, active`

**referrals**
`id, referrer_user_id (FK), invitee_user_id (nullable FK, filled on signup), invited_at, invitee_first_scan_at (nullable — triggers the referrer's +1 to `bonus_rescans_remaining` per §13.8), reward_granted_at (nullable)`
— on account deletion, `referrer_user_id`/`invitee_user_id` are set null; the row itself is kept only as long as it's still useful for abuse-pattern history, otherwise cleaned up with the account.

**creators**
`id, name, email, referral_code (unique), commission_rate_percent, status (pending | approved | rejected), created_at`

**creator_referrals**
`id, creator_id (FK), referred_user_id (nullable FK → users), signed_up_at, subscribed_at (nullable), commission_amount (nullable), payout_status`
— on account deletion, `referred_user_id` is set null; `commission_amount` and `payout_status` are retained regardless, since the commission is owed to the creator independent of the referred user's continued existence.

**Modeling decisions applied:**
1. Categories are a lookup table, not a hard-coded enum — matches the §8 extensibility guardrail, so v2's nails/jewelry/clothing categories are just new rows, not a migration.
2. Account deletion is a true hard-delete for personal data (scans, photos, scores gone entirely, no anonymized stub) — financial/commission rows (`creator_referrals`) keep their dollar amounts but lose the user reference (nulled), consistent with "erase the person, keep the ledger."
3. Extra scan credits are a simple counter (`users.bonus_rescans_remaining`), not a ledger table — no product need yet to audit credit-source history, and it's much less to build for a solo v1.

**Step 6 status:** confirmed. Next: step 7, AI/analysis system design in detail.

---

## 17. Step 7 Deliverable: AI/Analysis System Design (confirmed 2026-09-05)

**Pipeline:**
1. Guided capture (§13.1) hands off one accepted photo, the `makeup_on` flag, and (if set) `selected_style_id`.
2. **Content-safety pre-check:** an automated moderation/abuse-detection layer (NSFW detection at minimum, ideally hash-matching against known-abuse-image databases such as Thorn's Safer) runs on every photo before it is stored or sent to the analysis API at all. This runs on every upload regardless of path (live capture or gallery), on top of — not instead of — the existing §13.1 blur/lighting/face-in-frame quality gate. Treated as close to a hard requirement given the app stores photos from users as young as 13.
3. One multimodal LLM call per scan, analyzing all four v1 categories (hair, brows, skin, makeup) in a single pass — already confirmed in §13.2.
4. The model's response is forced into a structured schema (via tool-use/function-calling or JSON-schema mode — both Claude and GPT-4V support this) rather than parsed free text, covering: overall score, per-category scores, per-category recommendations (title/rationale/how-to), and a detected skin-tone label on the **Monk Skin Tone (MST) Scale** — a 10-point scale purpose-built for fair beauty/imaging representation (used by Google Search/Photos), chosen over the older Fitzpatrick scale because Fitzpatrick was designed for dermatology/UV sun-sensitivity, not cosmetics/color matching.
5. **Score post-processing:** the model's raw 0-100 scores are never stored/shown as-is. They're rescaled into the floor-to-100 range — `displayed = floor + raw/100 × (100 - floor)`, floor = 70 — guaranteeing the §13.3 safety floor while preserving relative differences between scans/users, rather than a hard clamp that would bunch everyone near the same number.
6. **Guardrail backstop:** in addition to prompt instructions (no medical-condition framing, positive-only tone, women-only context, skin-tone-aware color recommendations per §11), the output text is scanned for a blocklist of medical/diagnostic terms (acne, rosacea, eczema, dermatologist, etc.) as a rule-based backstop — if hit, the response is rejected and regenerated once before failing gracefully. A hard product guardrail like "never mention medical conditions" for a 13+ user base shouldn't rely on prompt compliance alone.
7. On malformed output or API failure: one automatic retry, then a graceful in-app failure state ("something went wrong, try again") — no partial/garbled results ever shown.
8. **Style suggestions ("what suits me," §13.5 Mode 2) are generated on-demand**, via a separate, smaller API call fired only when the user opens that screen — not bundled into every main analysis call — so scans that never touch style features don't pay the extra generation cost. "Re-runs every scan" (§13.5) means fresh each time it's requested, not that it's precomputed on every scan whether requested or not.
9. **Provider:** the pending Claude-vs-GPT-4V test from §15 happens here, evaluated specifically against this pipeline's real requirements — structured-output reliability, MST skin-tone-classification accuracy, and guardrail adherence (does it avoid medical framing on its own, before the backstop even fires) on a real test set of diverse selfies. Whichever wins gets slotted behind the interface already planned in §15. **This test still needs to actually be run** — it's the one piece of step 7 that requires hands-on evaluation rather than a design decision, so treat it as the immediate next action item rather than something resolved by this document.

**Step 7 status:** design confirmed. The Claude-vs-GPT-4V evaluation is the one remaining action item before this is fully closed out — everything else in the pipeline is provider-agnostic and ready either way.

---

## 18. Step 8 Deliverable: Backend, Frontend, APIs & Integrations (confirmed 2026-09-05)

**Backend split (derived from the Supabase architecture in §15):**
- **Direct client-to-Supabase (via the client SDK + Row-Level Security policies)** for straightforward CRUD that doesn't touch secrets or cross-user logic: reading a user's own scans/history, profile fields, referral status, consent records, browsing `styles`/`products`. Every table gets an RLS policy scoping rows to their owner (a user only ever sees their own `scans`/`recommendations`/etc.; a creator only sees their own `creator_referrals`).
- **Server-side Edge Functions** (Supabase Edge Functions, TypeScript/Deno) for anything needing a secret key or cross-user/business-rule enforcement the client can't be trusted with:
  - `analyze-scan` — the full §17 pipeline (content-safety check → LLM call → schema validation → guardrail backstop → score rescale → write `scans`/`scan_category_scores`/`recommendations`), plus the referral-credit check (if this is the invitee's first scan, look up their `referrals` row and increment the referrer's `bonus_rescans_remaining`) — kept in the same function since it's naturally "what happens when a scan completes." Also enforces the paid-tier fair-use cap (a generous invisible ~30 scans/day) alongside the free-tier's product-level monthly limit — a technical backstop against runaway cost from a compromised account or bug, not a real-world restriction on genuine use.
  - `style-suggestions` — on-demand Mode 2 generation (§17 item 8).
  - `delete-scan` / `delete-account` — deletes the Storage photo(s) first, then the DB row(s) in the same call, so a failed storage delete never leaves an orphaned pointer with no way to retry; cascades per the §16 erasure rules (null out `referrer_user_id`/`referred_user_id`, keep commission amounts).
  - `revenuecat-webhook` — receives subscription lifecycle events, updates `users.subscription_tier`/`revenuecat_customer_id`.
  - `sync-product-catalog` — scheduled pull from the ShopMy feed into `products`.
  - `calculate-creator-commissions` — scheduled job computing `creator_referrals.commission_amount` from subscription revenue.
- **Scheduling** for the two scheduled functions above: Supabase's `pg_cron` + `pg_net` extensions triggering the Edge Functions on a schedule — stays inside the already-chosen Supabase stack rather than adding a second external scheduler to operate solo.

**Frontend structure (React Native/Expo, mapped to already-confirmed features):**
- Onboarding: age gate, region detection, biometric-consent explainer (§13.11), blanket-disclosure acknowledgment (§13.10).
- Capture flow (§13.1): live camera with real-time coaching, or gallery fallback, confirm/retake screen.
- Results/Plan screen (§13.3/§13.4): scores + potential scores, per-category recommendation plan with inline product cards (§13.6).
- Style picker + "what suits me" results (§13.5).
- History (§13.9): past scans, per-scan and full-account deletion controls.
- Referral screen (§13.8): code/share sheet, credit status.
- Paywall/subscription screen, wired to RevenueCat's SDK.
- Settings: disclosure info, consent records, account deletion entry point.
- **Creator/affiliate dashboard (§13.7)** is a *separate* Next.js/Vercel web app, not part of the React Native app — reads/writes Supabase directly with its own RLS-scoped creator auth.
- **State management:** TanStack Query for server-state caching/sync with Supabase, Zustand for lightweight local UI state — a low-boilerplate pairing over something heavier like Redux Toolkit, appropriate for this app's scope as a solo build.

**Decisions applied:**
1. All non-CRUD server logic (referral crediting, deletion cascades, webhook handling, scheduled jobs) lives in Edge Functions written in TypeScript, not Postgres PL/pgSQL — easier for a solo build with Claude Code to write, debug, and maintain.
2. The paid tier's "unlimited" re-scans carry an invisible fair-use cap (~30/day) as a technical cost-safety backstop, not a real-world restriction — folded into `analyze-scan` above.
3. Frontend state management is TanStack Query + Zustand (listed above).
4. The two scheduled jobs (`sync-product-catalog`, `calculate-creator-commissions`) are triggered by `pg_cron` + `pg_net` inside Supabase, rather than an external scheduler — keeps one fewer system to operate solo.

**Step 8 status:** confirmed. Next: step 9, the complete build plan.

---

## 19. Step 9 Deliverable: Complete Build Plan (confirmed 2026-09-05)

Sequenced to front-load the riskiest/most uncertain work and get a real end-to-end loop working before layering on monetization and growth features — standard "walking skeleton first" build order, not a new product decision, just how §13-§18 get assembled in time.

**Phase 0 — Scaffolding**
Repo + Expo/React Native app init; **two separate Supabase projects (dev + prod)** from day one, each with the §16 schema (migrations + RLS policies on every table); Next.js dashboard scaffold; EAS project setup; secrets/env management for Supabase, LLM provider, RevenueCat, ShopMy, FCM, PostHog, Sentry keys, kept separate per environment.

**Phase 1 — AI pipeline validation (highest technical risk, done first)**
Run the outstanding Claude-vs-GPT-4V test (§17) on real sample selfies to pick the provider. Build `analyze-scan` (content-safety check → LLM call → structured-output validation → guardrail blocklist backstop → score rescale) as a standalone, directly-testable function *before* any UI exists around it. **Automated tests are written from this phase onward for the safety-critical pieces specifically** — the score-rescale function, the medical-term blocklist, and tier-gating logic — since these are cheap-to-test pure functions enforcing hard product guardrails; the rest of the app relies on manual QA for v1.

**Phase 2 — Core loop MVP**
Auth (Supabase Auth); age-gate + consent onboarding (§13.11); guided capture flow (§13.1); wire capture → `analyze-scan` → results screen (scores + potential scores, §13.3, and the recommendation plan, §13.4). Goal: a working end-to-end scan-to-plan loop before anything else gets built on top.

**Phase 3 — Recommendation depth & product engine**
ShopMy integration (`sync-product-catalog`) and `recommendation_products` matching (§13.6); free-tier tip cap (top 2, §13.4) and disclosure tags; history screen with per-scan/account deletion (§13.9).

**Phase 4 — Style/niche system (§13.5)**
Note: the curated aesthetic taxonomy (~15-25 niches with reference imagery) is a *content-curation task, not an engineering task* — worth starting in parallel with earlier phases rather than waiting until Phase 4 to begin it, since it doesn't depend on any code being done first. Engineering: style picker UI, Mode 1 plan-regeneration, Mode 2 on-demand suggestions (`style-suggestions`).

**Phase 5 — Monetization**
RevenueCat SDK + paywall screen + `revenuecat-webhook`; full free/paid gating wired (tip caps, history/rescan limits, the fair-use cap on unlimited paid rescans).

**Phase 6 — Referral & creator systems**
Referral code/share flow (§13.8, credit logic already lives in `analyze-scan` from Phase 1); creator dashboard (Next.js/Vercel, §13.7) with manual-approval creator onboarding and `calculate-creator-commissions`.
Note: applying to/setting up the ShopMy affiliate account (Phase 3) and any direct creator-partner outreach (§7) are also non-engineering, relationship/business tasks worth starting early in parallel — they sit on the critical path for revenue but not for code.

**Phase 7 — Trust, safety & compliance polish**
Disclosure system (§13.10) onboarding acknowledgment + settings surface; final biometric-consent screen; region detection. **Blocking item:** the §13.11 13-17 consent legal question needs a real answer before this phase can be called done — flagged again here since it's the one open compliance item left.

**Phase 8 — Observability & release readiness**
PostHog + Sentry wired across the app; FCM push for referral-credit confirmations; EAS build/submit pipeline finalized; app-store listing prep (privacy nutrition labels for biometric data, age rating); a guardrail QA pass specifically (score floor never violated, medical-term blocklist tested against real outputs, skin-tone-aware recommendations spot-checked, women-only content audit).

**Phase 9 — Launch**
Soft launch, monitoring in place, creator-partner onboarding kicks off per §7's marketing strategy.

**Decisions applied:**
1. Dev and prod run as two separate Supabase projects from day one (folded into Phase 0 above) — cheap insurance against ever testing against real user data.
2. Automated tests cover the safety-critical pure functions (score rescale, medical-term blocklist, tier gating) from Phase 1 onward; everything else relies on manual QA for v1.
3. Phase order confirmed as drafted — core scan-to-plan loop (Phases 1-2) before monetization or growth features.

**Step 9 status:** confirmed. Steps 1-9 are now complete — every planning step from §13 through §19 is done. Two items remain open in parallel, both already tracked as explicit blocking notes in their relevant phase above: §13.11's 13-17 consent legal question (blocks Phase 7), and §17's Claude-vs-GPT-4V hands-on test (blocks the start of Phase 1). Step 10 — start building — is next.
