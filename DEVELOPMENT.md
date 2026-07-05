# StayOn — Development Handbook

> **The single source of truth for developers.** What StayOn is, how it runs, what has
> been built, what must be verified, what is broken/pending, and what to build next.
> We are mid-development toward a live launch — read this before touching anything.
> Companion doc: [`web/WEBSITE_DESIGN_REFERENCE.md`](web/WEBSITE_DESIGN_REFERENCE.md) (website design deep-dive).

---

## 1. What StayOn is

A premium stay-booking platform ("stay beyond ordinary"): guests book homes/villas
with **no booking fees**; hosts list properties and **keep 100%** (0% commission).
Four clients, **one backend, one database** — every rule is enforced server-side once
and applies to all clients identically.

| Surface | Path | Stack | Audience |
|---|---|---|---|
| Backend API | `backend/` | Express + Supabase (Postgres) | everything |
| Website | `web/` | Next.js 14 App Router | guests (`/`) + hosts (`/host`) |
| User app | `user/` | Expo / React Native | guests |
| Host app | `host/` | Expo / React Native | hosts |
| Ops console | (backend `ops.js` routes) | — | staff — **DO NOT TOUCH without approval** |

**Mirroring rule:** the website's guest side mirrors the user app; the website's host
side mirrors the host app. One is a phone interface, one is a web interface — same
features, same data, same rules.

---

## 2. Running locally

```bash
# 1. Backend (port 4000) — needs backend/.env (Supabase keys, JWT_SECRET)
cd backend && npm run dev

# 2. Website (port 3000) — needs web/.env.local (Clerk keys; see §12)
cd web && npm run dev

# 3. Apps (web preview)
cd user && npx expo start --web --port 8081
cd host && npx expo start --web --port 8082
```

Env files are git-ignored. **Never commit `.env` / `.env.local`.**
- `backend/.env` — SUPABASE_URL/keys, JWT_SECRET, OPS_*, bucket names
- `web/.env.local` — NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY + CLERK_SECRET_KEY
  (currently the Clerk *keyless dev* pair; claim URL is commented in the file)

---

## 3. Identity model (one human = one account)

- **App login:** phone OTP → user row upserted by phone (one phone = one user).
- **Website login:** Clerk (Google/email) → `/v1/auth/clerk` maps the Clerk user to a
  StayOn user: match `clerk_id` → else **link by email → else by phone** → else create.
  So the same person on app + website is the **same ID** — never duplicated.
- One ID may **host many listings** and **book many stays** (dual role).
- Every mutating route requires a JWT; ownership is checked on the server
  (host-only reservation actions, guest/host-only cancels, host-only listing edits).

---

## 4. Core business rules (all server-enforced, all verified by test)

| Rule | Where |
|---|---|
| Search = **WHERE + WHEN + WHO mandatory** (availability-first; filters apply after) | web search UI + `/v1/search` (guests ≥, date-overlap exclusion) |
| A stay never holds two overlapping bookings (one guest per stay per night) | `POST /v1/bookings` pre-check **+ post-insert race guard**; hard DB constraint in §12 |
| Guest capacity enforced at booking time too (4-guest stay rejects 5) | `POST /v1/bookings` |
| Host-blocked calendar days unbookable | `POST /v1/bookings` |
| A host cannot list the identical place twice (same title/address + city) → 409 | `POST /v1/listings` |
| **Exact address & PIN hidden until booked** — public payloads strip them + round coords (~100 m); revealed only inside the guest's own bookings (`stayAddress`) | `publicListingOut`, `GET /v1/bookings` |
| Availability is public **dates-only** (no identities) | `GET /v1/listings/:id/availability` |
| Promo **STAYON10** = 10% off, first booking only, validated server-side | `PROMOS` in helpers; quote + booking routes |
| Listing publish flow: wizard → `pending_review` → **Ops approves** → live | `POST /listings` + `/submit` |

## 5. Confidentiality matrix (CRITICAL — verify before every ship)

| Surface | May show | must NEVER show |
|---|---|---|
| Guest (site `/`, `/search`, `/stay`, `/explore`, `/saved`, app) | "no booking fees", "price you see is what you pay" | commission %, "hosts keep 100%", payouts/earnings |
| Host (`/host`, host app) | all economics (0% commission, earnings, payouts) | — |
| Anyone pre-booking | area only (rounded coords, city/state) | street address, PIN, exact pin |

Check: `curl guest pages | grep -iE 'commission|keep 100%|payout'` → must be empty.

---

