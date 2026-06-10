-- StayOn migration 009 — payment + payout-account columns (escrow pipeline).
-- Run once in Supabase SQL Editor.

alter table bookings add column if not exists payment_intent_id text;
alter table bookings add column if not exists payment_status text default 'unpaid'; -- unpaid | held | paid | refunded
alter table bookings add column if not exists transfer_id text;

alter table users add column if not exists payout_account_id text;
alter table users add column if not exists payouts_enabled boolean default false;

alter table staff add column if not exists pin text; -- per-staff step-up PIN (optional)
