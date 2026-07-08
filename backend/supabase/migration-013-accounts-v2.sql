-- ═══════════════════════════════════════════════════════════════════════════
-- StayOn migration 013 — Accounts v2 (SOU/SOH codes, normalized spaces)
--
-- APPROVED design from db/SCHEMA_PROPOSAL.md. Run ONCE in Supabase → SQL Editor.
--
-- SAFE & ADDITIVE: adds columns/tables/constraints only — never drops or renames,
-- so the running apps keep working. New features (settings, payment methods,
-- payments, SOU/SOH codes) activate the moment this runs. ACID-safe: uniqueness
-- and FKs are enforced by the database, so NO duplicate or mismatched rows can
-- ever exist, even under concurrency.
--
-- Idempotent: every statement is IF NOT EXISTS / guarded, so re-running is safe.
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ── 1. SOU / SOH human-readable codes on the account ────────────────────────
alter table users add column if not exists user_code text;
alter table users add column if not exists host_code text;
alter table users add column if not exists is_host  boolean not null default false;

-- Backfill any existing rows that lack a user_code (SOU-XXXXXXXX, crockford-ish)
update users
set user_code = 'SOU-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))
where user_code is null;

-- Hosts (anyone who already owns a listing) get an SOH code + is_host flag
update users u
set host_code = coalesce(u.host_code, 'SOH-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,8))),
    is_host   = true
where exists (select 1 from listings l where l.host_id = u.id);

-- Uniqueness → the SAME code can never map to two accounts (no duplicates)
create unique index if not exists users_user_code_key on users (user_code) where user_code is not null;
create unique index if not exists users_host_code_key on users (host_code) where host_code is not null;

-- Identity uniqueness (one phone / email / clerk id = one human)
create unique index if not exists users_phone_key on users (phone)    where phone    is not null;
create unique index if not exists users_email_key on users (email)    where email    is not null;
create unique index if not exists users_clerk_key on users (clerk_id) where clerk_id is not null;

-- ── 2. auth_methods — every login method, each independently verified ────────
create table if not exists auth_methods (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references users(id) on delete cascade,
  kind        text not null check (kind in ('phone','email','google','apple')),
  identifier  text not null,
  provider_ref text,
  verified    boolean not null default false,
  verified_at timestamptz,
  is_primary  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (kind, identifier)               -- one phone/email/social id → one account
);
create index if not exists auth_methods_user_idx on auth_methods (user_id);

-- Backfill from existing users (so history is consistent, no mismatches)
insert into auth_methods (user_id, kind, identifier, verified, is_primary)
select id, 'phone', phone, true, true from users where phone is not null
on conflict (kind, identifier) do nothing;
insert into auth_methods (user_id, kind, identifier, provider_ref, verified)
select id, 'email', email, clerk_id, true from users where email is not null
on conflict (kind, identifier) do nothing;

-- ── 3. Verification (KYC) — add gender + explicit selfie/doc columns ─────────
alter table identities add column if not exists gender          text;
alter table identities add column if not exists selfie_url      text;
alter table identities add column if not exists id_doc_front_url text;
alter table identities add column if not exists id_doc_back_url  text;
alter table identities add column if not exists locked          boolean not null default false;
-- keep existing docs jsonb; new columns are the normalized home going forward.
create unique index if not exists identities_id_hash_key on identities (id_hash) where id_hash is not null;

-- ── 4. user_settings — synced prefs (was device-local only) ─────────────────
create table if not exists user_settings (
  user_id       uuid primary key references users(id) on delete cascade,
  language      text not null default 'en',
  currency      text not null default 'USD',
  notif_push    boolean not null default true,
  notif_email   boolean not null default true,
  notif_sms     boolean not null default false,
  privacy       jsonb  not null default '{}'::jsonb,
  accessibility jsonb  not null default '{}'::jsonb,
  updated_at    timestamptz not null default now()
);

-- ── 5. payment_methods — guest saved cards (masked + token only) ────────────
create table if not exists payment_methods (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references users(id) on delete cascade,
  kind         text not null check (kind in ('card','upi','wallet')),
  brand        text,
  masked_last4 text,
  provider_ref text,                       -- gateway token; NEVER raw card data
  is_default   boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists payment_methods_user_idx on payment_methods (user_id);

-- ── 6. payments — one row per money movement (normalized out of bookings) ────
create table if not exists payments (
  id                   uuid primary key default uuid_generate_v4(),
  booking_id           uuid references bookings(id) on delete set null,
  booking_code         text,
  user_id              uuid references users(id),
  kind                 text not null check (kind in ('charge','refund','payout')),
  amount_usd           numeric not null,
  currency             text not null default 'USD',
  provider             text,
  provider_intent_id   text,
  provider_transfer_id text,
  payment_method_id    uuid references payment_methods(id) on delete set null,
  status               text not null default 'held',
  created_at           timestamptz not null default now()
);
create index if not exists payments_booking_idx on payments (booking_id);
create index if not exists payments_user_idx    on payments (user_id, created_at desc);

-- ── 7. Booking integrity (from live-hardening, folded in for one-shot) ───────
create extension if not exists btree_gist;
do $$ begin
  alter table bookings
    add constraint bookings_no_overlap
    exclude using gist (
      listing_id with =,
      daterange(check_in::date, check_out::date, '[)') with &&
    ) where (status <> 'cancelled');
exception when duplicate_object then null; end $$;

create unique index if not exists listings_host_title_city_uk
  on listings (host_id, lower(title), lower(city)) where status <> 'removed';

-- ── 8. Read-path indexes for every dedicated space ──────────────────────────
create index if not exists bookings_guest_idx    on bookings (guest_id, created_at desc);
create index if not exists reservations_host_idx on reservations (host_id, created_at desc);
create index if not exists listings_host_idx     on listings (host_id, created_at desc);
create index if not exists wishlists_user_idx    on wishlists (user_id);
create index if not exists notifications_user_idx on notifications (user_id, created_at desc);

-- ═══ Done. New tables/columns are live; the backend fills them going forward.
