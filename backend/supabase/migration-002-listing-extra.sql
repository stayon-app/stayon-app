-- StayOn migration 002 — store the rest of the host's listing details.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

alter table listings add column if not exists extra jsonb default '{}'::jsonb;

-- (weekend_price_usd / cleaning_fee_usd columns already exist from schema.sql)
-- `extra` (schemaless jsonb) holds everything else the host sets:
--   { houseRules, petsAllowed, cancellation, checkIn, checkOut, minNights,
--     safety, baseGuests, extraGuestFeeUSD }   ← incl. guest-based pricing
