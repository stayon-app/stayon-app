# StayOn — Full Developer Documentation

> Onboarding + architecture reference for the StayOn team. Read this top-to-bottom
> to understand **what we use, how each part is designed, and how they connect.**
> Last updated: 2026-06-09.

---

## 1. What StayOn is

StayOn is a **0%-fee** stay-booking platform (an Airbnb-style marketplace) with three
client surfaces that all talk to **one shared backend + one database**:

- **Guest (user) app** — search, view, book stays; StayBot AI concierge; reels.
- **Host app** — list & manage stays, calendar, pricing, reservations, earnings, inbox.
- **Ops (operations) portal** — trust & safety: review listings/KYC, moderate
  bookings/reviews/reports, suspend/ban, refunds, audit. *(Backend done; UI pending.)*

### Core product principles
1. **Zero fees** — 0% commission to guests or hosts; the host keeps 100%. Surface
   "0% fee · keep 100%" on money screens.
2. **One app, two modes** — guest and host are the **same Expo app** (`d:/Stayon/user`);
   a user switches guest⇄host via `ModeContext`. Host code lives in `user/src/host/`.
3. **One person = one identity** — anti-fraud: a government ID maps to exactly one
   account (see §8.4).
4. **Cloud-first** — stays, photos, identities live in the cloud DB/Storage, not on a
   device, so the same account works on any phone in any country.

---

## 2. Tech stack

| Layer | Technology |
|---|---|
| **Mobile/web app** | Expo SDK **56**, React Native **0.85.3**, React **19**, TypeScript |
| **Navigation** | React Navigation 7 (native stack + bottom tabs) |
| **Maps** | `react-native-maps` (PROVIDER_GOOGLE) on native; Google Maps JS API in an iframe on web. Airbnb-style theming + Light/Street/Satellite |
| **Icons** | Ionicons (UI chrome) + **lucide-react-native** (amenities, highlights, property types) via `react-native-svg` |
| **Sensors** | `expo-sensors` (DeviceMotion → host-profile tilt-parallax) |
| **Dates** | `dayjs` |
| **Gradients** | `expo-linear-gradient` (`STAYON_GRADIENT = ['#0D9488','#6366F1']`) |
| **Backend** | Node.js + **Express 4**, `jsonwebtoken` (JWT auth) |
| **Database / storage** | **Supabase** — Postgres + PostGIS (geo) + Storage (photos/reels) via `@supabase/supabase-js` v2 (service key, server-side) |
| **AI** | StayBot local NLU engine (no key) + optional Claude (`aiProvider.ts`); backend photo classifier via Gemini/Anthropic vision; KYC provider seam |

---

## 3. Repository layout

