# StayOn — Integration Map (how EVERYTHING connects)

> Capstone for `BACKEND_PLAN.md` · `BACKEND_CONNECTIONS.md` · `BACKEND_SCHEMA_API.md`.
> Three parts: **A)** end-to-end sequence flows (all parties wired together),
> **B)** the Ops portal screens mapped to endpoints/roles, **C)** the migration
> map — every existing app file → the backend endpoint that replaces its local
> `AsyncStorage`. When C is done, the apps + ops are fully connected through the BE.

---

# PART A — End-to-end sequence flows (everything wired)

### A.1 Listing goes public (Host → Ops → every User)
```
Host app        Backend            Search Index      Ops portal        User app
  │  POST /listings (draft)         │                  │                 │
  │  POST /media/presign → S3       │                  │                 │
  │  POST /listings/:id/submit ─────▶ status=pending_review               │
  │                                 ├── queue item ────▶ (sees it)        │
  │                                 │   AI pre-mod      │                 │
  │                                 │◀── approve ───────┤ POST /ops/listings/:id/approve
  │◀ PUSH "approved"  status=published                  │                 │
  │                                 ├── index ─────────▶│                 │
  │                                 │                                     │  GET /search → sees listing
```

### A.2 Booking → payment → payout (User ⇄ Host, escrow, 0% fee)
```
User           Backend           Provider(EXT)        Host           Ops
 │ GET /quote                     │                    │              │
 │ POST /bookings ───────────────▶ authorize(escrow) ─▶│              │
 │◀ pending/confirmed   ◀ webhook authorized           │              │
 │                                ├ PUSH "request" ────▶│             │
 │                                │◀ accept ────────────┤ POST /reservations/:id/accept
 │◀ PUSH "confirmed"   capture ──▶│                     │             │
 │ … stay …                       │                     │             │
 │                                │◀ checkout ──────────┤ POST /reservations/:id/checkout
 │◀ trip completed; review unlocked                     │             │
 │                                ├ JOB: release payout (check-in+24h) ─▶ Host paid (rate+cleaning, fee=0)
 │ POST /bookings/:id/cancel ─────▶ refund (taxes withheld) ──────────▶ Host calendar freed
 │                                                       (dispute? ───▶ Ops force-cancel / refund)
```

### A.3 Payout-account change (Host → Ops verify → live)
```
Host  POST /payout-method/change-request ─▶ BE status=pending ─▶ Ops queue
Ops   POST /ops/payout-changes/:id/approve ─▶ method.verified=true ─▶ PUSH host
```

### A.4 KYC (User/Host → Provider → Ops → verified)
```
User/Host POST /identity/submit ─▶ BE pending ─▶ EXT verify ─▶ webhook ─▶ Ops queue
Ops POST /ops/kyc/:id/approve ─▶ identity=verified ─▶ unlock instant-book / payout edits
```

### A.5 Messaging (User ⇄ Host realtime; Ops on dispute)
```
User POST /threads/:id/messages ─▶ contact-guard ─▶ store ─▶ WS push Host (+unread)
Host POST /threads/:id/messages ─▶ WS push User
Ops  GET /ops/threads/:id (only when a report is open; audited)
```

### A.6 Report → dispute → enforcement (User/Host → Ops → both)
```
User/Host POST /reports ─▶ BE open ─▶ Ops queue
Ops resolve ─▶ may trigger: refund (payments), review remove, user suspend, host warn ─▶ PUSH parties
```

### A.7 Reel (Author → Ops → public feed)
```
Author POST /media/presign → upload → POST /reels ─▶ pending ─▶ JOB transcode+AI ─▶ Ops queue
Ops approve ─▶ live ─▶ GET /reels (Users) ; "View this stay" → GET /listings/:id
```

---

# PART B — Ops portal screens → endpoints + role

| Screen | Reads | Acts | Role |
|---|---|---|---|
| **Dashboard** | `GET /ops/dashboard` (+WS counters) | — | all |
| **Listing review** | `GET /ops/queues/listings` `GET /listings/:id` | `approve` `reject` | content_mod |
| **KYC review** | `GET /ops/queues/kyc` | `approve` `reject` | kyc_reviewer |
| **Reels/content** | `GET /ops/queues/reels` | `approve` `reject` | content_mod |
| **Payout changes** | `GET /ops/queues/payout-changes` | `approve` `reject` | finance |
| **Payouts/finance** | `GET /ops/payouts` `GET /ops/reports/finance` | `release` `hold` `refund` | finance |
| **Reports/disputes** | `GET /ops/reports` | `assign` `resolve` `dismiss` | trust_safety |
| **Bookings oversight** | `GET /ops/bookings` | `force-cancel` `refund` | ops_manager |
| **Users** | `GET /ops/users/:id` | `suspend` `ban` `reinstate` `impersonate` | trust_safety |
| **Reviews** | `GET /ops/reviews?flagged` | `remove` | content_mod |
| **Offers** | `GET /ops/offers` | view/audit | finance |
| **Support inbox** | `GET /ops/tickets` `GET /ops/threads/:id` | reply/close | support |
| **Staff & roles** | `GET /ops/staff` | add/role | super_admin |
| **Audit log** | `GET /ops/audit` | — | compliance |