## 6. What has been DONE (high level)

**Backend**
- Clerk↔StayOn identity bridge; OTP auth; refresh tokens
- All rules in §4; authorization fixes (reservation actions, cancels); privacy outputs
- Promo engine (STAYON10); public availability endpoint; `db/live-hardening.sql` pack

**Website — guest (mirrors user app)**
- Search-forward home: rotating scenic backdrop, category rail, city carousels,
  guest favourites, destinations, travel stories, recently-viewed rail, promo popup
  (STAYON10, once per session), rise-only motion
- Search bar: type-ahead cities from live inventory (A→Z), 2-month range calendar,
  guests stepper, **Search gated on the where/when/who trio** (suggestion clicks
  advance to dates, never search)
- `/search`: sticky bar (single bar — header pill hidden here), split list ↔ Google
  Map (hybrid) with price pins + two-way highlight, app-style **FilterSheet**
  (recommended/place type/dual price/rooms/property types/amenities/booking/
  accessibility) with live count, pagination, honest empty states
- Stay page: gallery + lightbox, amenities modal, rating breakdown, host block,
  area map ("exact location after booking"), booking widget with **custom calendar
  (reserved dates struck out)**, price breakdown + promo field
- `/explore` (mirrors app Explore tab), `/saved` wishlists, `/trips`
- Auth: `/sign-in` `/sign-up` full-screen splash (rotating captions), no chrome
- i18n: en/hi/fr/es live on chrome+host pages; 20 currencies, locale auto-detect

**Website — host (mirrors host app)**
- Landing: owner-business framing, facts strip, earnings estimator (image +
  price-sweep sliders), pricing-control cards, FAQ + image, custom side-reveal motion
- **3-phase listing wizard** = host app parity (18 property types, place kind,
  location incl. landmark, counters, bathrooms, who-else, grouped amenities, ≥6
  photos, title 50, highlights ≤2, description, booking mode, price+breakdown,
  weekend %, discounts, safety, review) + **Save & exit draft (restores)** +
  address auto-geocode → publishes to `pending_review`
- Dashboard: listings + reservations with accept/decline/check-in/out

**Design system**
- ONLY app colours: teal family `#0D9488/#14B8A6/#0F766E` surfaces; actions use the
  apps' `STAYON_GRADIENT` (`#0D9488→#6366F1`); deep-teal dark sections
- System font stack (= apps); monochrome **line icons everywhere** (`WizIcon`) — no
  coloured emoji; guest site rise-only motion, host site left/right reveals;
  `prefers-reduced-motion` respected everywhere

---

## 7. NEEDS VERIFICATION (manual QA before launch)

- [ ] Full booking loop in the browser as a real signed-in user (Clerk) — search →
      stay → dates (reserved days struck out) → promo STAYON10 → reserve → Trips
      shows booking + `stayAddress`
- [ ] Host loop in the browser: sign in → wizard end-to-end (6 photos) → appears in
      Ops as pending → approve → visible in guest search
- [ ] Language switch on every page type; currency totals on booking breakdown
- [ ] Mobile widths (360/720/860): search popovers, filter sheet, wizard, maps
- [ ] Both Expo apps against the same backend after all rule changes
      (booking errors surfaced nicely? 409/PROMO messages)
- [ ] Wishlist/recently-viewed persistence across sessions
- [ ] Reduced-motion mode; keyboard nav (calendar, filter sheet, lightbox)

## 8. KNOWN ISSUES / TO SOLVE

1. **Payments are simulated** (`payments.js` provider `sim`; Stripe/Razorpay code
   scaffolded, commented). No real money moves. Needs gateway keys → finish + test.
2. **Promo not persisted as columns** — discount folds into `subtotal_usd`
   (amounts stay consistent); add `promo_code`/`discount_usd` columns (in SQL pack
   TODO) then store explicitly.
3. **Seed listings have 1 photo** → card carousels/lightbox shine only on wizard
   listings (e.g. Vijayawada). Consider enriching seeds.
4. **i18n coverage** — server-rendered guest bodies (home sections, search results
   copy) still English-only; chrome + host page translate.
5. **`next/image` not adopted** (raw `<img>` + lazy). Needs `remotePatterns` config
   for Unsplash + Supabase storage, then a sweep.
6. **Clerk = keyless dev instance** — claim it (URL inside `web/.env.local`) and
   swap production keys; "Development mode" badge disappears then.
