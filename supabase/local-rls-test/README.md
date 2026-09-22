# Local RLS test harness

Exercises the migrations in `../migrations/` against a throwaway local
Postgres database, without needing a real Supabase project or network
access. Useful for verifying schema/RLS changes before applying them to
the hosted project.

```sh
createdb giftly_test
psql -d giftly_test -v ON_ERROR_STOP=1 -f 00-auth-stub.sql      # fakes Supabase's auth schema
psql -d giftly_test -v ON_ERROR_STOP=1 -f 00b-storage-stub.sql  # fakes Supabase's storage schema
psql -d giftly_test -v ON_ERROR_STOP=1 -f ../migrations/0001_init.sql
psql -d giftly_test -v ON_ERROR_STOP=1 -f ../migrations/0002_people_details.sql
psql -d giftly_test -v ON_ERROR_STOP=1 -f ../migrations/0003_avatars_storage.sql

psql -d giftly_test -v ON_ERROR_STOP=1 -f 01-setup-role.sql     # seeds alice + bob, non-superuser role
psql -d giftly_test -v ON_ERROR_STOP=1 -c "
  grant usage on schema storage to app_user;
  grant select, insert, update, delete on storage.objects to app_user;
  grant select on storage.buckets to app_user;
  grant execute on function public.is_person_network_member(uuid,uuid) to app_user;
"

psql -d giftly_test -f 02-rls-scenarios.sql                     # Phase 1: people/groups/networks isolation
psql -d giftly_test -f 03-people-details-scenarios.sql          # Phase 2: person_attributes/gifts/avatar storage isolation

dropdb giftly_test                                              # cleanup
psql -c "drop role if exists app_user;"
```
