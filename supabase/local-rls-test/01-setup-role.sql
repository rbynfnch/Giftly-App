-- Superusers bypass RLS unconditionally, so we need a normal role (mirrors
-- Supabase's "authenticated" role) to actually exercise the policies.
drop role if exists app_user;
create role app_user nosuperuser nobypassrls login;
grant usage on schema public, auth to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant execute on all functions in schema public to app_user;
grant select on auth.users to app_user;
grant execute on function auth.uid() to app_user;

-- Seed two auth users; the trigger creates their public.users row + a
-- default personal network + owner membership automatically.
insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', 'alice@example.com', '{"display_name":"Alice"}'),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.com', '{"display_name":"Bob"}');
