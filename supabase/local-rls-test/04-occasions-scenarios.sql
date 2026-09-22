\set ON_ERROR_STOP off
set role app_user;

\echo '--- bob creates a person (Dana) and an occasion (Bob''s Christmas) ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name)
select network_id, auth.uid(), 'Dana' from bob_network
returning id, full_name;

with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.occasions (network_id, created_by, name, type, date)
select network_id, auth.uid(), 'Bob''s Christmas', 'christmas', '2026-12-25' from bob_network
returning id, name;

select id as dana_person_id from public.people where full_name = 'Dana' \gset
select id as bob_occasion_id from public.occasions where name = 'Bob''s Christmas' \gset

\echo '--- alice creates a person (Charlie), a group (Family), and an occasion (Alice''s Christmas) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name, group_id)
select network_id, auth.uid(), 'Charlie', null from alice_network
returning id, full_name;

with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.groups (network_id, created_by, name)
select network_id, auth.uid(), 'Family' from alice_network
returning id, name;

with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.occasions (network_id, created_by, name, type, date, budget, is_recurring_template)
select network_id, auth.uid(), 'Alice''s Christmas', 'christmas', '2026-12-25', 200.00, true from alice_network
returning id, name;

select id as charlie_person_id from public.people where full_name = 'Charlie' \gset
select id as alice_group_id from public.groups where name = 'Family' \gset
select id as alice_occasion_id from public.occasions where name = 'Alice''s Christmas' \gset

-- Link Charlie into the Family group now that we have its id (RLS-safe: alice owns both rows).
update public.people set group_id = :'alice_group_id' where id = :'charlie_person_id';

\echo '=== occasion_participants ==='

\echo '--- alice adds Charlie to HER OWN occasion: should SUCCEED ---'
insert into public.occasion_participants (occasion_id, person_id, budget)
values (:'alice_occasion_id', :'charlie_person_id', 50.00)
returning id, budget;

\echo '--- alice tries to add Charlie to BOB''s KNOWN occasion: should FAIL (RLS) ---'
insert into public.occasion_participants (occasion_id, person_id)
values (:'bob_occasion_id', :'charlie_person_id');

\echo '--- alice tries to add BOB''s known person (Dana) to HER OWN occasion: should FAIL (integrity trigger) ---'
insert into public.occasion_participants (occasion_id, person_id)
values (:'alice_occasion_id', :'dana_person_id');

\echo '--- alice selects occasion_participants for BOB''s occasion: 0 rows ---'
select count(*) as should_be_zero from public.occasion_participants where occasion_id = :'bob_occasion_id';

\echo '=== occasion_group_budgets ==='

\echo '--- alice sets a budget for HER OWN group on HER OWN occasion: should SUCCEED ---'
insert into public.occasion_group_budgets (occasion_id, group_id, budget)
values (:'alice_occasion_id', :'alice_group_id', 150.00)
returning id, budget;

\echo '--- alice tries to set a group budget on BOB''s KNOWN occasion: should FAIL (RLS) ---'
insert into public.occasion_group_budgets (occasion_id, group_id, budget)
values (:'bob_occasion_id', :'alice_group_id', 999.00);

\echo '=== occasions ==='

\echo '--- alice selects occasions: should see only her own ---'
select name from public.occasions order by name;

\echo '--- alice updates her own occasion budget: should SUCCEED ---'
update public.occasions set budget = 250.00 where id = :'alice_occasion_id';
select name, budget from public.occasions where id = :'alice_occasion_id';

\echo '--- alice deletes her own occasion (cascade should remove participants + group budgets): should SUCCEED ---'
delete from public.occasions where id = :'alice_occasion_id';
select count(*) as remaining_participants from public.occasion_participants where occasion_id = :'alice_occasion_id';
select count(*) as remaining_group_budgets from public.occasion_group_budgets where occasion_id = :'alice_occasion_id';

reset role;
