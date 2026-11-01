-- Giftly Phase 5: group gifts by store.
-- Freeform text, not an enum - consistent with occasion.type and
-- person_attributes.category elsewhere in this app. The UI auto-suggests
-- a store name from a gift's URL domain when one is entered, but it's
-- always editable/overridable.
-- Run this in the Supabase SQL Editor after 0005_gifts_bundles.sql.

alter table public.gifts
  add column if not exists store text;
