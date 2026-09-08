-- Initial schema per PROJECT_CONTEXT.md §16.
-- Table order follows foreign-key dependencies: lookup tables first, then scans, then
-- everything that hangs off a scan, then referral/creator tables.

create extension if not exists pgcrypto;

-- ── users ────────────────────────────────────────────────────────────────────
-- One row per app user, 1:1 with auth.users. Hard-deletes on account deletion
-- (cascades from auth.users), per §16 modeling decision #2.
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  birthdate date not null,
  region text not null check (region in ('US', 'EU_UK')),
  subscription_tier text not null default 'free' check (subscription_tier in ('free', 'paid')),
  revenuecat_customer_id text,
  own_referral_code text not null unique,
  referred_by_user_id uuid references public.users (id) on delete set null,
  bonus_rescans_remaining integer not null default 0,
  created_at timestamptz not null default now()
);

-- ── consents ─────────────────────────────────────────────────────────────────
-- Versioned so a change in disclosure/consent wording never erases the record
-- of what was actually agreed to at the time (§16).
create table public.consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  consent_type text not null check (consent_type in ('biometric', 'blanket_disclosure')),
  version integer not null,
  region_at_time text not null check (region_at_time in ('US', 'EU_UK')),
  granted_at timestamptz not null default now()
);

-- ── categories ───────────────────────────────────────────────────────────────
-- Lookup table, not a hard-coded enum, so v2's nails/jewelry/clothing categories
-- are new rows with no schema change (§16 modeling decision #1).
create table public.categories (
  id text primary key,
  name text not null,
  active boolean not null default true
);

insert into public.categories (id, name, active) values
  ('hair', 'Hair', true),
  ('brows', 'Brows', true),
  ('skin', 'Skin', true),
  ('makeup', 'Makeup', true),
  ('nails', 'Nails', false),
  ('jewelry', 'Jewelry & Accessories', false),
  ('clothing', 'Clothing & Style Direction', false);

-- ── styles ───────────────────────────────────────────────────────────────────
-- Curated aesthetic/niche taxonomy (§13.5).
create table public.styles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  reference_image_urls text[] not null default '{}',
  active boolean not null default true
);

-- ── products ─────────────────────────────────────────────────────────────────
-- Synced from the ShopMy affiliate feed (§13.6, §18 sync-product-catalog).
create table public.products (
  id uuid primary key default gen_random_uuid(),
  external_id text not null unique,
  name text not null,
  brand text not null,
  category_id text not null references public.categories (id),
  price numeric(10, 2) not null,
  image_url text not null,
  skin_tone_tags text[] not null default '{}',
  affiliate_link text not null,
  active boolean not null default true
);

-- ── promotions ───────────────────────────────────────────────────────────────
-- Paid preferential-placement campaigns (§11, §13.6).
create table public.promotions (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  sponsor_name text not null,
  start_date date not null,
  end_date date not null,
  active boolean not null default true
);

-- ── scans ────────────────────────────────────────────────────────────────────
-- Hard-deletable row (per-scan erasure, §13.9) — deleting it removes the row
-- and its photo from Storage entirely, no soft-delete/anonymized stub.
create table public.scans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  photo_storage_path text not null,
  makeup_on boolean not null,
  captured_at timestamptz not null default now(),
  overall_score integer not null check (overall_score between 0 and 100),
  overall_potential_score integer not null check (overall_potential_score between 0 and 100),
  selected_style_id uuid references public.styles (id)
);

-- ── scan_category_scores ─────────────────────────────────────────────────────
create table public.scan_category_scores (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  category_id text not null references public.categories (id),
  score integer not null check (score between 0 and 100),
  potential_score integer not null check (potential_score between 0 and 100),
  unique (scan_id, category_id)
);

-- ── recommendations ──────────────────────────────────────────────────────────
-- Free-tier cap (top 2, §13.4) is derived from `rank` at query time, not a
-- stored flag.
create table public.recommendations (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  category_id text not null references public.categories (id),
  rank integer not null,
  title text not null,
  rationale text not null,
  how_to_content text not null
);

-- ── scan_style_suggestions ───────────────────────────────────────────────────
-- Mode 2 ("what suits me") output (§13.5).
create table public.scan_style_suggestions (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid not null references public.scans (id) on delete cascade,
  style_id uuid not null references public.styles (id),
  rank integer not null,
  rationale text not null
);

-- ── recommendation_products ──────────────────────────────────────────────────
create table public.recommendation_products (
  id uuid primary key default gen_random_uuid(),
  recommendation_id uuid not null references public.recommendations (id) on delete cascade,
  product_id uuid not null references public.products (id),
  rank integer not null,
  rationale text not null,
  is_promoted boolean not null default false,
  promotion_id uuid references public.promotions (id)
);

-- ── referrals ────────────────────────────────────────────────────────────────
-- On account deletion, referrer_user_id/invitee_user_id are set null (§16
-- modeling decision #2); the row itself is kept for abuse-pattern history.
create table public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_user_id uuid references public.users (id) on delete set null,
  invitee_user_id uuid references public.users (id) on delete set null,
  invited_at timestamptz not null default now(),
  invitee_first_scan_at timestamptz,
  reward_granted_at timestamptz
);

-- ── creators ─────────────────────────────────────────────────────────────────
-- 1:1 with auth.users, same as public.users — a person can be both a regular
-- app user and a creator under the same auth identity. Manual-approval
-- onboarding per §13.7 (status starts 'pending').
create table public.creators (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  email text not null unique,
  referral_code text not null unique,
  commission_rate_percent numeric(5, 2) not null,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

-- ── creator_referrals ────────────────────────────────────────────────────────
-- On account deletion, referred_user_id is set null; commission_amount and
-- payout_status are retained regardless — the commission is owed to the
-- creator independent of the referred user's continued existence (§16).
create table public.creator_referrals (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references public.creators (id) on delete cascade,
  referred_user_id uuid references public.users (id) on delete set null,
  signed_up_at timestamptz not null default now(),
  subscribed_at timestamptz,
  commission_amount numeric(10, 2),
  payout_status text not null default 'pending' check (payout_status in ('pending', 'paid', 'failed'))
);

create index on public.scans (user_id);
create index on public.scan_category_scores (scan_id);
create index on public.recommendations (scan_id);
create index on public.scan_style_suggestions (scan_id);
create index on public.recommendation_products (recommendation_id);
create index on public.referrals (referrer_user_id);
create index on public.referrals (invitee_user_id);
create index on public.creator_referrals (creator_id);
create index on public.consents (user_id);
