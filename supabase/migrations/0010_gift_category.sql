-- Giftly: gift category (Books, Games, Clothes, Toys, etc).
-- Freeform text, not an enum - same pattern as store/occasion.type
-- elsewhere in this app. Powers the category filter on each person's
-- Gift History section.
-- Run this in the Supabase SQL Editor after 0009_gift_status_delivered.sql.

alter table public.gifts add column if not exists category text;