Every mutation → `audit_log`. Every screen gated by `staff_role`.

---

# PART C — Migration map (existing app files → backend endpoints)

> Strategy: introduce a thin **`api` client** (`src/api/*`) and replace each
> data module's `AsyncStorage` reads/writes with API calls. UI/screens stay the
> same — only the data layer changes. Do it module by module.

### User app (`d:/Stayon/user/src`)
| Current file (local storage) | Replace with endpoint(s) |
|---|---|
| `data/bookings.ts` (getBookings, cancelBooking, restoreBooking, setBookingStatusByCode) | `GET /bookings` · `POST /bookings/:id/cancel` · (status now server-driven) |
| `data/reviews.ts` (addReview, getReviews) | `POST /reviews` · `GET /listings/:id/reviews` |
| `data/hostListings.ts` (guest catalogue bridge) | **delete** — replaced by `GET /search` & `GET /listings/:id` |
| `screens/ChatScreen.tsx` (local thread + fake reply) | `POST /threads` · `GET/POST /threads/:id/messages` + WS |
| `screens/HomeScreen / ExploreScreen / MapExploreScreen` | `GET /search` · `GET /destinations` · `GET /reels` |
| `screens/PropertyDetailsScreen` (createMockProperty) | `GET /listings/:id` (+ `GET /listings/:id/quote`) |
| `screens/WishlistScreen` | `GET/POST/DELETE /wishlists` |
| `screens/PaymentMethodsScreen` | `GET/POST /payment-methods` (provider tokens) |
| `screens/StayWalletScreen / TripSpendingScreen` | `GET /wallet` · `GET /receipts` |
| `screens/IdentityVerificationScreen` | `POST /identity/submit` |
| `screens/BookingScreen` (createBooking) | `POST /bookings` (+ provider payment) |
| `services/places.ts` (Google key on client) | proxy via `GET /geo/autocomplete` (key server-side) |
| `services/aiProvider.ts` / `stayBotEngine.ts` | `POST /ai/chat` (gateway, key server-side) |
| `contexts/AuthProvider` (local auth) | `POST /auth/otp/*` · `GET /me` (JWT) |

### Host app (`d:/Stayon/user/src/host`)
| Current file | Replace with endpoint(s) |
|---|---|
| `data/listings.ts` (saveListing, getListings, newDraft) | `POST/PUT /listings` · `POST /listings/:id/submit` · `GET /listings` (mine) |
| `data/reservations.ts` (setReservationStatus, …ByCode, addReservationFromBooking) | `GET /reservations` · `POST /reservations/:id/accept|decline|checkout` (sync now server-side) |
| `data/messages.ts` (threads, sendHostMessage, getOrCreateThread, sendGuestMessage) | `GET /threads` · `POST /threads/:id/messages` + WS |
| `data/hostReviews.ts` (getGuestReviews, addGuestReview, respondToReview) | `GET /reviews?host=me` · `POST /reviews/:id/respond` |
| `data/earnings.ts` (ledger, markHostingStarted) | `GET /earnings` · `GET /payouts` |
| `data/maintenance.ts` / `data/safety.ts` | `GET/POST /maintenance` · `GET/PUT /listings/:id/safety` |
| `screens/CalendarScreen` (per-date/range price) | `PUT /listings/:id/calendar` · `PUT /listings/:id/pricing` |
| payout bank-change flow | `POST /payout-method/change-request` |
| reels posting | `POST /reels` |

### Ops portal (new web app)
Built fresh against `GET/POST /ops/*` (Part B). No migration — greenfield client.

### Shared client to build
`src/api/client.ts` — base fetch with JWT + refresh + error mapping ·
`src/api/ws.ts` — socket for messages + ops counters ·
typed endpoint wrappers per domain (`api.listings.*`, `api.bookings.*`, …).

---

# PART D — Order to connect everything
1. **Auth + api client + WS** → every other call depends on it.
2. **Listings + Media + Search** + **Ops listing queue** → host publishes, user sees (the core public loop).
3. **Bookings + Pricing/Calendar** → the U⇄H transaction loop.
4. **Payments + Payouts + payout-change (Ops)** → money flows.
5. **Messaging + Reviews + Notifications** → communication loops.
6. **KYC + Reports/Disputes + Trust actions** → the full Ops middle layer.
7. **Wallet + Offers + Wishlists + Safety/Maintenance** → remaining features.
8. **AI gateway + analytics + hardening.**

✅ When Part C is complete for every row, the **User app, Host app, and Ops portal are fully connected through the backend** — nothing lives on-device, everything flows through the central service with Ops in the middle.
