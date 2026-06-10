-- StayOn migration 007 — let Ops HOLD a host payout while an issue is unresolved.
-- Run once in Supabase SQL Editor.

alter table bookings add column if not exists payout_held boolean default false;
alter table bookings add column if not exists hold_reason text;
alter table bookings add column if not exists payout_paid boolean default false;
