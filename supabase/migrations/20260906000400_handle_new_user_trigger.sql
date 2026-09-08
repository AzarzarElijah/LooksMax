-- Auto-creates the public.users row when someone signs up via Supabase Auth (§16's 1:1
-- users <-> auth.users relationship). RLS deliberately gives clients no INSERT policy on
-- public.users (20260906000100_rls_policies.sql) — this trigger, running as security definer,
-- is what actually creates the row. It reads the birthdate/region the client passed as signup
-- metadata (mobile/src/app/sign-up.tsx) and doubles as a server-side backstop for the §13.11
-- "block signup if under 13" rule: raising here aborts the whole auth.users insert too, so a
-- bypassed client-side check can't create an underage account.

create or replace function public.generate_referral_code()
returns text
language sql
as $$
  select upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_birthdate date;
  v_region text;
begin
  v_birthdate := (new.raw_user_meta_data ->> 'birthdate')::date;
  v_region := new.raw_user_meta_data ->> 'region';

  if v_birthdate is null then
    raise exception 'Signup metadata must include birthdate.';
  end if;
  if v_region not in ('US', 'EU_UK') then
    raise exception 'Signup metadata must include region (US or EU_UK).';
  end if;
  if age(v_birthdate) < interval '13 years' then
    raise exception 'Users must be at least 13 years old.';
  end if;

  insert into public.users (id, email, birthdate, region, own_referral_code)
  values (new.id, new.email, v_birthdate, v_region, public.generate_referral_code());

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
