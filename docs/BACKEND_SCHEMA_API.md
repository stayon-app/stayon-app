# StayOn — Database Schema + API Contracts (dev-ready)

> Deep dive on `BACKEND_PLAN.md` / `BACKEND_CONNECTIONS.md`.
> Part A = PostgreSQL schema (+PostGIS). Part B = request/response JSON for the
> key flows. Conventions: UUID PKs, `timestamptz`, `jsonb` for flexible blobs,
> money stored as **integer minor units** (cents/paise) + ISO currency, all
> prices authored in **USD** then rendered per-user. Core rule: **0% platform fee**.

---

# PART A — SQL SCHEMA

## A.0 Extensions & enums
```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

CREATE TYPE user_status        AS ENUM ('active','suspended','banned');
CREATE TYPE staff_role         AS ENUM ('super_admin','ops_manager','trust_safety','kyc_reviewer','content_mod','finance','support','compliance','analyst');
CREATE TYPE kyc_status         AS ENUM ('unverified','pending','verified','rejected');
CREATE TYPE listing_status     AS ENUM ('draft','pending_review','published','rejected','snoozed');
CREATE TYPE booking_status     AS ENUM ('pending','confirmed','completed','cancelled');
CREATE TYPE payment_status     AS ENUM ('authorized','captured','refunded','failed');
CREATE TYPE payout_status      AS ENUM ('scheduled','paid','held','failed');
CREATE TYPE request_status     AS ENUM ('pending','approved','rejected');
CREATE TYPE content_status     AS ENUM ('pending','live','rejected');
CREATE TYPE report_status      AS ENUM ('open','reviewing','resolved','dismissed');
CREATE TYPE thread_party       AS ENUM ('guest','host');
```

## A.1 Users, profiles, identity
```sql
CREATE TABLE users (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  phone         text UNIQUE,
  email         text UNIQUE,
  name          text,
  avatar_url    text,
  country_code  text,                       -- e.g. 'IN','BE'
  status        user_status NOT NULL DEFAULT 'active',
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE host_profiles (
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  about         text,
  languages     text[] DEFAULT '{}',
  work          text,
  hosting_since date
);

CREATE TABLE identities (                   -- KYC
  user_id       uuid PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  legal_name    text,
  dob           date,
  id_type       text,                       -- 'passport','aadhaar','license'
  id_last4      text,
  provider      text,                       -- 'persona','onfido'
  provider_ref  text,
  status        kyc_status NOT NULL DEFAULT 'unverified',
  submitted_at  timestamptz,
  reviewed_by   uuid,                        -- staff id
  reviewed_at   timestamptz
);

CREATE TABLE staff (                         -- Ops team
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  email         text UNIQUE NOT NULL,
  name          text,
  role          staff_role NOT NULL,
  active        boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE devices (                       -- push tokens
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id) ON DELETE CASCADE,
  platform      text,                        -- 'ios','android','web'
  push_token    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

## A.2 Listings, pricing, availability
```sql
CREATE TABLE listings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id         uuid NOT NULL REFERENCES users(id),
  title           text,
  type            text,                      -- 'Loft','Villa',…
  place_type      text,                      -- 'entire','room','shared'
  description     text,
  -- location
  address         text, city text, state text, country text, zipcode text,
  geo             geography(Point,4326),     -- lng/lat for radius search
  -- capacity
  guests          int, bedrooms int, beds int, bathrooms numeric(3,1),
  bathroom_kind   text,
  -- pricing (USD minor units)
  price_cents     int, weekend_price_cents int, cleaning_fee_cents int,
  currency        text DEFAULT 'USD',
  -- content
  images          jsonb DEFAULT '[]',        -- [{url,w,h}]
  videos          jsonb DEFAULT '[]',
  amenities       text[] DEFAULT '{}',
  vibes           text[] DEFAULT '{}',
  highlights      text[] DEFAULT '{}',
  who_else        text[] DEFAULT '{}',
  house_rules     jsonb DEFAULT '{}',
  cancellation    text DEFAULT 'flexible',
  instant_book    boolean DEFAULT false,
  -- lifecycle
  status          listing_status NOT NULL DEFAULT 'draft',
  reject_reason   text,
  reviewed_by     uuid, reviewed_at timestamptz,
  rating_avg      numeric(2,1) DEFAULT 0, rating_count int DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX listings_geo_idx     ON listings USING gist (geo);
