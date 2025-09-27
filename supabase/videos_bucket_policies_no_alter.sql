-- Supabase Storage RLS setup for `videos` bucket (no ALTER TABLE statements)
-- Use this if you saw: "must be owner of table objects"
-- Copy/paste this into the Supabase SQL Editor and run.

begin;

-- 0) Create the bucket (if it doesn't exist) and set it to public
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update
set public = excluded.public;

-- 1) Public read access (required for public URLs and for createSignedUrl)
--    Use unique policy names to avoid DROP/ownership issues.
create policy "Public read access to videos v2"
on storage.objects
for select
to public
using (bucket_id = 'videos');

-- (Optional) Allow reading bucket metadata for `videos`
create policy "Public bucket metadata read (videos) v2"
on storage.buckets
for select
to public
using (id = 'videos');

-- 2) Upload permissions
-- If you upload without auth (anon key in the browser), keep the anon policy.
-- If you prefer auth-only uploads, remove the anon policy and keep the authenticated one.

-- Allow ANON uploads (use with caution in production)
create policy "Anon users can upload to videos v2"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'videos'
  and name like 'uploads/%'  -- restrict to the `uploads/` prefix which the app uses
);

-- Also allow AUTHENTICATED uploads
create policy "Authenticated users can upload to videos v2"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'videos'
  and name like 'uploads/%'
);

-- 3) Optional: let authenticated users update/delete their own files
-- Note: anon uploads will have owner = null, so these won't apply to anon-uploaded files.
create policy "Users can update own videos v2"
on storage.objects
for update
to authenticated
using (bucket_id = 'videos' and owner = auth.uid())
with check (bucket_id = 'videos' and owner = auth.uid());

create policy "Users can delete own videos v2"
on storage.objects
for delete
to authenticated
using (bucket_id = 'videos' and owner = auth.uid());

commit;

-- After running:
-- - Public read enabled for the `videos` bucket.
-- - Client can upload to `videos/uploads/...` using anon or authenticated roles (depending on policies you keep).
-- - Authenticated users can update/delete their own files.
