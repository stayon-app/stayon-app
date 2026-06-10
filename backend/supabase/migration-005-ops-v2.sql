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
