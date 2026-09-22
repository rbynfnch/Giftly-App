# Local RLS test harness

Exercises `../migrations/0001_init.sql` against a throwaway local Postgres
database, without needing a real Supabase project or network access. Useful
for verifying schema/RLS changes before applying them to the hosted project.

```sh
createdb giftly_test
psql -d giftly_test -v ON_ERROR_STOP=1 -f 00-auth-stub.sql   # fakes Supabase's auth schema
psql -d giftly_test -v ON_ERROR_STOP=1 -f ../migrations/0001_init.sql
psql -d giftly_test -v ON_ERROR_STOP=1 -f 01-setup-role.sql   # seeds alice + bob, non-superuser role
psql -d giftly_test -f 02-rls-scenarios.sql                   # runs the cross-network isolation checks
dropdb giftly_test                                            # cleanup
```
