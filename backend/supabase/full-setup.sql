-- StayOn — full database setup (schema + migrations 002-012, in order).
-- Paste this whole file into the Supabase SQL Editor and Run. Idempotent-safe.


-- ============================================================
-- schema.sql
-- ============================================================
-- StayOn — Supabase schema. Paste into Supabase SQL Editor and Run.
-- Safe to re-run (drops & recreates). Creates tables + seeds the Ops account
-- and a starter catalogue so /search isn't empty.

create extension if not exists "uuid-ossp";
create extension if not exists postgis;

-- ---- enums -------------------------------------------------------------
do $$ begin
  create type user_status     as enum ('active','suspended','banned');
  create type staff_role      as enum ('super_admin','ops_manager','trust_safety','kyc_reviewer','content_mod','finance','support','compliance','analyst');
  create type kyc_status      as enum ('unverified','pending','verified','rejected');
  create type listing_status  as enum ('draft','pending_review','published','rejected','snoozed');
  create type booking_status  as enum ('pending','confirmed','completed','cancelled');
  create type request_status  as enum ('pending','approved','rejected');
  create type content_status  as enum ('pending','live','rejected');
  create type report_status   as enum ('open','reviewing','resolved','dismissed');
exception when duplicate_object then null; end $$;

-- ---- tables ------------------------------------------------------------
create table if not exists users (
  id uuid primary key default uuid_generate_v4(),
  phone text unique, email text unique, name text, avatar_url text,
  country_code text, status user_status not null default 'active',
  created_at timestamptz not null default now()
);

create table if not exists staff (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null, name text, role staff_role not null,
  active boolean not null default true, created_at timestamptz not null default now()
);

create table if not exists identities (
  user_id uuid primary key references users(id) on delete cascade,
  legal_name text, dob date, id_type text, id_last4 text,
  provider text, provider_ref text,
  status kyc_status not null default 'unverified',
  submitted_at timestamptz, reviewed_by uuid, reviewed_at timestamptz
);

create table if not exists listings (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references users(id), host_name text,
  title text, type text, place_type text, description text,
  address text, city text, state text, country text, zipcode text,
  lat double precision, lng double precision,
  geo geography(Point,4326),
  guests int, bedrooms int, beds int, bathrooms numeric(3,1), bathroom_kind text,
  price_usd int, weekend_price_usd int, cleaning_fee_usd int, currency text default 'USD',
  images jsonb default '[]', videos jsonb default '[]',
  amenities text[] default '{}', vibes text[] default '{}', highlights text[] default '{}',
  instant_book boolean default false,
  status listing_status not null default 'draft', reject_reason text,
  rating_avg numeric(2,1) default 0, rating_count int default 0,
  created_at timestamptz not null default now()
);
create index if not exists listings_geo_idx on listings using gist (geo);
create index if not exists listings_status_idx on listings (status);
create index if not exists listings_city_idx on listings (lower(city));

create table if not exists calendar (
  listing_id uuid references listings(id) on delete cascade,
  day date not null, price_usd int, blocked boolean default false,
  primary key (listing_id, day)
);

create table if not exists bookings (
  id uuid primary key default uuid_generate_v4(),
  code text unique not null,
  listing_id uuid references listings(id), listing_title text,
  guest_id uuid references users(id), guest_name text, host_id uuid references users(id),
  check_in date, check_out date, nights int, guests int,
  subtotal_usd int, cleaning_usd int, taxes_usd int, platform_fee_usd int default 0, total_usd int,
  status booking_status not null default 'pending', cancel_reason text, refund_usd int,
  created_at timestamptz not null default now()
);
create index if not exists bookings_guest_idx on bookings (guest_id);
create index if not exists bookings_host_idx on bookings (host_id);

create table if not exists reservations (
  id uuid primary key default uuid_generate_v4(),
  code text not null, listing_id uuid, listing_title text,
  host_id uuid references users(id), guest_id uuid, guest_name text,
  check_in date, check_out date, nights int, rate_usd int,
  status booking_status not null default 'pending', instant boolean default false,
  created_at timestamptz not null default now()
);
create index if not exists reservations_host_idx on reservations (host_id);
create index if not exists reservations_code_idx on reservations (code);

create table if not exists threads (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid, listing_title text,
  guest_id uuid references users(id), guest_name text, host_id uuid references users(id),
  last_at timestamptz default now(),
  unique (listing_id, guest_id)
);
create table if not exists messages (
  id uuid primary key default uuid_generate_v4(),
  thread_id uuid references threads(id) on delete cascade,
  sender text, text text, created_at timestamptz not null default now()
);
create index if not exists messages_thread_idx on messages (thread_id, created_at);