```
d:/Stayon/
├── user/                     # THE EXPO APP (guest + host in one)
│   ├── src/
│   │   ├── api/              # backend HTTP client (client.ts) + typed Api (index.ts)
│   │   ├── components/       # shared UI (25): PropertyMapWeb, PhotoTour, AmenityIcon, filter sheet…
│   │   ├── constants/        # design tokens: colors, fonts, spacing, radii
│   │   ├── contexts/         # Auth, Currency, Mode (guest/host), Theme
│   │   ├── data/             # client data + mappers: stays, hostListings, Property type, reviews
│   │   ├── hooks/            # useHaptics, useFavorite, useLocationDetection…
│   │   ├── navigation/       # MainNavigator (root stack + guest tabs)
│   │   ├── screens/          # 47 guest screens (Explore, MapExplore, PropertyDetails, StayBot, HostProfile…)
│   │   ├── services/         # aiProvider, places (Google), stayBotEngine, exchangeRates
│   │   ├── types/            # Property.ts (the rich Property model + createMockProperty)
│   │   ├── utils/            # mapStyle, photoTour, contentGuard…
│   │   └── host/             # THE HOST APP (nested)
│   │       ├── screens/      # 44 host screens (Today, Listings, Calendar, Inbox, Wizard…)
│   │       ├── components/   # ListingForm, ListingCard, GradientButton…
│   │       ├── data/         # listings.ts (HostListing model, AMENITY_OPTIONS, PLACE_TYPES),
│   │       │                 #   listingSync.ts, hostProfile.ts, account.ts, guidebooks.ts
│   │       ├── services/     # hostAssistant.ts, analytics, reviewInsights
│   │       └── navigation/   # host tab navigator
│   └── metro.config.js       # adds .mjs resolution (for lucide)
│
├── backend/                  # THE ALL-IN-ONE BACKEND (user + host + ops)
│   ├── src/
│   │   ├── index.js          # Express app — all 65 endpoints + mappers
│   │   ├── auth.js           # JWT sign/verify, authUser / authStaff middleware
│   │   ├── supabase.js       # Supabase client (service key) + bucket names
│   │   ├── kyc.js            # KYC provider seam (verifyIdentity)
│   │   └── db.js             # legacy JSON store (unused once Supabase configured)
│   ├── supabase/
│   │   ├── schema.sql        # full Postgres schema + seed
│   │   ├── migration-002-listing-extra.sql   # extra jsonb (rules, pets, pricing)
│   │   └── migration-003-identity-unique.sql # unique identity hash (anti-fraud)
│   ├── fulltest.js           # 54-check end-to-end test
│   ├── .env                  # secrets (git-ignored)
│   └── render.yaml           # deploy config (Render)
│
└── *.md                      # planning docs (this file is the master index)
```

---

## 4. Architecture — how the three surfaces connect

```
   ┌────────────┐     ┌────────────┐     ┌────────────┐
   │  GUEST app │     │  HOST app  │     │ OPS portal │
   │ (user/src) │     │(user/src/  │     │  (pending) │
   │            │     │   host)    │     │            │
   └─────┬──────┘     └─────┬──────┘     └─────┬──────┘
         │  HTTPS + JWT     │                  │
         └──────────────────┼──────────────────┘
                            ▼
                 ┌──────────────────────┐
                 │   BACKEND (Express)   │   src/index.js — 65 endpoints
                 │   auth · listings ·   │   JWT (authUser / authStaff)
                 │   search · bookings · │
                 │   reservations ·      │
                 │   threads · reviews · │
                 │   reels · identity ·  │
                 │   media · ai · ops    │
                 └──────────┬───────────┘
                            ▼
                 ┌──────────────────────┐
                 │   SUPABASE (cloud)    │
                 │  Postgres + PostGIS   │  17 tables (§7)
                 │  Storage (photos)     │  buckets: listings, reels
                 └──────────────────────┘
```

**Key rule:** clients NEVER talk to each other or directly to the DB. Everything flows
**through the backend**, which is the single source of truth. A host publishes → the
backend writes to Postgres → a guest's `/search` reads it → both see the same data on
any device. Ops actions (approve/suspend/refund) mutate the same rows.

---

## 5. Frontend design (guest + host)

### 5.1 Navigation
- **`navigation/MainNavigator.tsx`** — root native-stack: guest tabs + pushable screens
  (`PropertyDetails`, `MapExplore`, `HostProfile`, `Booking`, host stack `Listings`,
  `ListingCreate`, `ListingEdit`, `ListingDetails`, etc.).
- **Guest tabs:** Explore · Trips · StayBot · Wishlists · Profile.
- **Host tabs** (`host/navigation`): Today · Reservations · Calendar · Inbox · Profile.

### 5.2 Contexts (global state)
| Context | Responsibility |
|---|---|
| `AuthContext` | login/signup (phone + country code), session, `backendLogin()` to establish the JWT |
| `ModeContext` | guest ⇄ host switch (the same account) |
| `CurrencyContext` | `useCurrency().format()` — prices authored in **USD**, rendered in the viewer's currency (India→INR, else USD) via `exchangeRates.ts` |
| `ThemeContext` | light/dark; `useTheme()` + `makeStyles(colors,…)` everywhere (never static colors) |