7. Currency FX rates are static in `web/lib/currency.ts` — swap for a live feed.
8. Website dark mode absent (apps have theme context).
9. GitHub-Desktop stashes once injected old code + conflict markers into main
   (commit `db5aa45`, reverted in `a519130`). Stashes dropped. **Avoid popping old
   stashes**; if GH Desktop offers a stash on branch switch, discard it.

## 9. TO ADD (roadmap)

- Real payment capture/refund flow + host payouts ledger
- Reviews with text (backend `reviews` exists; guest write-flow after checkout)
- Experiences (app has screens; backend has no endpoints — build API first)
- Messaging guest↔host (app has screens; needs backend)
- Wishlist sync to backend (currently local per device)
- Total-price-for-stay display on cards when dates chosen; map "search as I move"
- Host analytics dashboard (occupancy, earnings charts) on website
- Email notifications (booking confirmations) alongside push
- Reels, StayCoins/wallet, guidebooks — app-only concepts pending backend design

## 10. Test artifacts currently in the database

- Listing **“Krishna View Villa — Benz Circle”, Vijayawada** (id `09d3d419-…`),
  4 guests, 7 area photos — created via the real pipeline for E2E tests
- Test bookings on it: **Sep 1–3, Sep 10–12, Oct 5–7, Nov 1–3 (2026)** (+ promo one)
- Test users: `+919000000001/2/3`
- Clean these before real launch (or keep as demo content deliberately).

## 11. Repository practices

- **`main` is the only branch** — all other branches were audited (nothing unmerged
  mattered) and deleted. Commit to main or short-lived feature branches merged fast.
- Never commit secrets; `.env*` are ignored. Windows line-ending warnings are normal.
- Ops routes/files: leave alone.
- Update `web/WEBSITE_DESIGN_REFERENCE.md` §12 change-log + this doc when you ship.

## 12. Owner actions still pending (cannot be done from code)

1. **Run [`backend/db/live-hardening.sql`](backend/db/live-hardening.sql)** in
   Supabase → SQL Editor: unique phone/email/clerk_id, **no-overlap exclusion
   constraint** (true ACID for bookings), duplicate-listing index, read indexes.
2. **Claim the Clerk app** (URL in `web/.env.local`) → replace with production keys.
3. **Payment gateway**: create Stripe/Razorpay account → put secret key in
   `backend/.env` → then finish `payments.js` integration.
4. Production: strong `JWT_SECRET`, HTTPS domain, restrict Google Maps key to your
   domains, host the four surfaces.

---
*Last updated: 2026-07-06 · after commit `a519130` (revert of accidental `db5aa45`).*


---
---

# PART II — Deep technical reference (connections, workflows, storage)

## 13. System architecture — who talks to whom

```
   USER APP (Expo)      HOST APP (Expo)      WEBSITE guest+host (Next.js :3000)
        |  phone-OTP login     |  phone-OTP login        |  Clerk login (Google/email)
        |                      |                         |
        |   Bearer StayOn JWT  |   Bearer StayOn JWT     |  Clerk token --POST /auth/clerk-->
        +----------+-----------+-----------+-------------+        (exchanged for StayOn JWT)
                   v                       v
        +------------------------------------------------+
        |        BACKEND API  http://localhost:4000/v1   |   Express (backend/src)
        |  auth.js | listings.js | bookings.js |         |
        |  social.js (media/messages) | misc.js | ops.js |
        +---------------+---------------+----------------+
                        v               v
              SUPABASE POSTGRES   SUPABASE STORAGE
              (all tables, s15)   bucket BUCKET_LISTINGS (listing photos)
                                  bucket BUCKET_REELS (reels)

  External services used by clients:
  - Google Maps JS API (website maps; key in web/lib/googleMaps.ts, apps in app.json)
  - Nominatim/OpenStreetMap (free geocoding: wizard address->lat/lng, /map place search)
  - Clerk (website identity provider) - Expo Push (backend -> app notifications)
  - Unsplash (illustrative imagery only)
```

**Every client calls the SAME API with the SAME token format** — a StayOn JWT in
`Authorization: Bearer <token>` — so any rule added to a route instantly protects
app + website simultaneously. There is no client-to-client communication; clients
only ever talk to the backend.

## 14. Authentication & communication flows

### A) App login (phone OTP)
1. `POST /v1/auth/send-otp {phone}` → user row **upserted by phone** (`users`),
   6-digit code stored in `otp_codes`
2. `POST /v1/auth/verify-otp {phone, code}` → returns **StayOn access JWT** (signed
   with `JWT_SECRET`, payload `{sub: userId, name}`) + refresh token (row in
   `refresh_tokens`; revocable per device)
