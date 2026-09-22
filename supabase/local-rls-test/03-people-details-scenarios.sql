\set ON_ERROR_STOP off
set role app_user;

\echo '--- bob creates a person in his own network (Dana) ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name)
select network_id, auth.uid(), 'Dana' from bob_network
returning id, full_name;

select id as dana_person_id, network_id as bob_network_id from public.people where full_name = 'Dana' \gset

\echo '--- alice creates a person in her own network (Charlie) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name, interests)
select network_id, auth.uid(), 'Charlie', array['board games', 'coffee'] from alice_network
returning id, full_name, interests;

select id as charlie_person_id from public.people where full_name = 'Charlie' \gset

-- From here on, everything runs as alice. bob_network_id and
-- dana_person_id are literals she "knows" (e.g. guessed/leaked), captured
-- above while RLS still let bob see his own rows — this isolates each
-- check below to the specific policy it's meant to test, rather than
-- being confounded by alice simply being unable to look the ids up
-- through another RLS-protected table first.

\echo '--- alice adds a custom attribute to HER OWN person (Charlie): should SUCCEED ---'
insert into public.person_attributes (person_id, category, label, value, created_by)
values (:'charlie_person_id', 'Clothing Sizes', 'Ring size', '7', '11111111-1111-1111-1111-111111111111')
returning id, category, label, value;

\echo '--- alice tries to add a custom attribute to a KNOWN person id belonging to bob (Dana): should FAIL with an RLS error ---'
insert into public.person_attributes (person_id, category, label, value, created_by)
values (:'dana_person_id', 'Preferences', 'Favorite candle', 'Vanilla', '11111111-1111-1111-1111-111111111111');

\echo '--- alice selects person_attributes: should see only Charlie''s, never Dana''s ---'
select p.full_name, pa.label, pa.value from public.person_attributes pa join public.people p on p.id = pa.person_id;

\echo '--- alice edits her own attribute: should SUCCEED ---'
update public.person_attributes set value = '7.5' where label = 'Ring size';
select label, value from public.person_attributes where label = 'Ring size';

\echo '--- alice adds a gift idea for Charlie in her OWN (correct) network: should SUCCEED ---'
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.gifts (network_id, person_id, created_by, title, status)
select network_id, :'charlie_person_id', auth.uid(), 'Board game', 'idea' from alice_network
returning id, title, status;

\echo '--- alice tries to create a gift for HER OWN person Charlie but tagged with BOB''s known network_id: should FAIL (RLS or integrity trigger) ---'
insert into public.gifts (network_id, person_id, created_by, title)
values (:'bob_network_id', :'charlie_person_id', '11111111-1111-1111-1111-111111111111', 'Mismatched gift');

\echo '--- alice tries to read gifts for a KNOWN person id belonging to bob (Dana): 0 rows ---'
select count(*) as should_be_zero from public.gifts where person_id = :'dana_person_id';

\echo '--- alice deletes her custom attribute: should SUCCEED ---'
delete from public.person_attributes where label = 'Ring size';
select count(*) as remaining_attrs_for_alice from public.person_attributes;

\echo '=== storage.objects (avatars) ==='

\echo '--- alice uploads to her OWN network folder: should SUCCEED ---'
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into storage.objects (bucket_id, name)
select 'avatars', network_id || '/' || :'charlie_person_id' || '-123.jpg' from alice_network
returning name;

\echo '--- alice tries to upload into BOB''s KNOWN network folder: should FAIL with an RLS error ---'
insert into storage.objects (bucket_id, name)
values ('avatars', :'bob_network_id' || '/fake-person-999.jpg');

\echo '--- anyone (even with no jwt claim at all) can SELECT from the avatars bucket: should SUCCEED (public read) ---'
select set_config('request.jwt.claim.sub', '', false);
select count(*) as public_read_count from storage.objects where bucket_id = 'avatars';

reset role;
