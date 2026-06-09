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
