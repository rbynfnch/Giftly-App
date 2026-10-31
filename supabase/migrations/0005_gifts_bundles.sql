-- Giftly Phase 4: gift tracking + bundles.
-- - gifts gets occasion_id (nullable - a gift doesn't have to be tied to
--   a specific occasion) and bundle_id (nullable - groups several gifts
--   given together as one unit, e.g. a "spa day" bundle)
-- - gift_bundles: a named grouping for one person's gifts, optionally
--   scoped to one occasion
-- - gift secrecy: a person's own gifts are hidden from them if their
--   people row is linked to their own account (people.linked_user_id),
--   so a surprise stays a surprise. This has no UI to link an account to
--   a person yet (that needs a network-invite flow this app doesn't have
--   yet), so it's inert until a future phase adds that - but the RLS is
--   correct now while we're already touching this table.
-- Run this in the Supabase SQL Editor after 0004_occasions.sql.

create table if not exists public.gift_bundles (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  occasion_id uuid references public.occasions (id) on delete set null,
  name text not null,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists gift_bundles_person_id_idx on public.gift_bundles (person_id);
create index if not exists gift_bundles_occasion_id_idx on public.gift_bundles (occasion_id);

drop trigger if exists set_gift_bundles_updated_at on public.gift_bundles;
create trigger set_gift_bundles_updated_at
  before update on public.gift_bundles
  for each row execute function public.set_updated_at();

alter table public.gifts
  add column if not exists occasion_id uuid references public.occasions (id) on delete set null,
  add column if not exists bundle_id uuid references public.gift_bundles (id) on delete set null;

create index if not exists gifts_occasion_id_idx on public.gifts (occasion_id);
create index if not exists gifts_bundle_id_idx on public.gifts (bundle_id);

-- ---------------------------------------------------------------------------
-- Integrity triggers
-- ---------------------------------------------------------------------------

-- A bundle's person and (optional) occasion must belong to its own network.
create or replace function public.check_bundle_network()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1 from public.people p where p.id = new.person_id and p.network_id = new.network_id
  ) then
    raise exception 'person_id must belong to the same network as the bundle';
  end if;
  if new.occasion_id is not null and not exists (
    select 1 from public.occasions o where o.id = new.occasion_id and o.network_id = new.network_id
  ) then
    raise exception 'occasion_id must belong to the same network as the bundle';
  end if;
  return new;
end;
$$;

drop trigger if exists check_bundle_network on public.gift_bundles;
create trigger check_bundle_network
  before insert or update on public.gift_bundles
  for each row execute function public.check_bundle_network();

-- A gift's occasion (if set) must share its network, and its bundle (if
-- set) must belong to the same person as the gift.
create or replace function public.check_gift_occasion_and_bundle()
returns trigger
language plpgsql
as $$
begin
  if new.occasion_id is not null and not exists (
    select 1 from public.occasions o where o.id = new.occasion_id and o.network_id = new.network_id
  ) then
    raise exception 'occasion_id must belong to the same network as the gift';
  end if;
  if new.bundle_id is not null and not exists (
    select 1 from public.gift_bundles b where b.id = new.bundle_id and b.person_id = new.person_id
  ) then
    raise exception 'bundle_id must belong to the same person as the gift';
  end if;
  return new;
end;
$$;

drop trigger if exists check_gift_occasion_and_bundle on public.gifts;
create trigger check_gift_occasion_and_bundle
  before insert or update on public.gifts
  for each row execute function public.check_gift_occasion_and_bundle();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.gift_bundles enable row level security;

-- Secrecy: a gift (or bundle) is invisible to the person it's for, when
-- that person's row is linked to the viewer's own account.
create or replace function public.is_gift_hidden_from_viewer(_person_id uuid, _viewer_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1 from public.people p where p.id = _person_id and p.linked_user_id = _viewer_id
  );
$$;

drop policy if exists "gift_bundles_select_members" on public.gift_bundles;
create policy "gift_bundles_select_members" on public.gift_bundles
  for select using (public.is_network_member(network_id) and not public.is_gift_hidden_from_viewer(person_id));

drop policy if exists "gift_bundles_insert_members" on public.gift_bundles;
create policy "gift_bundles_insert_members" on public.gift_bundles
  for insert with check (public.is_network_member(network_id) and created_by = auth.uid());

drop policy if exists "gift_bundles_update_members" on public.gift_bundles;
create policy "gift_bundles_update_members" on public.gift_bundles
  for update using (public.is_network_member(network_id));

drop policy if exists "gift_bundles_delete_members" on public.gift_bundles;
create policy "gift_bundles_delete_members" on public.gift_bundles
  for delete using (public.is_network_member(network_id));

-- Replace the Phase 2 gifts_select_members policy to add the secrecy check.
drop policy if exists "gifts_select_members" on public.gifts;
create policy "gifts_select_members" on public.gifts
  for select using (public.is_network_member(network_id) and not public.is_gift_hidden_from_viewer(person_id));
