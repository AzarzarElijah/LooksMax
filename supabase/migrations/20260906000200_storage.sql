-- Storage bucket for scan selfies (§13.1, §13.9, §15). Private bucket; objects
-- are keyed "{user_id}/{scan_id}.jpg" so RLS can scope access per user via the
-- top-level folder name, matching the account+per-scan erasure requirements.
--
-- Client uploads the photo directly (INSERT) and can view their own history
-- (SELECT). Deletion is intentionally NOT exposed to the client here —
-- delete-scan / delete-account Edge Functions (service role) delete the
-- Storage object and the DB row together in one call (§18), so a failed
-- storage delete never leaves an orphaned pointer with no way to retry.

insert into storage.buckets (id, name, public)
values ('scan-photos', 'scan-photos', false)
on conflict (id) do nothing;

create policy "scan photos insert own" on storage.objects
  for insert
  with check (
    bucket_id = 'scan-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "scan photos select own" on storage.objects
  for select
  using (
    bucket_id = 'scan-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