3. Every later request: `Authorization: Bearer <access JWT>` → middleware
   `authUser` verifies and sets `req.auth.sub/name`

### B) Website login (Clerk bridge)
1. User signs in with Clerk on `/sign-in` (Google or email code)
2. `web/components/StayonBridge.tsx` watches Clerk state; on sign-in it calls
   `ensureStayonSession()` → `POST /v1/auth/clerk {clerkToken}`
3. Backend verifies the Clerk token, then maps to a StayOn user:
   match `users.clerk_id` → else **link by email** → else **link by phone** →
   else create. Returns the same StayOn JWT as (A)
4. Token cached client-side; all API calls use the same Bearer header.
   Sign-out clears it (`clearStayonSession`)

### C) Request wrapper (website)
`web/lib/stayonClient.ts` — `API` base, `authed(method, path, body)` attaches the
Bearer token; `host.*` (listings/reservations/upload) and `stayon.*` (book/trips)
are the only doors the website uses to reach the backend.

## 15. Database — every table and what it stores

| Table | Purpose / key columns |
|---|---|
| `users` | one row per human: `id`, `phone` (unique), `email`, `clerk_id`, `name`, `avatar_url`, `country_code`, `push_token`, `status` |
| `identities` | identity-verification artifacts (KYC), salted via `IDENTITY_SALT` |
| `otp_codes` | active OTP codes per phone/user (login step) |
| `refresh_tokens` | long-lived sessions per device; `revoked` flag = logout |
| `listings` | one row per property: `host_id -> users`, title/type/`place_type`, address/city/state/zipcode/lat/lng, guests/bedrooms/beds/bathrooms, `price_usd`/`weekend_price_usd`/`cleaning_fee_usd`, `images[]` (public URLs), `amenities[]`, `highlights[]`, `vibes[]`, `instant_book`, `status` (`draft -> pending_review -> published`), `rating_avg/count`, `extra` JSON (houseRules, safety, checkIn/Out, minNights, baseGuests, extraGuestPct, languages) |
| `bookings` | guest's record: `code` (STY-XXXXXX), `listing_id`, `guest_id`, `host_id`, `check_in/out`, `nights`, `guests`, `subtotal_usd` (after promo), `cleaning_usd`, `taxes_usd`, `total_usd`, `status` (pending/confirmed/completed/cancelled), `payment_intent_id`, `payment_status`, `refund_usd` |
| `reservations` | host's mirror of the same booking (same `code`): host-side status pipeline; the two stay in sync via `syncStatus(code, ...)` |
| `calendar` | per-listing day rows: `day`, `blocked`, optional `price_usd` override — host date-blocking |
| `reviews` | guest reviews per listing (+ host `response`, ops `removed` flag) → drives `rating_avg/count` |
| `wishlists` | app-side saved stays (website wishlist is currently localStorage — see s9) |
| `threads` / `messages` | guest-host messaging (app screens; minimal backend) |
| `notifications` | in-app notification feed (`user_id`, `type`, `payload`); Expo push fired best-effort alongside |
| `audit_log` | staff/ops action trail (`actor_id`, action, target) |
| `staff` | ops console users/roles (leave alone) |
| `feature_flags` | ops-togglable flags (e.g. markets) |

**Files/photos:** NOT in tables. `POST /v1/media/upload {b64}` → Supabase **Storage**
bucket `BUCKET_LISTINGS` at path `hostId/uuid.ext` → public URL is returned and that
URL string is what's saved inside `listings.images[]`.

## 16. API endpoint reference (backend/src/routes)

**auth.js** — `POST /auth/send-otp` · `POST /auth/verify-otp` · `POST /auth/clerk` ·
`POST /auth/refresh` · `POST /auth/logout`

