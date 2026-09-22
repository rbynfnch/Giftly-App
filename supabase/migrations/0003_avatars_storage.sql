-- Giftly Phase 2: avatar photo storage.
-- Public bucket (per product decision): anyone with the exact URL can view
-- a photo (URLs embed a random person id + timestamp, not discoverable/
-- listable), but only members of the owning network can upload/replace/
-- delete a given person's avatar. Path convention:
--   {network_id}/{person_id}-{timestamp}.jpg
-- Run this in the Supabase SQL Editor after 0002_people_details.sql.

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do update set public = true;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects
  for select
  using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_network_members" on storage.objects;
create policy "avatars_insert_network_members" on storage.objects
  for insert
  with check (
    bucket_id = 'avatars'
    and public.is_network_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "avatars_update_network_members" on storage.objects;
create policy "avatars_update_network_members" on storage.objects
  for update
  using (
    bucket_id = 'avatars'
    and public.is_network_member(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "avatars_delete_network_members" on storage.objects;
create policy "avatars_delete_network_members" on storage.objects
  for delete
  using (
    bucket_id = 'avatars'
    and public.is_network_member(((storage.foldername(name))[1])::uuid)
  );
