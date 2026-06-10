-- StayOn migration 006 — store ID document + selfie images for KYC review.
-- Run once in Supabase SQL Editor. `docs` holds { front, back, selfie } URLs
-- (the actual images live in Supabase Storage, like listing photos).

alter table identities add column if not exists docs jsonb default '{}'::jsonb;
