-- Row-Level Security per PROJECT_CONTEXT.md §18: every table gets RLS enabled,
-- scoping rows to their owner. Business-logic writes (scan creation, scoring,
-- deletion cascades, referral crediting) happen in Edge Functions using the
-- service role key, which bypasses RLS entirely — so most tables intentionally
-- get a SELECT-only policy for the `authenticated` role and no client-side
-- INSERT/UPDATE/DELETE policy at all.

alter table public.users enable row level security;
alter table public.consents enable row level security;
alter table public.categories enable row level security;
alter table public.styles enable row level security;
alter table public.products enable row level security;
alter table public.promotions enable row level security;
alter table public.scans enable row level security;
alter table public.scan_category_scores enable row level security;
alter table public.recommendations enable row level security;
alter table public.scan_style_suggestions enable row level security;
alter table public.recommendation_products enable row level security;
alter table public.referrals enable row level security;
alter table public.creators enable row level security;
alter table public.creator_referrals enable row level security;

-- users: read/update own row only. Sensitive fields (subscription_tier,
-- bonus_rescans_remaining, revenuecat_customer_id) are only ever written by
-- service-role Edge Functions in practice; a v1 simplification rather than a
-- column-level grant, flagged here for revisit if it's ever abused client-side.
create policy "users select own" on public.users
  for select using (auth.uid() = id);
create policy "users update own" on public.users
  for update using (auth.uid() = id);

-- consents: the app records these directly from the client at the moment of
-- acknowledgment (§13.10/§13.11) — not sensitive business logic.
create policy "consents select own" on public.consents
  for select using (auth.uid() = user_id);
create policy "consents insert own" on public.consents
  for insert with check (auth.uid() = user_id);

-- categories / styles / products: public lookup/browse data, active rows only.
create policy "categories select active" on public.categories
  for select using (active);
create policy "styles select active" on public.styles
  for select using (active);
create policy "products select active" on public.products
  for select using (active);

-- promotions: internal business data, no client-facing policy — only
-- service-role Edge Functions (product recommendation engine) read this.

-- scans: owner-only read. All writes go through analyze-scan / delete-scan
-- Edge Functions.
create policy "scans select own" on public.scans
  for select using (auth.uid() = user_id);

create policy "scan_category_scores select own" on public.scan_category_scores
  for select using (
    exists (
      select 1 from public.scans s
      where s.id = scan_category_scores.scan_id and s.user_id = auth.uid()
    )
  );

create policy "recommendations select own" on public.recommendations
  for select using (
    exists (
      select 1 from public.scans s
      where s.id = recommendations.scan_id and s.user_id = auth.uid()
    )
  );

create policy "scan_style_suggestions select own" on public.scan_style_suggestions
  for select using (
    exists (
      select 1 from public.scans s
      where s.id = scan_style_suggestions.scan_id and s.user_id = auth.uid()
    )
  );

create policy "recommendation_products select own" on public.recommendation_products
  for select using (
    exists (
      select 1 from public.recommendations r
      join public.scans s on s.id = r.scan_id
      where r.id = recommendation_products.recommendation_id and s.user_id = auth.uid()
    )
  );

-- referrals: visible to either side of the referral.
create policy "referrals select own" on public.referrals
  for select using (auth.uid() = referrer_user_id or auth.uid() = invitee_user_id);

-- creators: a creator manages their own dashboard row directly.
create policy "creators select own" on public.creators
  for select using (auth.uid() = id);
create policy "creators update own" on public.creators
  for update using (auth.uid() = id);

create policy "creator_referrals select own" on public.creator_referrals
  for select using (
    exists (
      select 1 from public.creators c
      where c.id = creator_referrals.creator_id and c.id = auth.uid()
    )
  );