create table if not exists reviews (
  id uuid primary key default uuid_generate_v4(),
  booking_id uuid, listing_id uuid references listings(id),
  author_id uuid references users(id), author_name text,
  direction text, rating int check (rating between 1 and 5),
  text text, response text, removed boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists reels (
  id uuid primary key default uuid_generate_v4(),
  author_id uuid references users(id), listing_id uuid,
  kind text, media_url text, thumb_url text, caption text,
  status content_status not null default 'pending', reject_reason text,
  created_at timestamptz not null default now()
);

create table if not exists reports (
  id uuid primary key default uuid_generate_v4(),
  reporter_id uuid references users(id),
  target_type text, target_id text, reason text, details text,
  status report_status not null default 'open', assigned_to uuid, resolution text,
  created_at timestamptz not null default now()
);

create table if not exists payout_methods (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references users(id), kind text, masked_label text, provider_ref text,
  verified boolean default false, is_default boolean default false
);
create table if not exists payout_change_requests (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid references users(id), requested jsonb, proof_url text,
  status request_status not null default 'pending',
  submitted_at timestamptz not null default now(), reviewed_by uuid, reviewed_at timestamptz, reject_reason text
);

create table if not exists wishlists (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id), listing_id uuid,
  created_at timestamptz not null default now(), unique (user_id, listing_id)
);

create table if not exists notifications (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id), type text, payload jsonb, read boolean default false,
  created_at timestamptz not null default now()
);

create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_id uuid, action text, target_type text, target_id text, meta jsonb,
  created_at timestamptz not null default now()
);

-- keep geo column in sync with lat/lng
create or replace function set_geo() returns trigger as $$
begin
  if new.lat is not null and new.lng is not null then
    new.geo := ST_SetSRID(ST_MakePoint(new.lng, new.lat), 4326)::geography;
  end if;
  return new;
end $$ language plpgsql;
drop trigger if exists listings_geo on listings;
create trigger listings_geo before insert or update on listings
  for each row execute function set_geo();

-- ---- seed --------------------------------------------------------------
insert into staff (email, name, role)
values ('ops@stayon.com','Ops Admin','super_admin')
on conflict (email) do nothing;

-- a seed host + starter catalogue (published) so /search has data
insert into users (id, phone, name, country_code)
values ('00000000-0000-0000-0000-0000000000aa','+910000000000','StayOn Host','IN')
on conflict (id) do nothing;

insert into listings (host_id, host_name, title, type, city, country, lat, lng, guests, bedrooms, beds, bathrooms, price_usd, cleaning_fee_usd, images, amenities, vibes, instant_book, status, rating_avg, rating_count)
values
 ('00000000-0000-0000-0000-0000000000aa','Asha R','Sunlit Loft by the Beach','Loft','Goa','India',15.4909,73.8278,4,2,3,2,110,15,'["https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80&auto=format&fit=crop"]','{wifi,kitchen,ac}','{beach}',true,'published',4.9,132),
 ('00000000-0000-0000-0000-0000000000aa','StayOn Host','Palm Garden Villa','Villa','Bali','Indonesia',-8.4095,115.1889,8,4,5,3,240,20,'["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80&auto=format&fit=crop"]','{wifi,kitchen,pool}','{pool,nature}',true,'published',4.95,210),
 ('00000000-0000-0000-0000-0000000000aa','StayOn Host','Skyline Studio','Apartment','Mumbai','India',19.076,72.8777,2,1,1,1,95,12,'["https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?w=900&q=80&auto=format&fit=crop"]','{wifi,ac}','{city}',true,'published',4.7,88),
 ('00000000-0000-0000-0000-0000000000aa','StayOn Host','Montmartre Artist Loft','Loft','Paris','France',48.8867,2.3431,3,1,2,1,180,18,'["https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=900&q=80&auto=format&fit=crop"]','{wifi,kitchen}','{city,romantic}',false,'published',4.88,156),
 ('00000000-0000-0000-0000-0000000000aa','StayOn Host','SoHo Cozy Studio','Studio','New York','USA',40.7233,-74.0030,2,1,1,1,220,20,'["https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=900&q=80&auto=format&fit=crop"]','{wifi,ac,kitchen}','{city}',true,'published',4.75,142)
on conflict do nothing;


-- ============================================================
-- migration-002-listing-extra.sql
-- ============================================================
-- StayOn migration 002 — store the rest of the host's listing details.
-- Run once in Supabase → SQL Editor → New query → paste → Run.

