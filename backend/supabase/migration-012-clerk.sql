-- StayOn migration 012 — link Supabase users to Clerk identities.
-- Run once in Supabase SQL Editor.
-- Clerk is the front-end auth (web + mobile); the backend exchanges a verified
-- Clerk session for a StayOn session and maps the Clerk user to a users row.

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users (clerk_id);
