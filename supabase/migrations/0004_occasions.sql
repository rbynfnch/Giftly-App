-- Giftly Phase 3: occasions.
-- - occasions: freeform type (no fixed enum — "custom" is just the default)
-- - occasion_participants: person + optional per-person budget
-- - occasion_group_budgets: a group's budget for a specific occasion
--   (occasion-scoped, not a static property of the group itself)
-- Run this in the Supabase SQL Editor after 0003_avatars_storage.sql.

create table if not exists public.occasions (
  id uuid primary key default gen_random_uuid(),
  network_id uuid not null references public.networks (id) on delete cascade,
  name text not null,
  type text not null default 'custom',
  date date not null,
  budget numeric(10, 2),
  is_recurring_template boolean not null default false,
  created_by uuid not null references public.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists occasions_network_id_idx on public.occasions (network_id);
create index if not exists occasions_date_idx on public.occasions (date);

drop trigger if exists set_occasions_updated_at on public.occasions;
create trigger set_occasions_updated_at
  before update on public.occasions
  for each row execute function public.set_updated_at();

create table if not exists public.occasion_participants (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references public.occasions (id) on delete cascade,
  person_id uuid not null references public.people (id) on delete cascade,
  budget numeric(10, 2),
  created_at timestamptz not null default now(),
  unique (occasion_id, person_id)
);

create index if not exists occasion_participants_occasion_id_idx on public.occasion_participants (occasion_id);
create index if not exists occasion_participants_person_id_idx on public.occasion_participants (person_id);

create table if not exists public.occasion_group_budgets (
  id uuid primary key default gen_random_uuid(),
  occasion_id uuid not null references public.occasions (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  budget numeric(10, 2) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (occasion_id, group_id)
);

create index if not exists occasion_group_budgets_occasion_id_idx on public.occasion_group_budgets (occasion_id);

drop trigger if exists set_occasion_group_budgets_updated_at on public.occasion_group_budgets;
create trigger set_occasion_group_budgets_updated_at
  before update on public.occasion_group_budgets
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Helper + integrity triggers
-- ---------------------------------------------------------------------------

create or replace function public.is_occasion_network_member(_occasion_id uuid, _user_id uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.occasions o
    join public.network_members nm on nm.network_id = o.network_id
    where o.id = _occasion_id and nm.user_id = _user_id
  );
$$;

create or replace function public.check_participant_person_network()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.people p
    join public.occasions o on o.id = new.occasion_id
    where p.id = new.person_id and p.network_id = o.network_id
  ) then
    raise exception 'person_id must belong to the same network as the occasion';
  end if;
  return new;
end;
$$;

drop trigger if exists check_participant_person_network on public.occasion_participants;
create trigger check_participant_person_network
  before insert or update on public.occasion_participants
  for each row execute function public.check_participant_person_network();

create or replace function public.check_group_budget_network()
returns trigger
language plpgsql
as $$
begin
  if not exists (
    select 1
    from public.groups g
    join public.occasions o on o.id = new.occasion_id
    where g.id = new.group_id and g.network_id = o.network_id
  ) then
    raise exception 'group_id must belong to the same network as the occasion';
  end if;
  return new;
end;
$$;

drop trigger if exists check_group_budget_network on public.occasion_group_budgets;
create trigger check_group_budget_network
  before insert or update on public.occasion_group_budgets
  for each row execute function public.check_group_budget_network();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.occasions enable row level security;
alter table public.occasion_participants enable row level security;
alter table public.occasion_group_budgets enable row level security;

drop policy if exists "occasions_select_members" on public.occasions;
create policy "occasions_select_members" on public.occasions
  for select using (public.is_network_member(network_id));

drop policy if exists "occasions_insert_members" on public.occasions;
create policy "occasions_insert_members" on public.occasions
  for insert with check (public.is_network_member(network_id) and created_by = auth.uid());

drop policy if exists "occasions_update_members" on public.occasions;
create policy "occasions_update_members" on public.occasions
  for update using (public.is_network_member(network_id));

drop policy if exists "occasions_delete_members" on public.occasions;
create policy "occasions_delete_members" on public.occasions
  for delete using (public.is_network_member(network_id));

drop policy if exists "occasion_participants_select_members" on public.occasion_participants;
create policy "occasion_participants_select_members" on public.occasion_participants
  for select using (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_participants_insert_members" on public.occasion_participants;
create policy "occasion_participants_insert_members" on public.occasion_participants
  for insert with check (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_participants_update_members" on public.occasion_participants;
create policy "occasion_participants_update_members" on public.occasion_participants
  for update using (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_participants_delete_members" on public.occasion_participants;
create policy "occasion_participants_delete_members" on public.occasion_participants
  for delete using (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_group_budgets_select_members" on public.occasion_group_budgets;
create policy "occasion_group_budgets_select_members" on public.occasion_group_budgets
  for select using (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_group_budgets_insert_members" on public.occasion_group_budgets;
create policy "occasion_group_budgets_insert_members" on public.occasion_group_budgets
  for insert with check (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_group_budgets_update_members" on public.occasion_group_budgets;
create policy "occasion_group_budgets_update_members" on public.occasion_group_budgets
  for update using (public.is_occasion_network_member(occasion_id));

drop policy if exists "occasion_group_budgets_delete_members" on public.occasion_group_budgets;
create policy "occasion_group_budgets_delete_members" on public.occasion_group_budgets
  for delete using (public.is_occasion_network_member(occasion_id));