alter table listings add column if not exists extra jsonb default '{}'::jsonb;

-- (weekend_price_usd / cleaning_fee_usd columns already exist from schema.sql)
-- `extra` (schemaless jsonb) holds everything else the host sets:
--   { houseRules, petsAllowed, cancellation, checkIn, checkOut, minNights,
--     safety, baseGuests, extraGuestFeeUSD }   ← incl. guest-based pricing


-- ============================================================
-- migration-003-identity-unique.sql
-- ============================================================
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


-- ============================================================
-- migration-004-ops-modules.sql
-- ============================================================
-- StayOn migration 004 — Ops portal modules (Phases 2 & 3).
-- Adds the tables the new Ops modules need. Run once in Supabase SQL Editor.

create table if not exists tickets (
  id uuid primary key default uuid_generate_v4(),
  subject text, body text, category text default 'general',
  priority text default 'normal', status text default 'open',
  user_id uuid, assignee uuid, created_at timestamptz not null default now()
);

create table if not exists disputes (
  id uuid primary key default uuid_generate_v4(),
  booking_code text, kind text, opened_by uuid, against_id uuid,
  amount_usd int default 0, status text default 'open', resolution text,
  created_at timestamptz not null default now()
);

create table if not exists safety_cases (
  id uuid primary key default uuid_generate_v4(),
  severity text default 'medium', kind text, description text,
  user_id uuid, listing_id uuid, status text default 'open',
  created_at timestamptz not null default now()
);

create table if not exists markets (
  id uuid primary key default uuid_generate_v4(),
  name text, country text, currency text default 'USD',
  enabled boolean default false, tax_rate numeric default 0.12,
  created_at timestamptz not null default now()
);

create table if not exists partners (
  id uuid primary key default uuid_generate_v4(),
  name text, kind text, city text, contact text, status text default 'active',
  created_at timestamptz not null default now()
);

create table if not exists field_tasks (
  id uuid primary key default uuid_generate_v4(),
  title text, kind text default 'inspection', city text, listing_id uuid,
  assignee text, status text default 'open', notes text,
  created_at timestamptz not null default now()
);

create table if not exists region_rules (
  id uuid primary key default uuid_generate_v4(),
  region text, max_nights int, permit_required boolean default false,
  tax_note text, notes text, created_at timestamptz not null default now()
);

-- Seed (only when the table is empty, so re-running is safe).
insert into markets (name, country, currency, enabled)
select * from (values
  ('India', 'India', 'INR', true),
  ('United States', 'United States', 'USD', true),
  ('United Arab Emirates', 'United Arab Emirates', 'AED', false)
) as v(name, country, currency, enabled)
where not exists (select 1 from markets);

insert into region_rules (region, max_nights, permit_required, tax_note)
select * from (values
  ('India', 180, false, 'GST 12% applies to stays'),
  ('New York, US', 30, true, 'Permit required for stays under 30 nights')
) as v(region, max_nights, permit_required, tax_note)
where not exists (select 1 from region_rules);

insert into partners (name, kind, city)
select * from (values
  ('SparkleClean', 'cleaning', 'Mumbai'),
  ('CityKeys PM', 'property_manager', 'Goa')
) as v(name, kind, city)
where not exists (select 1 from partners);


-- ============================================================
-- migration-005-ops-v2.sql
-- ============================================================
-- StayOn migration 005 — Ops v2: fraud/risk, payout ops, maintenance, dev/release.
-- Run once in Supabase SQL Editor.

create table if not exists risk_flags (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid, subject text, kind text, severity text default 'medium',
  detail text, status text default 'open', created_at timestamptz not null default now()
);

create table if not exists bank_accounts (
  id uuid primary key default uuid_generate_v4(),
  host_id uuid, host_name text, masked text, bank text, country text,
  status text default 'pending', created_at timestamptz not null default now()
);

create table if not exists maintenance (
  id uuid primary key default uuid_generate_v4(),
  listing_id uuid, listing_title text, kind text default 'repair',
  description text, severity text default 'medium', status text default 'open',
  created_at timestamptz not null default now()
);

create table if not exists feature_flags (
  id uuid primary key default uuid_generate_v4(),
  key text unique, label text, enabled boolean default false,
  description text, created_at timestamptz not null default now()
);

create table if not exists incidents (
  id uuid primary key default uuid_generate_v4(),
  title text, severity text default 'minor', area text,
  status text default 'open', notes text, created_at timestamptz not null default now()
);