CREATE INDEX listings_status_idx  ON listings (status);
CREATE INDEX listings_host_idx    ON listings (host_id);

CREATE TABLE calendar (                      -- per-date overrides
  listing_id    uuid REFERENCES listings(id) ON DELETE CASCADE,
  day           date NOT NULL,
  price_cents   int,                         -- null = use base/weekend
  blocked       boolean DEFAULT false,
  PRIMARY KEY (listing_id, day)
);
```

## A.3 Bookings, payments, payouts
```sql
CREATE TABLE bookings (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  code            text UNIQUE NOT NULL,      -- 'STY-A8K2M1' (links all surfaces)
  listing_id      uuid NOT NULL REFERENCES listings(id),
  guest_id        uuid NOT NULL REFERENCES users(id),
  host_id         uuid NOT NULL REFERENCES users(id),
  check_in        date, check_out date, nights int, guests int,
  subtotal_cents  int, cleaning_cents int, taxes_cents int, total_cents int,
  currency        text DEFAULT 'USD',
  status          booking_status NOT NULL DEFAULT 'pending',
  cancel_reason   text, refund_cents int,
  created_at      timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX bookings_guest_idx ON bookings (guest_id);
CREATE INDEX bookings_host_idx  ON bookings (host_id);
CREATE INDEX bookings_listing_dates_idx ON bookings (listing_id, check_in, check_out);

CREATE TABLE payments (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    uuid NOT NULL REFERENCES bookings(id),
  amount_cents  int, currency text,
  provider      text, provider_ref text,
  status        payment_status NOT NULL,
  escrow_held   boolean DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE payout_methods (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id       uuid NOT NULL REFERENCES users(id),
  kind          text,                        -- 'bank','upi','paypal'
  masked_label  text,                        -- 'HDFC ••4321'
  provider_ref  text,
  verified      boolean DEFAULT false,
  is_default    boolean DEFAULT false
);

CREATE TABLE payouts (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id       uuid NOT NULL REFERENCES users(id),
  booking_id    uuid REFERENCES bookings(id),
  amount_cents  int, currency text,
  method_id     uuid REFERENCES payout_methods(id),
  release_at    timestamptz,
  status        payout_status NOT NULL DEFAULT 'scheduled'
);

CREATE TABLE payout_change_requests (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  host_id       uuid NOT NULL REFERENCES users(id),
  requested     jsonb,                       -- new method details
  proof_url     text,
  status        request_status NOT NULL DEFAULT 'pending',
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  reviewed_by   uuid, reviewed_at timestamptz, reject_reason text
);
```

## A.4 Messaging, reviews, content
```sql
CREATE TABLE threads (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  listing_id    uuid REFERENCES listings(id),
  guest_id      uuid REFERENCES users(id),
  host_id       uuid REFERENCES users(id),
  last_at       timestamptz,
  UNIQUE (listing_id, guest_id)
);
CREATE TABLE messages (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  thread_id     uuid NOT NULL REFERENCES threads(id) ON DELETE CASCADE,
  sender        thread_party NOT NULL,
  text          text,
  read_by_other boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_idx ON messages (thread_id, created_at);

CREATE TABLE reviews (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id    uuid REFERENCES bookings(id),
  listing_id    uuid REFERENCES listings(id),
  author_id     uuid REFERENCES users(id),
  direction     text,                        -- 'guest_to_host' | 'host_to_guest'
  rating        int CHECK (rating BETWEEN 1 AND 5),
  text          text,
  response      text,
  removed       boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE reels (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id     uuid REFERENCES users(id),
  listing_id    uuid REFERENCES listings(id),
  kind          text,                        -- 'reel','story','blog'
  media_url     text, thumb_url text, caption text,
  status        content_status NOT NULL DEFAULT 'pending',
  reject_reason text,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

## A.5 Trust, offers, ops, system
```sql
CREATE TABLE reports (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporter_id   uuid REFERENCES users(id),
  target_type   text,                        -- 'listing','user','booking','review','message'
  target_id     uuid,
  reason        text, details text,
  status        report_status NOT NULL DEFAULT 'open',
  assigned_to   uuid, resolved_at timestamptz, resolution text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE offers (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  type          text,                        -- 'first15','referral10'
  user_id       uuid REFERENCES users(id),
  booking_id    uuid REFERENCES bookings(id),
  amount_cents  int,
  status        text DEFAULT 'available'     -- available|redeemed|expired
);

CREATE TABLE wishlists (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id),
  listing_id    uuid REFERENCES listings(id),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, listing_id)
);

CREATE TABLE notifications (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       uuid REFERENCES users(id),
  type          text, payload jsonb, read boolean DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE audit_log (                      -- every Ops mutation
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id      uuid REFERENCES staff(id),
  action        text, target_type text, target_id uuid,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE events (                         -- telemetry → warehouse
  id            bigserial PRIMARY KEY,
  user_id       uuid, name text, props jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);
```

---

# PART B — API CONTRACTS (request → response JSON)

All authed calls send `Authorization: Bearer <jwt>`. Errors: `{ "error": { "code": "...", "message": "..." } }`.

## B.1 Auth
```http
POST /v1/auth/otp/request
{ "phone": "+32917723..." }
→ 200 { "sent": true, "expiresIn": 300 }

POST /v1/auth/otp/verify
{ "phone": "+32917723...", "code": "447291" }
→ 200 {
  "accessToken": "eyJ…", "refreshToken": "eyJ…",
  "user": { "id":"u_1","name":"Guest","countryCode":"BE","status":"active","kyc":"unverified" }
}
```

## B.2 Listing — create → submit → (Ops) approve → search
```http
POST /v1/listings                       (host)
{ "title":"Sunlit Loft","type":"Loft","placeType":"entire",
  "address":"12 MG Rd","city":"Goa","state":"Goa","country":"India","zipcode":"403001",
  "lat":15.4909,"lng":73.8278,"guests":4,"bedrooms":2,"beds":3,"bathrooms":2,
  "priceUSD":110,"cleaningFeeUSD":15,"amenities":["wifi","kitchen"],"vibes":["beach"] }
→ 201 { "id":"l_9","status":"draft" }

POST /v1/media/presign                  (host) — get S3 upload URL
{ "contentType":"image/jpeg","purpose":"listing","listingId":"l_9" }
→ 200 { "uploadUrl":"https://s3…","fileUrl":"https://cdn.stayon…/l_9/a.jpg" }

POST /v1/listings/l_9/submit            (host)
→ 200 { "id":"l_9","status":"pending_review" }      // now in Ops queue

GET  /v1/ops/queues/listings?status=pending_review  (ops)
→ 200 { "items":[ { "id":"l_9","title":"Sunlit Loft","host":{"id":"u_5","name":"Asha"},
        "city":"Goa","submittedAt":"2026-06-06T...","riskScore":0.02 } ], "total":1 }

POST /v1/ops/listings/l_9/approve       (ops, role=content_mod)
→ 200 { "id":"l_9","status":"published" }            // indexed + host notified

GET  /v1/search?city=Goa&checkIn=2026-07-01&checkOut=2026-07-04&guests=2&maxPrice=150  (any user)
→ 200 { "results":[ { "id":"l_9","title":"Sunlit Loft","city":"Goa","lat":15.49,"lng":73.83,
        "pricePerNight":{ "amount":110,"currency":"USD","display":"₹9,180" },
        "rating":0,"image":"https://cdn…/a.jpg","instantBook":false } ], "total":1 }
```
**Rejection:** `POST /v1/ops/listings/l_9/reject { "reason":"Photos too dark" }` → `status:"rejected"` + host push.

## B.3 Booking lifecycle (request → accept → checkout → cancel)
```http
GET  /v1/listings/l_9/quote?checkIn=2026-07-01&checkOut=2026-07-04&guests=2   (user)
→ 200 { "nights":3,"subtotalUSD":330,"cleaningUSD":15,"taxesUSD":17,
        "platformFeeUSD":0,"totalUSD":362,"display":{"total":"₹30,200"} }

POST /v1/bookings                        (user)
{ "listingId":"l_9","checkIn":"2026-07-01","checkOut":"2026-07-04","guests":2,
  "paymentMethodId":"pm_3","offerId":"of_1" }
→ 201 { "id":"b_7","code":"STY-A8K2M1","status":"pending",
        "payment":{ "status":"authorized","escrowHeld":true } }
        // instant_book=false → host gets push; instant_book=true → status:"confirmed"

POST /v1/reservations/b_7/accept         (host)
→ 200 { "code":"STY-A8K2M1","status":"confirmed" }   // guest notified; payment captured

POST /v1/reservations/b_7/checkout       (host)
→ 200 { "code":"STY-A8K2M1","status":"completed" }   // guest trip→completed; review unlocked; payout scheduled

POST /v1/bookings/b_7/cancel             (user)
{ "reason":"Plans changed" }
→ 200 { "status":"cancelled","refundUSD":345,"taxesWithheldUSD":17 }  // host reservation freed
```

## B.4 Payout-account change (Ops-gated)
```http
POST /v1/payout-method/change-request    (host)
{ "kind":"bank","account":"…","ifsc":"…","proofUrl":"https://cdn…/id.jpg" }
→ 201 { "id":"pcr_2","status":"pending" }

POST /v1/ops/payout-changes/pcr_2/approve  (ops, role=finance)
→ 200 { "id":"pcr_2","status":"approved","method":{ "masked":"HDFC ••4321","verified":true } }
```

## B.5 Messaging (with contact-guard)
```http
POST /v1/threads                         (user) — get or create
{ "listingId":"l_9" }
→ 200 { "id":"t_4","hostId":"u_5","guestId":"u_1" }

POST /v1/threads/t_4/messages            (user)
{ "text":"Hi, is early check-in possible?" }
→ 201 { "id":"m_11","sender":"guest","text":"…","createdAt":"…" }
   // pre-booking phone/email/address → 422 { "error":{"code":"CONTACT_BLOCKED",
   //   "message":"You can share contact details once the booking is confirmed."} }
// WS push to host: { "event":"message.created","threadId":"t_4","message":{…} }
```

## B.6 Reviews
```http
POST /v1/reviews                         (user, after completed)
{ "bookingId":"b_7","rating":5,"text":"Loved it","wouldRecommend":true }
→ 201 { "id":"rv_8","direction":"guest_to_host","status":"published" }
// host sees it; rating_avg recomputed. Host responds:
POST /v1/reviews/rv_8/respond { "response":"Thanks!" } → 200 {…}
```

## B.7 Reels (upload → Ops → live)
```http
POST /v1/reels                           (host/user)
{ "kind":"reel","mediaUrl":"https://cdn…/v.mp4","caption":"Sunset at the loft","listingId":"l_9" }
→ 201 { "id":"r_3","status":"pending" }
POST /v1/ops/reels/r_3/approve (ops) → 200 { "id":"r_3","status":"live" }
GET  /v1/reels (user) → 200 { "items":[ { "id":"r_3","mediaUrl":"…","listingId":"l_9" } ] }
```

## B.8 Reports / disputes
```http
POST /v1/reports                         (user/host)
{ "targetType":"listing","targetId":"l_9","reason":"inaccurate","details":"No pool as shown" }
→ 201 { "id":"rp_5","status":"open" }
GET  /v1/ops/reports?status=open (ops) → 200 { "items":[ {…} ] }
POST /v1/ops/reports/rp_5/resolve { "resolution":"warned_host","refundUSD":0 } → 200 {…}
```

## B.9 KYC
```http
POST /v1/identity/submit                 (user/host)
{ "legalName":"Asha R","dob":"1995-04-02","idType":"aadhaar","frontUrl":"…","selfieUrl":"…" }
→ 202 { "status":"pending" }
// provider WEBHOOK → Ops queue → POST /v1/ops/kyc/u_5/approve → { "status":"verified" }
```

## B.10 Ops dashboard
```http
GET /v1/ops/dashboard                    (ops)
→ 200 { "queues":{ "listings":3,"kyc":2,"reels":5,"payoutChanges":1,"reports":4 },
        "today":{ "bookings":18,"gmvUSD":4200,"payoutsDueUSD":3100 } }
```

---

## Notes for implementers
- **Money:** store integer minor units; author in USD; convert for display per user's currency.
- **Confirmation `code`** is the cross-surface join key (booking↔reservation↔payment↔payout).
- **Status transitions** are the contract — enforce them server-side (e.g. only `pending_review → published` via an Ops role).
- **Every `/ops/*` mutation** writes an `audit_log` row.
- **Search** reads the index, not Postgres directly; a JOB reindexes on listing/calendar changes.
- **Idempotency keys** on `POST /bookings` and payment calls to avoid double charges.
