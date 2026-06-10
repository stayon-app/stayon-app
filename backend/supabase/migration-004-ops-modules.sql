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
