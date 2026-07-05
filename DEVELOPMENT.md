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
