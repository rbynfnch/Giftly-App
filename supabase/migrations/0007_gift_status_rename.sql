-- Giftly: rename gift statuses to Idea / Purchased / Wrapped / Gifted.
-- "Planned" is retired - there's no longer a separate "decided but not
-- bought" stage, so existing rows fold back into Idea - and "given" is
-- renamed to "gifted" to make room for the new "wrapped" stage before it.
-- Run this in the Supabase SQL Editor after 0006_gift_store.sql.

alter table public.gifts drop constraint if exists gifts_status_check;

update public.gifts set status = 'idea' where status = 'planned';
update public.gifts set status = 'gifted' where status = 'given';

alter table public.gifts add constraint gifts_status_check
  check (status in ('idea', 'purchased', 'wrapped', 'gifted'));
