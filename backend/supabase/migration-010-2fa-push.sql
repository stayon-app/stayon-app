-- StayOn migration 010 — ops 2FA (TOTP) + push notification tokens.
-- Run once in Supabase SQL Editor.

alter table staff add column if not exists totp_secret text;
alter table staff add column if not exists totp_enabled boolean default false;

alter table users add column if not exists push_token text;
