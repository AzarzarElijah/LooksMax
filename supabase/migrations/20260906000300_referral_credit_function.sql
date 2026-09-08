-- Atomic credit adjustment for referral rewards (§13.8) and bonus-rescan consumption in the
-- analyze-scan Edge Function, avoiding read-then-write races on users.bonus_rescans_remaining.
-- Only ever called by the service-role client (analyze-scan), which bypasses grants anyway —
-- the revoke below is a belt-and-braces guardrail against it ever being reachable client-side.

create or replace function public.increment_bonus_rescans(target_user_id uuid, amount integer)
returns void
language sql
as $$
  update public.users
  set bonus_rescans_remaining = bonus_rescans_remaining + amount
  where id = target_user_id;
$$;

revoke execute on function public.increment_bonus_rescans(uuid, integer) from public, anon, authenticated;
