# StayOn — Production Backend Plan (cross-device, database-backed)

> The goal you described: **nothing stuck to one phone.** A host (or guest) logs
> in on any device and sees/manages the same listings, bookings, messages,
> photos, earnings — because everything lives in a **central database + object
> storage on a server**, not in the device. This plan turns the working dev
> backend (`/backend`) into that.

---

## 0. Why data "sticks to one phone" today (and the fix)
**Today (dev):** the app stores data in `AsyncStorage` (on the device) and the dev
backend stores in a JSON file + uses a *device-generated* phone for the session.
So two phones = two stores = two accounts. **Not cross-device.**

**The fix (3 pieces):**
1. **Real account** — log in with your *real phone number + OTP* → the server
   maps you to **one `userId`** regardless of device.
2. **Central database** — all data keyed by `userId`/IDs in **PostgreSQL** on a
   server. Any device fetches the same rows.
3. **Object storage + CDN** — photos/videos uploaded to **S3** and served by URL,
   so images aren't local file paths that only exist on the uploader's phone.

Result: log in anywhere → the server returns *your* data → you see and manage
everything identically.

---

## 1. Authentication (same person → same account on every phone)
- **Flow:** `POST /auth/otp/request {phone}` → SMS code → `POST /auth/otp/verify {phone, code}` → returns **access JWT (short)** + **refresh token (long, stored securely on device)**.
- **One identity, two modes:** the same `userId` is guest + host (mode is a UI toggle, not a separate account) — matches the app today.
- **Cross-device:** because the JWT's `sub` is the server `userId` (not a device id), logging in on phone B returns the exact same data as phone A.
- **Sessions:** refresh tokens in a `sessions` table (revocable: "log out all devices"). Store on device in **expo-secure-store** (not AsyncStorage).
- **Providers:** SMS via Twilio/MSG91; optional Google/Apple sign-in later.
- **Replaces:** the current dev `ensureSession` device-phone hack.

## 2. Database (PostgreSQL — the single source of truth)
- **Engine:** PostgreSQL 16 + **PostGIS** (geo). Managed (Supabase / Neon / RDS / Railway) so it's always-on and backed up.
- **Schema:** already specified in `BACKEND_SCHEMA_API.md` (users, host_profiles, identities, listings(+geo), calendar, bookings, payments, payouts, payout_methods, payout_change_requests, threads, messages, reviews, reels, reports, offers, wishlists, notifications, audit_log, events, sessions).
- **Access:** an ORM (Prisma/Drizzle) with **migrations** checked into git (versioned schema).
- **Persistence:** every write hits Postgres; nothing in memory/JSON/device. Daily automated backups + point-in-time recovery.
- **Indexes:** geo (GIST on `listings.geo`), `listings(status)`, `bookings(guest_id/host_id/code)`, `messages(thread_id)`, full-text/trigram on title+city for search.
- **Migration from dev:** swap `backend/src/db.js` (JSON) for a Postgres data layer; same function names so routes don't change.

## 3. Image & video storage (so photos work on every device)
**The problem:** host picks a photo → today it's a local `file://…` URI that only exists on that phone. Other devices/users can't load it.

