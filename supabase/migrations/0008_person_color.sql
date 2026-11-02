-- Giftly: per-person color, picked in the Edit details dialog.
-- Shown as a subtle background tint on that person's gift cards, so a
-- gift list spanning several people reads at a glance.
-- Run this in the Supabase SQL Editor after 0007_gift_status_rename.sql.

alter table public.people add column if not exists color text;
