\set ON_ERROR_STOP off
set role app_user;

\echo '--- bob creates a person (Dana) and an occasion (Bob''s Christmas) ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name)
select network_id, auth.uid(), 'Dana' from bob_network;
with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.occasions (network_id, created_by, name, type, date)
select network_id, auth.uid(), 'Bob''s Christmas', 'christmas', '2026-12-25' from bob_network;

select id as dana_person_id from public.people where full_name = 'Dana' \gset
select id as bob_occasion_id from public.occasions where name = 'Bob''s Christmas' \gset

\echo '--- alice creates a person (Charlie) and an occasion (Alice''s Christmas) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name)
select network_id, auth.uid(), 'Charlie' from alice_network;
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.occasions (network_id, created_by, name, type, date)
select network_id, auth.uid(), 'Alice''s Christmas', 'christmas', '2026-12-25' from alice_network;

select id as charlie_person_id from public.people where full_name = 'Charlie' \gset
select id as alice_occasion_id from public.occasions where name = 'Alice''s Christmas' \gset
select network_id as alice_network_id from public.network_members where user_id = '11111111-1111-1111-1111-111111111111' limit 1 \gset

\echo '--- alice adds a gift for Charlie in her own occasion: should SUCCEED ---'
insert into public.gifts (network_id, person_id, occasion_id, created_by, title, status, price)
values (:'alice_network_id', :'charlie_person_id', :'alice_occasion_id', '11111111-1111-1111-1111-111111111111', 'Board game', 'purchased', 35.00)
returning id, title, status;

select id as gift1_id from public.gifts where title = 'Board game' \gset

\echo '--- alice tries to tag that same gift (for Charlie) with BOB''s KNOWN occasion: should FAIL (network mismatch trigger) ---'
update public.gifts set occasion_id = :'bob_occasion_id' where id = :'gift1_id';

\echo '--- alice creates a bundle for Charlie and assigns the gift to it: should SUCCEED ---'
insert into public.gift_bundles (network_id, person_id, occasion_id, created_by, name)
values (:'alice_network_id', :'charlie_person_id', :'alice_occasion_id', '11111111-1111-1111-1111-111111111111', 'Game Night Bundle')
returning id, name;

select id as bundle_id from public.gift_bundles where name = 'Game Night Bundle' \gset

update public.gifts set bundle_id = :'bundle_id' where id = :'gift1_id';
select title, bundle_id from public.gifts where id = :'gift1_id';

\echo '--- alice tries to create a bundle for Charlie using BOB''s KNOWN occasion: should FAIL (network mismatch trigger) ---'
insert into public.gift_bundles (network_id, person_id, occasion_id, created_by, name)
values (:'alice_network_id', :'charlie_person_id', :'bob_occasion_id', '11111111-1111-1111-1111-111111111111', 'Bad Bundle');

\echo '--- alice adds a second gift for Charlie and tries to assign it to a bundle belonging to BOB''s person (a cross-person bundle mismatch, simulated with a same-network bundle swap): should FAIL ---'
insert into public.gift_bundles (network_id, person_id, created_by, name)
values (:'alice_network_id', :'charlie_person_id', '11111111-1111-1111-1111-111111111111', 'Charlie Only Bundle')
returning id \gset charlie_bundle_
-- create a second person (Eve) in alice's network, and a bundle for Eve
insert into public.people (network_id, created_by, full_name)
values (:'alice_network_id', '11111111-1111-1111-1111-111111111111', 'Eve')
returning id \gset eve_person_
insert into public.gift_bundles (network_id, person_id, created_by, name)
values (:'alice_network_id', :'eve_person_id', '11111111-1111-1111-1111-111111111111', 'Eve Bundle')
returning id \gset eve_bundle_
-- try to put a gift for Charlie into Eve's bundle: should FAIL (bundle's person must match gift's person)
insert into public.gifts (network_id, person_id, created_by, title, bundle_id)
values (:'alice_network_id', :'charlie_person_id', '11111111-1111-1111-1111-111111111111', 'Mismatched bundle gift', :'eve_bundle_id');

\echo '--- alice selects gifts: should see her own (Board game), never bob''s/Dana''s ---'
select title from public.gifts order by title;

\echo '=== gift secrecy ==='

\echo '--- link Charlie to alice''s own account (simulating Charlie being a network member whose profile is alice herself), then alice should NO LONGER see Charlie''s gifts ---'
update public.people set linked_user_id = '11111111-1111-1111-1111-111111111111' where id = :'charlie_person_id';
select count(*) as should_be_zero_once_hidden from public.gifts where person_id = :'charlie_person_id';
select count(*) as bundle_should_be_zero_too from public.gift_bundles where person_id = :'charlie_person_id';

\echo '--- unlink Charlie: gifts become visible to alice again ---'
update public.people set linked_user_id = null where id = :'charlie_person_id';
select count(*) as should_be_one_again from public.gifts where person_id = :'charlie_person_id';

reset role;
