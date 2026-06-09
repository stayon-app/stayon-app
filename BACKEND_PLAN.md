# StayOn — Backend Plan (the "in-between" that connects User · Host · Ops)

> 📌 Living status & to-do: see **`STAYON_PENDING.md`** — what's done, the gaps,
> focus areas, and the readiness checklist for the Ops phase.

> Goal: a single **central service** that the User app, the Host app, and the
> Operations portal all connect to. The backend is the conduit; Ops is the
> control panel on top of it; the apps are clients. Core product rule: **0%
> platform fee** (hosts keep 100% of rate + cleaning; only taxes pass through).
> Only two platform offers exist: **15% first booking**, **10% referral**.

---

## 1. Principles
- **Single source of truth.** All listings, bookings, messages, payouts, reviews live in the central DB — not on devices.
- **Ops gates trust.** Anything that affects other users (listings, reels, payout-account changes, KYC) is *submitted → reviewed by Ops → goes live*.
- **API-first.** One versioned API; three clients consume it (User, Host, Ops). Web + iOS + Android.
- **Secure by default.** Keys server-side, PCI handled by the payment provider, PII encrypted, every Ops action audited.

## 2. High-level architecture
```
 User app ─┐                                   ┌─ Host app
           ├──► API Gateway (REST/GraphQL) ◄────┤
 Ops portal┘            │                        
                        ▼
   ┌─────────────────────────────────────────────────────────┐
   │  Services: Auth · Users · Listings · Search · Bookings ·  │
   │  Pricing · Payments · Messaging · Reviews · Media ·        │
   │  Moderation · Offers · Notifications · Trust&Safety · AI    │
   └───┬───────────┬───────────┬───────────┬──────────┬────────┘
       ▼           ▼           ▼           ▼          ▼
   Postgres     Redis      Elastic/      S3/CDN     Queue
  (+PostGIS)  (cache)     Typesearch    (media)   (jobs/events)
                        (search index)
   External: Payment provider (Stripe/Razorpay Connect) · KYC provider
   (Onfido/Persona) · SMS/Email · Maps/Places · LLM (Claude) · Push (FCM/APNs)
```

## 3. Tech stack (recommended)
- **API:** Node.js (NestJS/Express) or similar; REST (or GraphQL). Versioned `/v1`.
- **DB:** PostgreSQL + **PostGIS** (geo). **Prisma/TypeORM** for schema.
- **Cache/rate-limit/sessions:** Redis.
- **Search:** Elasticsearch / OpenSearch / Typesense (geo + filters).
- **Object storage + CDN:** S3 + CloudFront (photos, reel videos).
- **Media pipeline:** transcoding (Mux / MediaConvert) for reels.
- **Queue/stream:** SQS / RabbitMQ / Kafka (payouts, moderation, notifications, transcode).
- **Realtime:** WebSocket/Socket.IO or a managed service (Ably/Pusher) for chat + live ops queues.
- **Secrets:** Vault / cloud secrets manager (move the Maps & Anthropic keys off the client).

## 4. Data model (core entities)
Each maps to what the apps already produce.

| Entity | Key fields | Status enum |
|---|---|---|
| **User** | id, phone, email, name, roles[], countryCode, createdAt | active / suspended / banned |
| **HostProfile** | userId, about, languages[], work, hostingSince | — |
| **Identity (KYC)** | userId, legalName, dob, idType, idLast4, provider ref | unverified / **pending** / verified / rejected |
| **Listing** | id, hostId, title, type, address, lat/lng, city/state/country/zip, guests, beds, baths, price, weekendPrice, cleaningFee, currency, images[], videos[], amenities[], vibes[], houseRules, cancellationPolicy, instantBook | draft / **pending_review** / published / rejected / snoozed |
| **PricingCalendar** | listingId, date, priceOverride, blocked | — |
| **Booking** | id, code, listingId, guestId, checkIn/Out, nights, guests, subtotal, cleaning, taxes, total, card | pending / confirmed / completed / cancelled |
| **Payment** | bookingId, amount, currency, providerRef, escrowState | authorized / captured / refunded |
| **Payout** | hostId, bookingId, amount, method, releaseAt | scheduled / paid / held |
| **PayoutMethod** | hostId, kind(bank/upi/paypal), maskedLabel, verified | — |
| **PayoutChangeRequest** | hostId, requested method, submittedAt | **pending** / approved / rejected |
| **Reel/Story** | id, authorId, type(reel/story), title, mediaUrl, caption | **pending** / live / rejected |
| **Review** | bookingId, authorId, rating, text, response | published / removed |
| **MessageThread / Message** | threadId, listingId, guestId, hostId; msg{sender, text, ts}, unread | — |
| **Report/Dispute** | id, reporterId, targetType(listing/user/booking/review), targetId, reason, details | **open** / reviewing / resolved / dismissed |
| **Offer/Redemption** | type(first15/referral10), userId, bookingId, status | — |
| **MaintenanceIssue / DamageReport / SafetySettings** | per listing | open / in_progress / fixed |
| **AuditLog** | actorId(ops), action, targetType, targetId, ts | — |
| **Notification** | userId, type, payload, read | — |

**Bold statuses = the queues the Ops portal works.**

## 5. API surface (grouped by consumer)
*(REST shape shown; same data via GraphQL works too.)*

**Auth (all)**
`POST /auth/otp/request` · `POST /auth/otp/verify` · `POST /auth/social` · `POST /auth/refresh` · `GET /me`

