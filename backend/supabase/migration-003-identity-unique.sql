-- StayOn migration 003 — enforce ONE person = ONE identity (anti-fraud).
-- Run once in Supabase → SQL Editor → paste → Run.
--
-- We never store the raw government ID. `id_hash` is a salted SHA-256 of
-- (id_type + id_number + dob). A unique index means the SAME real-world ID can
-- be linked to only ONE account — a second account submitting the same ID is
-- rejected, so one person can't hold multiple identities/accounts.

alter table identities add column if not exists id_hash text;
alter table identities add column if not exists dob date;

create unique index if not exists identities_id_hash_unique
  on identities (id_hash)
  where id_hash is not null;
