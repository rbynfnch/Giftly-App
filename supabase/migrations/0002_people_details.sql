-- Giftly Phase 2: richer people profiles.
-- - people.interests (freeform tags)
-- - person_attributes: flexible label/value rows for arbitrary custom
--   fields (sizes, preferences, etc.) instead of fixed columns
-- - gifts: schema groundwork only (Phase 4 builds the UI). No occasion_id
--   yet since the occasions table doesn't exist until Phase 3.
-- Run this in the Supabase SQL Editor after 0001_init.sql.

alter table public.people
  add column if not exists interests text[] not null default '{}'::text[];

-- ---------------------------------------------------------------------------
-- person_attributes
-- ---------------------------------------------------------------------------

create table if not exists public.person_attributes (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references public.people (id) on delete cascade,
  category text not null default 'Other',
  label text not null,
  value text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists person_attributes_person_id_idx on public.person_attributes (person_id);

drop trigger if exists set_person_attributes_updated_at on public.person_attributes;
create trigger set_person_attributes_updated_at
  before update on public.person_attributes
  for each row execute function public.set_updated_at();

-- Security-definer helper: is the current user a member of the network
-- that owns this person? Joins through people rather than denormalizing
-- network_id onto person_attributes, since attributes never move between
-- networks independently of their person.
create or replace function public.is_person_network_member(_person_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.people p
    join public.network_members nm on nm.network_id = p.network_id
    where p.id = _person_id and nm.user_id = _user_id
  );
$$;

alter table public.person_attributes enable row level security;

drop policy if exists "person_attributes_select_members" on public.person_attributes;
create policy "person_attributes_select_members" on public.person_attributes
  for select using (public.is_person_network_member(person_id));

drop policy if exists "person_attributes_insert_members" on public.person_attributes;
create policy "person_attributes_insert_members" on public.person_attributes
  for insert with check (public.is_person_network_member(person_id) and created_by = auth.uid());

drop policy if exists "person_attributes_update_members" on public.person_attributes;
create policy "person_attributes_update_members" on public.person_attributes
  for update using (public.is_person_network_member(person_id));

drop policy if exists "person_attributes_delete_members" on public.person_attributes;
create policy "person_attributes_delete_members" on public.person_attributes
  for delete using (public.is_person_network_member(person_id));

-- ---------------------------------------------------------------------------
-- gifts (schema only; no creation UI until Phase 4)
-- ---------------------------------------------------------------------------

create table if not exists public.gifts (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  created_by uuid not null references public.users (id) on delete cascade,
  title text not null,
  status text not null default 'idea' check (status in ('idea', 'planned', 'purchased', 'given')),
  price numeric(10, 2),
  url text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gifts_network_id_idx on public.gifts (network_id);
create index if not exists gifts_person_id_idx on public.gifts (person_id);

drop trigger if exists set_gifts_updated_at on public.gifts;
create trigger set_gifts_updated_at
  before update on public.gifts
  for each row execute function public.set_updated_at();

-- A gift's network must match the network of the person it's for (same
-- integrity check as check_person_group_network in 0001).
create or replace function public.check_gift_person_network()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.people p where p.id = new.person_id and p.network_id = new.network_id
  ) then
    raise exception 'network_id must match the network of person_id';
  end if;
  return new;
end;
$$;

drop trigger if exists check_gift_person_network on public.gifts;
create trigger check_gift_person_network
  before insert or update on public.gifts
  for each row execute function public.check_gift_person_network();

alter table public.gifts enable row level security;

drop policy if exists "gifts_select_members" on public.gifts;
create policy "gifts_select_members" on public.gifts
  for select using (public.is_network_member(network_id));

drop policy if exists "gifts_insert_members" on public.gifts;
create policy "gifts_insert_members" on public.gifts
  for insert with check (public.is_network_member(network_id) and created_by = auth.uid());

drop policy if exists "gifts_update_members" on public.gifts;
create policy "gifts_update_members" on public.gifts
  for update using (public.is_network_member(network_id));

drop policy if exists "gifts_delete_members" on public.gifts;
create policy "gifts_delete_members" on public.gifts
  for delete using (public.is_network_member(network_id));