**The fix — upload to object storage:**
1. App asks: `POST /media/presign {contentType, purpose}` → server returns a **pre-signed S3 upload URL** + the final **CDN URL**.
2. App uploads the file **directly to S3** (fast, doesn't go through the API server).
3. App saves the returned **CDN URL** on the listing/reel (`images: [{url,w,h}]`).
4. Everyone loads the image from the **CDN** (CloudFront/Cloudflare) — fast & global.
- **Videos (reels):** same upload, then a **transcode job** (Mux/MediaConvert) makes streamable versions + thumbnails.
- **Result:** images/videos are durable URLs in the DB → visible on any device, to any user.

## 4. Location & maps (store coordinates, search by place)
- **On listing create:** the host picks an address via **Google Places autocomplete** → app sends `{address, city, state, country, zip, lat, lng}`. Server stores `lat/lng` as a **PostGIS `geography(Point)`**.
- **Geocoding fallback:** if only an address is sent, server geocodes it (Google Geocoding API, server-side key) to get lat/lng.
- **Search by location:** `GET /search?city=Goa` or `?lat=&lng=&radius=` → PostGIS `ST_DWithin` returns listings near that point, ordered by distance. → *exactly your "search a particular location, see listings there."*
- **Maps:** the app renders pins from each listing's `lat/lng` (Google Maps on native, the web map component on web). The **Maps/Places API key stays on the server** (proxy `/geo/autocomplete`, `/geo/geocode`) — never shipped in the app (current launch-blocker).
- **Availability + price** join `calendar` + `bookings` so search hides booked dates and shows the right nightly price.

## 5. Real-time & notifications (stay in sync across devices)
- **Realtime:** WebSocket channel per user (`/ws/user/{id}`) — new message, booking update, listing approved → pushed live to **all** the user's open devices.
- **Push:** FCM (Android) + APNs (iOS) + web push — booking confirmed, message, payout sent, listing approved/rejected, review request.
- **Polling fallback:** `GET /notifications` (already built) for environments without sockets.
- **Consistency model:** the API is **stateless**; every device reads/writes the same Postgres rows, so there's no "device A is ahead of device B" — refresh/socket gives the latest.

## 6. Deployment (so any phone can reach it)
- **Today:** `http://localhost:4000` only works on this machine. A real phone can't reach `localhost`.
- **Fix:** deploy the backend to a host (Railway / Render / Fly.io / AWS) → get a **public HTTPS URL** like `https://api.stayon.com`.
- **App config:** point the app at it via `EXPO_PUBLIC_API_BASE=https://api.stayon.com/v1` (the client already reads this env var; falls back to localhost in dev).
- **Environments:** `dev` (local), `staging`, `prod` — separate DBs + URLs.
- **CI/CD:** push to main → run migrations → deploy. Health check `/`.

## 7. Payments (cross-device safe by design)
- Marketplace provider (**Stripe Connect / Razorpay Route**): card data is tokenized by the provider (PCI), tokens stored server-side → a saved card works on any device the user logs into. Escrow hold → payout on check-in+24h → **0% platform fee**. Webhooks (`/webhooks/payments`) keep state correct.

## 8. Security & integrity
- Keys server-side (Maps, Anthropic, payment, SMS) — never in the app bundle.
- TLS everywhere; PII + tokens encrypted at rest; refresh-token rotation; rate limiting; RBAC + `audit_log` on every Ops action; KYC/AML via provider; GDPR data-export/delete.

## 9. What changes vs the current dev backend (concrete migration)
| Piece | Now (dev) | Production |
|---|---|---|
| Store | JSON file `data/db.json` | PostgreSQL (+PostGIS) |
| Auth | device pseudo-phone | real phone OTP → one `userId` per person |
| Token store (app) | AsyncStorage | expo-secure-store (+ refresh) |
| Images | local `file://` URIs | S3 upload (presigned) + CDN URLs |
| Location | lat/lng if provided | Places autocomplete + server geocode + PostGIS search |
| Reachability | localhost:4000 | public HTTPS (deployed) + `EXPO_PUBLIC_API_BASE` |
| Realtime | polling | WebSocket + push |
| Data layer | `db.js` functions | same function names, backed by ORM/Postgres |

> Because routes and function names stay the same, swapping the data layer is
> mostly mechanical — the API surface in `BACKEND_SCHEMA_API.md` doesn't change.

## 10. Build order (efficient path to "works on any phone")
1. **Postgres + ORM + migrations** — port `db.js` collections to tables (same function signatures). *(unlocks real persistence)*
2. **Real OTP auth + sessions + secure token storage** — same account on every device. *(unlocks cross-device)*
3. **Media upload (presign + S3 + CDN)** — host photos/reels become URLs. *(unlocks images everywhere)*
4. **Location: Places/geocode proxy + PostGIS geo-search** — search a city → see listings there.
5. **Deploy to a public URL + point the app at it** (`EXPO_PUBLIC_API_BASE`). *(unlocks "any phone")*
6. **Realtime + push notifications.**
7. **Payments (Connect) + payouts.**
8. **Ops portal UI** on the verified `/ops/*` endpoints.
9. **Harden** — security, backups, monitoring, load.

After **1–5**, your exact requirement is met: **log in on any phone → see and manage all your data, with working images and location search.** 6–9 make it production-grade.

---
### Acceptance test for "not stuck to one phone"
1. Host on **Phone A**: log in (real number) → create listing with photos → Ops approves.
2. Guest on **Phone B**: search that city → sees the listing **with photos on the map**.
3. Host logs in on **Phone C** (new device): sees the same listing, its bookings, messages, earnings — and can edit/manage it.
4. Edit on Phone C → reflects on Phone A after refresh/socket.
✅ When all four pass, data lives in the DB, not the device.

---

## Identity & anti-fraud — one person = one identity

**Goal:** a single real-world person can hold exactly **one** StayOn account. Logging
in with a different phone number but the **same government ID** must be rejected.

### Layers (implemented)
1. **Phone uniqueness** — `users.phone` is `unique`. One phone → one account.
2. **Identity uniqueness** — `identities.id_hash` is a **salted SHA-256** of
   `(idType + idNumber + dob)` with a **unique index** (`migration-003`). The raw
   ID is **never stored**. A second account submitting the same ID is rejected
   with `409 IDENTITY_IN_USE`. App surfaces "This ID is already linked to another
   account." (`POST /v1/identity/submit`, `IdentityVerificationScreen`).
3. **Ops review** — every submission lands in the KYC queue
   (`/v1/ops/queues/kyc`) for a `kyc_reviewer` to approve/reject.

### Layer still needed for production — document authenticity
Uniqueness ≠ authenticity. A unique-but-fake ID could be submitted once. To prove
the document is **genuine**, plug a KYC provider into the seam at
**`backend/src/kyc.js` → `verifyIdentity()`**:
- Set `KYC_PROVIDER` + `KYC_API_KEY` (Onfido / Persona / HyperVerge).
- Implement the provider branch (create inquiry with doc images → map decision to
  `verified | rejected | pending`).
- Without a provider, submissions default to **manual Ops review** (nothing is
  auto-approved, so fakes don't slip through silently).
- Also set `IDENTITY_SALT` (a long random secret) so the ID hash isn't guessable.

### Migrations to run (Supabase SQL Editor)
- `migration-002-listing-extra.sql` — stay extras + guest-based pricing.
- `migration-003-identity-unique.sql` — the unique identity hash (anti-fraud).