-- seed dev/release feature flags
insert into feature_flags (key, label, enabled, description)
  select 'instant_book','Instant Book',true,'Allow guests to book instantly' where not exists (select 1 from feature_flags where key='instant_book');
insert into feature_flags (key, label, enabled, description)
  select 'staybot_ai','StayBot AI concierge',true,'Guest AI assistant' where not exists (select 1 from feature_flags where key='staybot_ai');
insert into feature_flags (key, label, enabled, description)
  select 'reels','StayReels',true,'Short video reels' where not exists (select 1 from feature_flags where key='reels');
insert into feature_flags (key, label, enabled, description)
  select 'guest_pricing','Guest-based pricing',true,'Price scales with party size' where not exists (select 1 from feature_flags where key='guest_pricing');
insert into incidents (title, severity, area, status)
  select 'Sample: elevated payout-change requests','minor','finance','open' where not exists (select 1 from incidents);


-- ============================================================
-- migration-006-identity-docs.sql
-- ============================================================
-- StayOn migration 006 — store ID document + selfie images for KYC review.
-- Run once in Supabase SQL Editor. `docs` holds { front, back, selfie } URLs
-- (the actual images live in Supabase Storage, like listing photos).

alter table identities add column if not exists docs jsonb default '{}'::jsonb;


-- ============================================================
-- migration-007-payout-hold.sql
-- ============================================================
-- StayOn migration 007 — let Ops HOLD a host payout while an issue is unresolved.
-- Run once in Supabase SQL Editor.

alter table bookings add column if not exists payout_held boolean default false;
alter table bookings add column if not exists hold_reason text;
alter table bookings add column if not exists payout_paid boolean default false;


-- ============================================================
-- migration-008-dev-requests.sql
-- ============================================================
-- StayOn migration 008 — Ops → Dev requests queue (ops files product/bug requests).
-- Run once in Supabase SQL Editor.

create table if not exists dev_requests (
  id uuid primary key default uuid_generate_v4(),
  title text, kind text default 'feature',  -- feature | bug | improvement
  area text, priority text default 'normal',
  detail text, status text default 'open',   -- open | in_dev | shipped | declined
  raised_by uuid, created_at timestamptz not null default now()
);


-- ============================================================
-- migration-009-payments.sql
-- ============================================================
-- StayOn migration 009 — payment + payout-account columns (escrow pipeline).
-- Run once in Supabase SQL Editor.

alter table bookings add column if not exists payment_intent_id text;
alter table bookings add column if not exists payment_status text default 'unpaid'; -- unpaid | held | paid | refunded
alter table bookings add column if not exists transfer_id text;

alter table users add column if not exists payout_account_id text;
alter table users add column if not exists payouts_enabled boolean default false;

alter table staff add column if not exists pin text; -- per-staff step-up PIN (optional)


-- ============================================================
-- migration-010-2fa-push.sql
-- ============================================================
-- StayOn migration 010 — ops 2FA (TOTP) + push notification tokens.
-- Run once in Supabase SQL Editor.

alter table staff add column if not exists totp_secret text;
alter table staff add column if not exists totp_enabled boolean default false;

alter table users add column if not exists push_token text;


-- ============================================================
-- migration-011-auth-otp.sql
-- ============================================================
-- StayOn migration 011 — OTP-based auth + refresh tokens.
-- Run once in Supabase SQL Editor.

-- OTP codes for phone verification
CREATE TABLE IF NOT EXISTS otp_codes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  phone TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  attempts INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS otp_codes_phone_idx ON otp_codes (phone, used, expires_at);

-- Refresh tokens for session management
CREATE TABLE IF NOT EXISTS refresh_tokens (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS refresh_tokens_user_idx ON refresh_tokens (user_id, revoked);
CREATE INDEX IF NOT EXISTS refresh_tokens_token_idx ON refresh_tokens (token);

-- Cleanup: auto-delete expired OTP codes older than 1 hour (run via pg_cron or manually)
-- DELETE FROM otp_codes WHERE expires_at < now() - interval '1 hour';


-- ============================================================
-- migration-012-clerk.sql
-- ============================================================
-- StayOn migration 012 — link Supabase users to Clerk identities.
-- Run once in Supabase SQL Editor.
-- Clerk is the front-end auth (web + mobile); the backend exchanges a verified
-- Clerk session for a StayOn session and maps the Clerk user to a users row.

ALTER TABLE users ADD COLUMN IF NOT EXISTS clerk_id TEXT UNIQUE;
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users (clerk_id);

