-- Giftly: add "delivered" as a gift status, between purchased and wrapped -
-- for online orders, the gap between "I bought it" and "it showed up so I
-- can wrap it" is its own useful checkpoint.
-- Run this in the Supabase SQL Editor after 0008_person_color.sql.

alter table public.gifts drop constraint if exists gifts_status_check;
alter table public.gifts add constraint gifts_status_check
  check (status in ('idea', 'purchased', 'delivered', 'wrapped', 'gifted'));
