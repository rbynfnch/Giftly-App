\set ON_ERROR_STOP off
set role app_user;

\echo '--- alice adds a person in her own network: should SUCCEED ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name, relationship)
select network_id, auth.uid(), 'Charlie (Alice''s friend)', 'Friend' from alice_network
returning id, full_name;

\echo '--- bob adds a person in his own network: should SUCCEED ---'
select set_config('request.jwt.claim.sub', '22222222-2222-2222-2222-222222222222', false);
with bob_network as (select network_id from public.network_members where user_id = auth.uid() limit 1)
insert into public.people (network_id, created_by, full_name, relationship)
select network_id, auth.uid(), 'Dana (Bob''s friend)', 'Friend' from bob_network
returning id, full_name;

\echo '--- alice selects people: should see ONLY Charlie, not Dana ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select full_name from public.people order by full_name;

\echo '--- alice tries to insert a person into BOB''s network directly: should FAIL (0 rows affected / RLS violation) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.people (network_id, created_by, full_name)
select network_id, '11111111-1111-1111-1111-111111111111', 'Eve (should not be allowed)'
from public.network_members where user_id = '22222222-2222-2222-2222-222222222222' limit 1;

\echo '--- alice tries to read bob''s public.users row: should return 0 rows (different networks) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
select display_name from public.users where id = '22222222-2222-2222-2222-222222222222';

\echo '--- alice tries to insert a group_id from a DIFFERENT network onto her person: should FAIL (trigger check) ---'
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', false);
insert into public.groups (network_id, created_by, name)
select network_id, auth.uid(), 'Bob''s Coworkers'
from public.network_members where user_id = '22222222-2222-2222-2222-222222222222' limit 1;

with alice_network as (select network_id from public.network_members where user_id = auth.uid() limit 1),
     bobs_group as (select id from public.groups where name = 'Bob''s Coworkers' limit 1)
update public.people
set group_id = (select id from bobs_group)
where full_name = 'Charlie (Alice''s friend)';

\echo '--- alice updates her own person: should SUCCEED ---'
update public.people set notes = 'Loves board games' where full_name = 'Charlie (Alice''s friend)';
select full_name, notes from public.people where full_name = 'Charlie (Alice''s friend)';

\echo '--- alice deletes her own person: should SUCCEED ---'
delete from public.people where full_name = 'Charlie (Alice''s friend)';
select count(*) as alice_remaining_people from public.people;

reset role;
