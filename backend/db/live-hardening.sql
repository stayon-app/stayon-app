-- ─────────────────────────────────────────────────────────────────────────────
-- StayOn — LIVE HARDENING (run once in Supabase → SQL Editor)
--
-- Makes the integrity rules the application enforces IMPOSSIBLE to violate at
-- the database level (ACID guarantees under any concurrency):
--   • one phone / one email / one Clerk id  → exactly one user
--   • one stay can never hold two overlapping non-cancelled bookings
--   • fast, sorted reads for every "dedicated space" (my trips, my listings,
--     my reservations, search by city/status)
--
-- Safe to run once. Review any conflicts it reports (duplicate rows must be
-- merged manually before a unique constraint can apply).
-- ─────────────────────────────────────────────────────────────────────────────

-- 1) IDENTITY — one human, one account -----------------------------------------
-- (partial indexes so multiple NULLs stay allowed, e.g. OTP users without email)
create unique index if not exists users_phone_unique  on users (phone)    where phone    is not null;
create unique index if not exists users_email_unique  on users (email)    where email    is not null;
create unique index if not exists users_clerk_unique  on users (clerk_id) where clerk_id is not null;

-- 2) BOOKINGS — no overlap, ever (the hard ACID rule) ---------------------------
-- Exclusion constraint: two non-cancelled bookings for the same listing whose
-- [check_in, check_out) ranges overlap cannot BOTH commit. One transaction
-- wins, the other gets a constraint violation — regardless of race timing.
create extension if not exists btree_gist;

alter table bookings
  add constraint bookings_no_overlap
  exclude using gist (
    listing_id with =,
    daterange(check_in::date, check_out::date, '[)') with &&
  )
  where (status <> 'cancelled');

-- 3) LISTINGS — a host cannot list the identical place twice -------------------
create unique index if not exists listings_host_title_city_unique
  on listings (host_id, lower(title), lower(city))
  where status <> 'removed';

-- 4) DEDICATED-SPACE READ PATHS — sorted, indexed -------------------------------
create index if not exists bookings_guest_idx      on bookings     (guest_id, created_at desc);
create index if not exists bookings_listing_idx    on bookings     (listing_id, check_in);
create index if not exists reservations_host_idx   on reservations (host_id, created_at desc);
create index if not exists listings_host_idx       on listings     (host_id, created_at desc);
create index if not exists listings_city_idx       on listings     (lower(city)) where status = 'published';
create index if not exists listings_status_idx     on listings     (status);
create index if not exists calendar_listing_idx    on calendar     (listing_id, day);
create index if not exists notifications_user_idx  on notifications (user_id, created_at desc);

-- 5) REFERENTIAL INTEGRITY (skip any that already exist) ------------------------
-- alter table listings     add constraint listings_host_fk     foreign key (host_id)    references users(id);
-- alter table bookings     add constraint bookings_guest_fk    foreign key (guest_id)   references users(id);
-- alter table bookings     add constraint bookings_listing_fk  foreign key (listing_id) references listings(id);
-- alter table reservations add constraint reservations_host_fk foreign key (host_id)    references users(id);