**listings.js**
- `GET /search` — public; filters: `q|city` (ilike over city/state/country/address/title/zip), `guests` (>=), `minPrice/maxPrice`, `type`, `instant`, `amenities`, `pets`, `languages`, `checkIn+checkOut` (drops overlapped/blocked), `lat+lng+radius` (geo). Output: `publicListingOut` (address/zip stripped, coords rounded) |
- `GET /listings/:id` — public detail (same privacy) + reviews
- `GET /listings/:id/availability` — public, dates only `{booked[], blocked[]}`
- `GET /listings/:id/quote?checkIn&checkOut&guests&promo` — price breakdown + promo validity
- `GET /listings/:id/calendar` · `PUT /listings/:id/calendar` (host-only)
- `POST /listings` (host; duplicate guard) · `POST /listings/:id/submit` (→ pending_review) · `PUT /listings/:id` (owner-only) · `GET /listings` (host's own, full data)

**bookings.js**
- `POST /bookings` — auth; rules in order: dates sane → capacity → overlap 409 → blocked 409 → promo validate/first-only → insert booking+reservation → **race re-check** → payment intent → notify host
- `GET /bookings` — guest's own + `stayAddress` reveal on active ones
- `POST /bookings/:id/cancel` (guest) · `POST /bookings/by-code/:code/cancel` (guest or host)
- `GET /reservations` (host's own) · `POST /reservations/:id/:action` + by-code — host-only; actions accept/decline/checkin/checkout

**social.js** — `POST /media/upload` (auth → Storage URL), reviews write, messaging
**misc.js** — profile (`GET/PUT /me`), push token, payout account stub, account delete
**ops.js** — staff console (approval queue, refunds, flags) — **do not modify**

## 17. End-to-end workflows (step by step)

### W1 — Guest books a stay (website)
1. Home/search: type city → type-ahead from live inventory → pick → calendar auto-opens → dates → guests → **Search enabled only now**
2. `/search?q&checkIn&checkOut&guests` → server calls `GET /search` (availability-first); FilterSheet narrows client-side; map pins mirror the filtered list
3. Stay page: `GET /listings/:id` + `/availability` (reserved days struck out) + `/quote` (breakdown; promo re-quotes live)
4. Reserve → Clerk sign-in if needed → StayonBridge mints session → `POST /bookings`
5. Backend runs all s4 rules → writes `bookings` + `reservations` (same `code`) → payment intent (sim) → `notifications` to host (+push)
6. Guest's Trips (`GET /bookings`) now shows it **with `stayAddress`** — the first time the exact address exists client-side
7. Those dates disappear from everyone's search (overlap filter)

### W2 — Host publishes a listing (website)
1. `/host` → sign in → dashboard → New listing → 3-phase wizard (s6)
2. Photos: each → `POST /media/upload` → Storage → URL array
3. Address → Nominatim geocode → lat/lng
4. `POST /listings` (duplicate guard) → `POST /listings/:id/submit` → `status = pending_review`
5. **Ops approves** → `published` → guest search/type-ahead pick it up instantly
6. Save & exit at any step keeps a restorable local draft

### W3 — Reservation lifecycle (host)
`pending` → host `accept` → `confirmed` → `checkin` → `checkout` → `completed`
(or `decline`/cancel → `cancelled`). Each action: host-only auth → `syncStatus`
updates BOTH `reservations` and `bookings` by `code` → guest notified.
Instant-Book listings skip `pending` (created `confirmed`).

### W4 — Cancellation & refund
Guest cancels (`/bookings/:id/cancel`) → status `cancelled` on both sides →
`refund_usd = total - taxes` recorded → host notified → dates instantly bookable
again (search + availability recompute live).

### W5 — Promo
Quote shows discount for any client; booking re-validates: unknown code → 400;
`firstOnly` checked against the guest's booking history; discount applied to
subtotal before tax; response returns `{promo: {code, pct, discountUSD}}`.

## 18. Where each piece of client state lives

| State | Storage |
|---|---|
| StayOn session (website) | localStorage via `stayonClient` |
| Currency + language choice | localStorage `stayon_currency` / `stayon_language` (auto-detected on first visit) |
| Wishlist hearts (website) | localStorage `stayon_wishlist` (sync to `wishlists` table = roadmap) |
| Recently viewed | localStorage `stayon_recently_viewed` (max 12) |
| Wizard draft | localStorage `stayon_listing_draft` (photos excluded — browser limit) |
| Promo popup seen | sessionStorage `stayon_promo_seen` |
| Apps' equivalents | AsyncStorage (favorites, recentlyViewed, drafts) — same shapes |

## 19. File map — where to find everything

### Backend (`backend/`)
| File | What lives there |
|---|---|
| `src/index.js` | Express boot, route mounting, CORS |
| `src/auth.js` | JWT sign/verify, `authUser`/`authStaff`, refresh tokens |
| `src/routes/auth.js` | OTP + Clerk exchange (identity linking) |
| `src/routes/listings.js` | search, detail, availability, quote, create/submit/update, calendar |
| `src/routes/bookings.js` | booking rules, reservations actions, cancels, address reveal |
| `src/routes/social.js` | media upload → Storage, reviews, messaging |
| `src/routes/misc.js` | profile, push tokens, account deletion |
| `src/routes/ops.js` | staff console — DO NOT TOUCH |
| `src/utils/helpers.js` | DB helpers, output mappers (`listingOut`/`publicListingOut`/`bookingOut`), `PROMOS`, notify/push, TAX_RATE |
| `src/payments.js` | payment provider abstraction (sim / stripe / razorpay scaffold) |
| `src/supabase.js` | Supabase client init |
| `db/live-hardening.sql` | run-once production constraints + indexes |

### Website (`web/`)
| Area | Files |
|---|---|
| Routes | `app/page.tsx` (home) · `app/search/` · `app/stay/[id]/` · `app/explore/` · `app/saved/` · `app/trips/` · `app/map/` · `app/host/` · `app/sign-in/` · `app/sign-up/` · `app/layout.tsx` |
| Search & booking | `components/SearchBar.tsx` (trio gate + type-ahead) · `RangeCalendar.tsx` (shared calendar) · `SearchResults.tsx` (+FilterSheet wiring) · `FilterSheet.tsx` · `SearchMap.tsx` · `BookingWidget.tsx` (quote/promo/reserve) |
| Stay page | `StayGallery.tsx` · `StayAmenities.tsx` · `StayReviews.tsx` · `StayLocationMap.tsx` |
| Host | `CreateListingForm.tsx` (3-phase wizard) · `HostEarnings.tsx` · `Accordion.tsx` · `TiltCard.tsx` |
| Chrome | `Header.tsx` (route-aware) · `Footer.tsx` + `NewsletterSignup.tsx` · `AuthShell.tsx` + `AuthCaptions.tsx` · `PromoPopup.tsx` |
| Shared UI | `StayCard.tsx` (carousel+heart) · `StayCarousel.tsx` · `CategoryRail.tsx`/`CategoryIcon.tsx` · `DestinationRail.tsx` · `StoryCard.tsx` · `Reveal.tsx` · `RotatingBg.tsx` · `WizIcon.tsx` (line-icon set) · `RecentlyViewed.tsx` · `GlobeMenu.tsx` · `Price.tsx` |
| State/libs | `lib/stayonClient.ts` (API bridge) · `lib/api.ts` (server fetch) · `lib/currency.ts` (20 currencies + detect) · `lib/i18n.ts` (en/hi/fr/es) · `lib/wishlist.ts` · `lib/recentlyViewed.ts` · `lib/wizard.ts` (listing options) · `lib/googleMaps.ts` · `lib/categories|destinations|stories.ts` |
| Styling | `app/globals.css` (the entire design system — tokens at top) |
| Providers | `components/PrefsProvider.tsx` (currency/language/t) · `StayonBridge.tsx` (Clerk→StayOn session) |

### User app (`user/`)
| Area | Files |
|---|---|
| Navigation | `src/navigation/MainNavigator.tsx` (tabs: Home/Explore/Reels/Trips/Profile + stacks) |
| Key screens | `src/screens/HomeScreen` · `ExploreScreen` · `PropertyDetailsScreen` · `BookingScreen` · `TripsScreen` · `MapExploreScreen`/`MapSearchScreen` · `AuthScreen`+`OTPScreen` · `ProfileScreen` (+ Experiences/Reels/StayCoins etc.) |
| Design source | `src/constants/colors.ts` (the teal palette) · `src/components/GradientButton.tsx` (**STAYON_GRADIENT** `#0D9488→#6366F1`) · `PropertyCard.tsx` (card pattern the website mirrors) · `PremiumFilterSheet.tsx` (filter model) |
| Data | `src/data/*` (favorites, recentlyViewed, reviews, wishlists — AsyncStorage) · `src/api/` (backend calls) |

### Host app (`host/`)
| Area | Files |
|---|---|
| Key screens | `src/screens/ListingWizardScreen.tsx` (**the 3-phase wizard the website mirrors**) · `TodayScreen` · `ListingDetailsScreen` · `ReviewsScreen` · `HostLoginScreen` |
| Data | `src/data/listings.ts` (PLACE_TYPES/AMENITY_OPTIONS/etc. — mirrored into `web/lib/wizard.ts`) · `earnings.ts` |
| Design | `src/constants/colors.ts` + `components/GradientButton.tsx` (same palette/gradient as user app) |

> Golden thread: change shared options (amenities, place types, promos) in ONE
> place per side — backend `helpers.js` for rules/promos; `host/src/data/listings.ts`
> + `web/lib/wizard.ts` must be kept identical for wizard parity.
