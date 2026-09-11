-- Part 4 safety fix: closes the pre-existing gap where a client could upload a photo directly to
-- `scan-photos` before any safety verdict existed (mobile/src/lib/scan-api.ts). Photos are now
-- sent as request-body bytes to the analyze-scan Edge Function and written to Storage only by
-- that function's service-role client (which bypasses RLS and needs no policy of its own), only
-- after a safe content-safety verdict AND a successful analysis. The client no longer writes to
-- this bucket at all, so its insert policy is no longer needed or wanted.
--
-- Read access for a user's own scan history (thumbnails, revisiting a past scan) is unaffected —
-- the "select own" policy from 20260906000200_storage.sql stays as-is.

drop policy if exists "scan photos insert own" on storage.objects;