**User app**
`GET /search?city&dates&guests&price&vibes&amenities` (hits search index) · `GET /listings/:id` · `POST /bookings` · `GET /bookings` (my trips) · `POST /bookings/:id/cancel` · `GET /receipts` · `POST /reviews` · `GET/POST /threads/:id/messages` · `GET/POST /wishlists` · `GET /destinations` · `GET /things-to-do` · `GET /reels`

**Host app**
`POST/PUT /listings` (→ pending_review) · `GET /listings` (mine) · `PUT /listings/:id/calendar` (per-date/range price + block) · `GET /reservations` · `POST /reservations/:id/accept|decline|checkout` · `GET /earnings` · `GET /payouts` · `POST /payout-method/change-request` · `POST /reels` (→ pending) · `GET/POST /threads` (inbox) · `GET /reviews` · `POST /reviews/:id/respond` · `GET/PUT /safety` · `GET/POST /maintenance`

**Ops portal**
`GET /ops/queues/listings?status=pending_review` + `POST /ops/listings/:id/approve|reject` · `GET /ops/queues/kyc` + `approve|reject` · `GET /ops/queues/reels` + `approve|reject` · `GET /ops/queues/payout-changes` + `approve|reject` · `GET /ops/reports` + `resolve|dismiss` · `GET /ops/bookings` (oversight, force-cancel) · `POST /ops/refunds` · `GET /ops/users` + `suspend|ban` · `GET /ops/offers` · `GET /ops/dashboard` · `GET /ops/audit` (every action logged, RBAC-gated)

## 6. Core flows (Ops in the middle)
**Publish a listing (public visibility)**
`Host POST /listings` → `pending_review` → **Ops approve** → `published` → indexed in search → appears in any user's `GET /search`. *(This is the exact gap you flagged — listings go public only after Ops approval.)*

**Booking + payout (0% fee, escrow)**
`User POST /bookings` → Payment authorized & **held (escrow)** → host `accept` (or Instant Book) → on check-in+24h, **Payout released** (rate+cleaning, no platform fee) → `completed`. Cancellation → refund (taxes withheld).

**Payout-account change (ops-verified)**
`Host change-request` → `pending` → **Ops verifies identity vs. account** → approve → live method updates everywhere.

**Reels / stories** → `pending` → **Ops approve** → `live` in feed.
**KYC** → submit → `pending` → **Ops/Provider verify** → `verified` (unlocks instant book / payout changes).
**Report/dispute** → user files → `open` → **Ops resolve/dismiss** → refund/penalty as needed.
**Messaging** → realtime threads; **contact-guard** server-side (block phone/email/address pre-booking).

## 7. Auth, roles & permissions
- **End users:** one identity, two modes (guest/host) — already how the app works.
- **Ops RBAC:** Super Admin · Ops Manager · Trust & Safety · KYC reviewer · Content moderator · Finance/Payouts · Support · Compliance · Analyst (read-only). Every Ops mutation → **AuditLog**.

## 8. Payments
Marketplace provider (**Stripe Connect / Razorpay Route / Adyen**): split payments, escrow hold, scheduled payouts, refunds, multi-currency + live FX, KYB for host payout accounts, invoices/receipts, chargebacks. **Never store raw cards** — provider tokens only (PCI).

## 9. Media & search
- **Media:** host photos/reels upload to S3 (presigned URLs), served via CDN; reels transcoded. *(Fixes the "local file path can't be seen by others" problem.)*
- **Search:** listings indexed (geo + price + vibes + amenities + availability) so `GET /search` is fast for everyone.

## 10. Realtime & notifications
- **Realtime:** chat messages + Ops queue counters via WebSocket.
- **Notifications:** push (FCM/APNs) + SMS + email — booking confirmed, message received, payout sent, listing approved/rejected, review request.

## 11. AI/ML integration points (behind an AI gateway, keys server-side)
StayBot (guest) · Host Assistant · Smart Pricing (demand forecast) · search ranking/recs · **content moderation** (reel/photo/text classifiers feeding the Ops queue) · contact-guard (PII detection) · fraud/risk · reviews sentiment.

## 12. Security & compliance
Keys server-side · TLS + encryption at rest · PII encryption · PCI via provider · KYC/AML · GDPR/data-rights · rate limiting · RBAC + audit log · fraud monitoring.

## 13. Environments & DevOps
`dev / staging / prod` · CI/CD · DB migrations · observability (logs/metrics/traces) · backups · feature flags.

## 14. Build milestones (phased)
1. **Foundation** — Auth, Users, Listings, Bookings; Postgres + Redis + S3. *(unlocks real multi-user)*
2. **Migrate apps** — swap User & Host apps from AsyncStorage to the API (UI unchanged).
3. **Ops portal v1** — the review queues (listings, KYC, reels, payout-changes, reports) + audit + RBAC. *(makes listings actually go public)*
4. **Payments** — Connect provider, escrow, payouts, refunds, reconciliation.
5. **Search + media pipeline** — index listings, transcode reels, CDN.
6. **Realtime + notifications.**
7. **AI services** (gateway + moderation + pricing/recs).
8. **Hardening** — security, compliance, load, monitoring.

---
*Order to build: **#1 backend foundation → #2 migrate apps → #3 ops portal → #4 payments → …**. Design the Ops queues up front (they define #1's schema).*
