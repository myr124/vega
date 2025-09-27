-- Supabase Storage RLS setup for `videos` bucket
-- Copy/paste this into the Supabase SQL Editor and run.

begin;

-- 0) Create the bucket (if it doesn't exist) and set it to public
insert into storage.buckets (id, name, public)
values ('videos', 'videos', true)
on conflict (id) do update
set public = excluded.public;

-- 1) Ensure RLS is enabled (typically already enabled by default)
alter table if exists storage.objects enable row level security;
alter table if exists storage.buckets enable row level security;

-- 2) Public read access (required for public URLs and for createSignedUrl)
drop policy if exists "Public read access to videos" on storage.objects;
create policy "Public read access to videos"
on storage.objects
for select
to public
using (bucket_id = 'videos');

-- (Optional) Allow reading bucket metadata for `videos`
drop policy if exists "Public bucket metadata read (videos)" on storage.buckets;
create policy "Public bucket metadata read (videos)"
on storage.buckets
for select
to public
using (id = 'videos');

-- 3) Upload permissions
-- The frontend currently uploads with the anon key (no auth UI), so allow anon inserts.
-- If you prefer to require login, comment out the anon policy and keep the authenticated one.

-- Allow ANON uploads (use with caution in production)
drop policy if exists "Anon users can upload to videos" on storage.objects;
create policy "Anon users can upload to videos"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'videos'
  and name like 'uploads/%'  -- restrict to the `uploads/` prefix which the app uses
);

-- Also allow AUTHENTICATED uploads
drop policy if exists "Authenticated users can upload to videos" on storage.objects;
create policy "Authenticated users can upload to videos"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'videos'
  and name like 'uploads/%'
);

-- 4) Optional: let authenticated users update/delete their own files
-- Note: anon uploads will have owner = null, so these won't apply to anon-uploaded files.
drop policy if exists "Users can update own videos" on storage.objects;
create policy "Users can update own videos"
on storage.objects
for update
to authenticated
using (bucket_id = 'videos' and owner = auth.uid())
with check (bucket_id = 'videos' and owner = auth.uid());

drop policy if exists "Users can delete own videos" on storage.objects;
create policy "Users can delete own videos"
on storage.objects
for delete
to authenticated
using (bucket_id = 'videos' and owner = auth.uid());

commit;

-- After running:
-- - Public read enabled for the `videos` bucket.
-- - Client can upload to `videos/uploads/...` using anon or authenticated roles.
-- - Authenticated users can update/delete their own files.
