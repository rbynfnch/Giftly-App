-- Giftly Phase 1 schema: users, networks, network_members, groups, people.
-- Run this in the Supabase SQL Editor (or `supabase db push` if you link the
-- CLI to the project) against a fresh project. Safe to re-run: guarded with
-- IF NOT EXISTS / OR REPLACE where practical, but review before re-applying
-- to a project that already has data.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Mirrors auth.users with the profile fields the app actually needs.
-- Kept separate from auth.users (which Supabase manages) rather than
-- extending it directly.
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- A "network" is a shared circle (e.g. a family) that owns people/groups
-- and controls who can see them via network_members.
create table if not exists public.networks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.network_members (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  unique (network_id, user_id)
);

create index if not exists network_members_network_id_idx on public.network_members (network_id);
create index if not exists network_members_user_id_idx on public.network_members (user_id);

create table if not exists public.groups (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists groups_network_id_idx on public.groups (network_id);

create table if not exists public.people (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  group_id uuid references public.groups (id) on delete set null,
  created_by uuid not null references public.users (id) on delete cascade,
  -- Set when this person is also a network member (e.g. a spouse), so a
  -- future gift-secrecy rule can hide gifts where recipient = current user.
  linked_user_id uuid references public.users (id) on delete set null,
  full_name text not null,
  relationship text,
  birthday date,
  notes text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists people_network_id_idx on public.people (network_id);
create index if not exists people_group_id_idx on public.people (group_id);

-- ---------------------------------------------------------------------------
-- Helper functions (security definer so RLS policies can check membership
-- without recursively re-evaluating RLS on network_members itself)
-- ---------------------------------------------------------------------------

create or replace function public.is_network_member(_network_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.network_members
    where network_id = _network_id and user_id = _user_id
  );
$$;

create or replace function public.is_network_owner(_network_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.network_members
    where network_id = _network_id and user_id = _user_id and role = 'owner'
  );
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

-- New auth user -> create their public.users row and a default personal
-- network so People CRUD has somewhere to write immediately after sign-up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)));

  insert into public.networks (name, created_by)
  values ('My Network', new.id);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- New network -> add its creator as owner in network_members.
create or replace function public.handle_new_network()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.network_members (network_id, user_id, role)
  values (new.id, new.created_by, 'owner');
  return new;
end;
$$;

drop trigger if exists on_network_created on public.networks;
create trigger on_network_created
  after insert on public.networks
  for each row execute function public.handle_new_network();

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_people_updated_at on public.people;
create trigger set_people_updated_at
  before update on public.people
  for each row execute function public.set_updated_at();

-- A person's group must belong to the same network as the person.
create or replace function public.check_person_group_network()
returns trigger
language plpgsql
as $$
begin
  if new.group_id is not null and not exists (
    select 1 from public.groups g where g.id = new.group_id and g.network_id = new.network_id
  ) then
    raise exception 'group_id must belong to the same network as the person';
  end if;
  return new;
end;
$$;

drop trigger if exists check_people_group_network on public.people;
create trigger check_people_group_network
  before insert or update on public.people
  for each row execute function public.check_person_group_network();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.users enable row level security;
alter table public.networks enable row level security;
alter table public.network_members enable row level security;
alter table public.groups enable row level security;
alter table public.people enable row level security;

-- users: see your own row, and rows of people who share a network with you.
drop policy if exists "users_select_self_or_networkmates" on public.users;
create policy "users_select_self_or_networkmates" on public.users
  for select using (
    id = auth.uid()
    or exists (
      select 1 from public.network_members mine
      join public.network_members theirs on theirs.network_id = mine.network_id
      where mine.user_id = auth.uid() and theirs.user_id = public.users.id
    )
  );

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- networks: members can see it; only the creator can insert (as themselves);
-- only owners can update/delete.
drop policy if exists "networks_select_members" on public.networks;
create policy "networks_select_members" on public.networks
  for select using (public.is_network_member(id));

drop policy if exists "networks_insert_self" on public.networks;
create policy "networks_insert_self" on public.networks
  for insert with check (created_by = auth.uid());

drop policy if exists "networks_update_owner" on public.networks;
create policy "networks_update_owner" on public.networks
  for update using (public.is_network_owner(id));

drop policy if exists "networks_delete_owner" on public.networks;
create policy "networks_delete_owner" on public.networks
  for delete using (public.is_network_owner(id));

-- network_members: members can see the roster; only owners can add/remove
-- members (the initial owner row is inserted by the trigger above, which
-- runs as security definer and bypasses this policy).
drop policy if exists "network_members_select" on public.network_members;
create policy "network_members_select" on public.network_members
  for select using (public.is_network_member(network_id));

drop policy if exists "network_members_insert_owner" on public.network_members;
create policy "network_members_insert_owner" on public.network_members
  for insert with check (public.is_network_owner(network_id));

drop policy if exists "network_members_delete_owner_or_self" on public.network_members;
create policy "network_members_delete_owner_or_self" on public.network_members
  for delete using (public.is_network_owner(network_id) or user_id = auth.uid());

-- groups: any network member can manage groups in their network.
drop policy if exists "groups_select_members" on public.groups;
create policy "groups_select_members" on public.groups
  for select using (public.is_network_member(network_id));

drop policy if exists "groups_insert_members" on public.groups;
create policy "groups_insert_members" on public.groups
  for insert with check (public.is_network_member(network_id) and created_by = auth.uid());

drop policy if exists "groups_update_members" on public.groups;
create policy "groups_update_members" on public.groups
  for update using (public.is_network_member(network_id));

drop policy if exists "groups_delete_members" on public.groups;
create policy "groups_delete_members" on public.groups
  for delete using (public.is_network_member(network_id));

-- people: any network member can manage people in their network.
drop policy if exists "people_select_members" on public.people;
create policy "people_select_members" on public.people
  for select using (public.is_network_member(network_id));

drop policy if exists "people_insert_members" on public.people;
create policy "people_insert_members" on public.people
  for insert with check (public.is_network_member(network_id) and created_by = auth.uid());

drop policy if exists "people_update_members" on public.people;
create policy "people_update_members" on public.people
  for update using (public.is_network_member(network_id));

drop policy if exists "people_delete_members" on public.people;
create policy "people_delete_members" on public.people
  for delete using (public.is_network_member(network_id));
