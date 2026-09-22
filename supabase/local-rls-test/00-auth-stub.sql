-- Minimal stand-in for Supabase's managed `auth` schema, just enough to
-- exercise our migration's triggers and RLS policies locally.
create extension if not exists pgcrypto;

create schema if not exists auth;

create table auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- Supabase's auth.uid() reads the JWT "sub" claim from the request's
-- Postgres session settings. We fake that with a settable session var.
create or replace function auth.uid()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