### 5.3 Data + API layer
- **`api/client.ts`** — low-level `http.get/post/put/del`; injects the JWT from
  AsyncStorage; throws `ApiError(code,message)` on non-2xx.
- **`api/index.ts`** — typed `Api`: `auth, listings, search, bookings, reservations,
  threads, reviews, reels, reports, identity, media, hosts, ai, wishlists,
  notifications, earnings, payouts`. Also `Api.auth.ensureSession()` (device pseudo-phone
  fallback so search works pre-login).
- **`data/Property` model** (`types/Property.ts`) — the rich guest-facing stay shape +
  `createMockProperty()` (demo filler). Real host/backend listings **override** the mock
  fields (description, amenities, rating, reviews, highlights) so a real stay shows real data.
- **`data/stays.ts`** — `BotStay` (StayBot's stay shape) + `botStayToProperty`.
- **`host/data/listings.ts`** — `HostListing` model, **`AMENITY_OPTIONS`** (lucide-mapped,
  14 categories), `PLACE_TYPES`, `SAFETY_OPTIONS`, `listingUSD()` (currency→USD).
- **`host/data/listingSync.ts`** — `uploadListingImages()` (local→Supabase Storage) +
  `toBackendListing()` (HostListing → backend payload). Shared by create + edit.

### 5.4 Notable components/services
- **`PropertyMapWeb.tsx`** — Google Maps JS API in an iframe (price/location pins,
  Light/Street/Satellite, Airbnb theming via `utils/mapStyle.ts`).
- **`LocationPickerMap.tsx`** — host draggable-pin map (set/drag/current location).
- **`AmenityIcon.tsx`** — renders a lucide icon by name (Ionicons fallback).
- **`PhotoTour.tsx`** + `utils/photoTour.ts` — room-grouped gallery + lightbox.
- **`PremiumFilterSheet.tsx`** — collapsible filters (price, amenities, booking,
  accessibility, host language) → wired to backend `/search`.
- **`services/stayBotEngine.ts`** — local NLU concierge (§8.6).
- **`services/places.ts`** — Google Places autocomplete + geocode/reverse-geocode.

---

## 6. Backend design

A single Express app (`src/index.js`). Every route is `/v1/...`. Two auth middlewares:
- **`authUser`** — verifies a guest/host JWT (`sub` = user id).
- **`authStaff(role)`** — verifies an ops-staff JWT with a required role (RBAC).

### 6.1 Endpoints by domain (65 total)
| Domain | Endpoints |
|---|---|
| **Auth** | `POST /auth/login`, `GET /me`, `POST /ops/auth/login` |
| **Listings** | `POST /listings` (create), **`PUT /listings/:id`** (update), `GET /listings` (mine), `GET /listings/:id`, `POST /listings/:id/submit`, `GET /listings/:id/quote` |
| **Search** | `GET /search` (location/guests/dates/pets/price/type/amenities/languages/instant + geo-radius + guest-based pricing) |
| **Calendar/pricing** | `GET/PUT /listings/:id/calendar`, `PUT /listings/:id/pricing` |
| **Bookings** | `POST /bookings`, `GET /bookings`, cancel (by id / by code) |
| **Reservations** | `GET /reservations`, `POST /reservations/:id/:action`, `…/by-code/:code/:action` (accept/decline/checkout → syncs guest trip status) |
| **Messaging** | `GET/POST /threads`, `GET/POST /threads/:id/messages` (contact-guard) |
| **Reviews** | `POST /reviews`, `GET /reviews`, `POST /reviews/:id/respond`, `POST /guest-reviews` (host→guest) |
| **Reels** | `GET/POST /reels` |
| **Identity** | `POST /identity/submit` (hash + dedup + KYC seam) |
| **Media** | `POST /media/upload` (base64→Storage), `POST /media/presign` |
| **AI** | `POST /ai/classify-photos` (Gemini/Anthropic vision) |
| **Hosts** | `GET /hosts/:id` (public profile + reviews + stays) |
| **Wishlists / notifications / earnings / payouts** | CRUD + reads |
| **Ops** | queues (listings, kyc, reels, payout-changes), approve/reject, force-cancel, refunds, reviews remove, users suspend/ban, dashboard, audit, reports resolve |

### 6.2 Mappers
`listingIn` (app → DB row, incl. `extra` jsonb), `listingOut` (DB row → app, snake→camel),
`bookingOut`, `resvOut`, `msgOut`, `reviewOut`. Constants: `PLATFORM_FEE = 0`, `TAX_RATE = 0.12`.

### 6.3 Resilience
Endpoints that write the `extra` jsonb (listings, identity) **retry without `extra`** if
the migration hasn't run — so the app never crashes pre-migration; the feature just
switches on once the SQL is applied.

---

## 7. Database schema (Supabase Postgres)

17 tables (`backend/supabase/schema.sql`):

`users` · `staff` · `identities` · `listings` · `calendar` · `bookings` · `reservations`
· `threads` · `messages` · `reviews` · `reels` · `reports` · `payout_methods` ·
`payout_change_requests` · `wishlists` · `notifications` · `audit_log`

Highlights:
- **`users`** — `phone` unique, `email` unique → one phone = one account.
- **`identities`** — KYC; `id_hash` unique (migration-003) → one ID = one account.
- **`listings`** — core stay + `extra jsonb` (migration-002): house rules, pets,
  cancellation, check-in/out, min nights, safety, **baseGuests + extraGuestPct**
  (guest-based pricing), host languages. Geo trigger maintains a PostGIS point.
- **`bookings` ↔ `reservations`** — share a confirmation `code`; status syncs both ways.
- Enums: `kyc_status`, `staff_role` (super_admin, ops_manager, trust_safety,
  kyc_reviewer, content_mod, finance, support, compliance, analyst).

### Migrations to run (Supabase SQL Editor)
1. `schema.sql` — once, initial.
2. `migration-002-listing-extra.sql` — `extra jsonb` (rules/pets/pricing). **Done.**
3. `migration-003-identity-unique.sql` — unique identity hash. **Done.**

---

## 8. Key feature flows (how a thing works end-to-end)

### 8.1 Add a stay → it appears for guests
Host wizard (`ListingWizardScreen`) collects type→location→basics→photos→title→price→
rules→cancellation→guide. Photos upload to **Supabase Storage** on pick (permanent URLs)
and are AI room-tagged. On publish: `saveListing` (local) **and** `Api.listings.create`
(backend, `status:'published'`) → the backend id is saved back as `remoteId`. A guest's
`Api.search({q:city})` returns it → shows on cards + map → detail page reads real data.

### 8.2 Search
Guided modal: **destination → dates → guests** (required) → `Api.search` with
`q, guests, pets, checkIn/checkOut, minPrice/maxPrice, amenities, languages, instant`.
Backend filters by **location field-detection** (city/state/country/area), **capacity**
(guests ≤ max), **date availability** (excludes booked/blocked), price, amenities, pets,
language, instant; applies **geo-radius** when coords are present.

### 8.3 Guest-based pricing
Host sets base price + `baseGuests` (included) + `extraGuestPct` (% per extra guest).
Effective nightly = `base × (1 + pct% × extraGuests)`, capped at max guests. Applied in
`/search`, `/quote`, and booking totals.

### 8.4 One person = one identity (anti-fraud)
`POST /identity/submit` hashes `(idType+idNumber+dob)` with a salt (SHA-256) → unique
index. A second account submitting the same ID → **409 IDENTITY_IN_USE**. Authenticity
(real vs fake doc) is a separate layer: `kyc.js → verifyIdentity()` is the seam for a
provider (Onfido/Persona/HyperVerge); without one, submissions queue for Ops review.

### 8.5 Photos & maps
Photos → Supabase Storage (public URLs). Maps → Google everywhere (web JS API + native
PROVIDER_GOOGLE), Airbnb light theme + Light/Street/Satellite toggle.

### 8.6 StayBot AI concierge
Local NLU (`stayBotEngine.ts`): extracts destination/budget/guests/dates/vibes/amenities,
then `recommendLive(ctx)` queries the **real backend** so it recommends real bookable
stays; optional Claude path (`aiProvider.ts`) for free-form replies. Booking flow tracks
dates/confirm slots.

---

## 9. Setup & run

### Backend
```bash
cd d:/Stayon/backend
# .env must have SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET (+ optional GEMINI/KYC keys)
node --env-file-if-exists=.env src/index.js     # → http://localhost:4000
npm run test:full                                # 54-check end-to-end test
```

### App (Expo)
```bash
cd d:/Stayon/user
npx expo start --web --port 8085                 # → http://localhost:8085
# point at the backend via EXPO_PUBLIC_API_BASE (defaults to localhost:4000)
```

### Verify a change
- Types: `cd user && ./node_modules/.bin/tsc --noEmit -p tsconfig.json` (must be 0)
- Bundle: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8085/index.bundle?platform=web&dev=true"` (must be 200)

---

## 10. Environment & secrets

**Never** commit secrets or put service keys in the app. Server-side only, in `backend/.env`:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `SUPABASE_ANON_KEY`, `JWT_SECRET`,
`SUPABASE_BUCKET_LISTINGS=listings`, `SUPABASE_BUCKET_REELS=reels`, optional
`GEMINI_API_KEY`/`ANTHROPIC_API_KEY` (photo AI), `IDENTITY_SALT`, `KYC_PROVIDER`/`KYC_API_KEY`.
The Google Maps key lives in the app (web) and **must be domain-restricted before launch**.

---

## 11. Testing

`backend/fulltest.js` (`npm run test:full`) — 54 checks across auth, listings, search,
bookings, reservations, messaging, reviews, wishlist, calendar/pricing, geo, host→guest
reviews, ops moderation, notifications, dashboard, RBAC. Run after backend changes.

---

## 12. Roadmap / pending

- **Ops portal UI** (backend done; design in `OPS_PORTAL_DESIGN.md`).
- **Deploy** to Render (`render.yaml`) + real OTP/SMS auth + payments (Stripe/Razorpay).
- **KYC provider** integration (seam ready in `kyc.js`).
- App→backend read wiring: notifications center, earnings/payouts, host calendar UI.
- Production: RLS policies, restrict Google key, realtime/push.
- Polish: accessibility-filter id alignment, UI-chrome icons → lucide.

---

## 13. Companion docs (deep dives)

| Doc | Covers |
|---|---|
| `STAYON_VISION.md` / `STAYON_BLUEPRINT.md` | product vision, features, design system |
| `BACKEND_PLAN.md` / `BACKEND_CONNECTIONS.md` | backend architecture + every user↔host↔ops connection |
| `BACKEND_SCHEMA_API.md` | schema + API contract detail |
| `BACKEND_INTEGRATION.md` | how the app wires to the backend |
| `BACKEND_PRODUCTION_PLAN.md` | go-live checklist + identity/anti-fraud |
| `OPS_PORTAL_DESIGN.md` | the Ops portal spec (to build) |
| `SUPABASE_SETUP.md` | Supabase project + buckets + migrations |
| `STAYON_PENDING.md` | running list of remaining wiring |

---

*This document is the single entry point. New devs: read §1–§4 for the mental model,
then §5/§6 for the side you'll work on, then run §9. Keep it updated as the system evolves.*
