-- Minimal stand-in for Supabase's managed `storage` schema, just enough to
-- exercise 0003_avatars_storage.sql's policies locally.
create schema if not exists storage;

create table storage.buckets (
  id text primary key,
  name text not null,
  public boolean not null default false
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text references storage.buckets (id),
  name text,
  owner uuid,
  created_at timestamptz not null default now()
);

-- Real Supabase projects already have RLS enabled on storage.objects; our
-- stub needs to do it explicitly since we just created the table fresh.
alter table storage.objects enable row level security;

-- Matches the real storage.foldername(): all path segments except the
-- last (e.g. 'net-id/person-id-123.jpg' -> ARRAY['net-id']).
create or replace function storage.foldername(name text)
returns text[]
language plpgsql
as $$
declare
  _parts text[];
begin
  select string_to_array(name, '/') into _parts;
  return _parts[1 : array_length(_parts, 1) - 1];
end;
$$;
