# StayOn — Pending, Gaps & Road to the Ops Phase

> Living checklist of what's done, what's left, what to focus on, and what must be
> in place to enter the **Ops phase**. Companion to `BACKEND_PLAN.md`,
> `BACKEND_CONNECTIONS.md`, `BACKEND_SCHEMA_API.md`, `BACKEND_INTEGRATION.md`,
> `BACKEND_PRODUCTION_PLAN.md`, `OPS_PORTAL_DESIGN.md`. Last updated: 2026-06-07.

---

## 1. Snapshot — where we are
- **Backend:** complete & **Supabase database-backed**. Every functional endpoint exists; **54/54 connection tests pass** (`cd backend && npm run test:full`). Runs locally at `http://localhost:4000`. **Not yet deployed** (public URL).
- **Apps (guest+host):** core **write-paths wired to the backend**; catalogue reads from backend. Several **read screens still show mock/local data**.
- **Ops portal:** **designed**, not built.
- **Production infra (OTP, payments, realtime, deploy):** not started.

---

## 2. ✅ Completed
- One Supabase-backed backend serving User · Host · Ops (one DB, one source of truth).
- Auth (one account per person across devices/modes) — *dev login, not yet SMS-verified*.
- Listings: create → submit → Ops approve/reject → published → search.
- **Geo-radius search** + city search; **calendar & per-date pricing** endpoints.
- Bookings ⇄ reservations: create + accept/decline/checkin/checkout/cancel, synced by code.
- Messaging (contact-guard), Reviews (guest→host **and** host→guest), Reels (Ops-moderated), Reports.
- KYC submit → Ops verify. Payout-change → Ops approve. Earnings/payouts (0% fee).
- Wishlists, notifications, media presign (Supabase Storage).
- Ops: queues (listings/kyc/reels/payout-changes/reports), bookings oversight + force-cancel + refunds, review moderation, users (suspend/ban), dashboard, **audit log**, RBAC (403-gated).
- App wired: auth, catalogue (Home/Explore), publish, bookings/reservations, messaging, reviews, reels, KYC, report-listing.

---

## 3. ⏳ Pending — BACKEND (no functional gaps; production infra only)
The 5 functional gaps are **closed**. Remaining is production-grade infra:
- [ ] **#6 Real OTP/SMS auth** — verify phone via Twilio/MSG91 (today login isn't code-verified). *(needs your account)*
- [ ] **#7 Payments** — Stripe/Razorpay Connect: real escrow + payouts (today derived/mock). *(needs your account)*
- [ ] **#8 Realtime + push** — WebSocket for live chat/queues; FCM/APNs push (today polling).
- [ ] **#9 RLS policies** on Supabase tables — defence-in-depth (safe now behind the Express+service-key layer).
- [ ] **#10 Hardening** — input validation, rate limiting, error consistency, backups/monitoring.
- [ ] **Deploy** the backend to a public URL (Render config ready) so non-local devices connect.

---

## 4. ⏳ Pending — APP ↔ BACKEND wiring (remaining reads)
Write-paths are wired; these **display** screens still read mock/local data:
- [ ] **Search / Map tab** (MapExplore) → use `Api.search` (incl. geo). *(Home/Explore already use backend.)*
- [ ] **Image upload** → wire photo picker to `Api.media.presign` → Supabase Storage (today photos are local `file://`).
- [ ] **Notification center** → `Api.notifications` (+ mark read).
- [ ] **Host Earnings / Payouts screens** → `Api.earnings` / `Api.payouts`.
- [ ] **Wishlist** heart-toggle → `Api.wishlists`.
- [ ] **Host management reads** — Listings, Reservations, Reviews, Inbox screens → read from backend (`Api.listings.mine`, `Api.reservations.mine`, `Api.reviews`, `Api.threads`).
- [ ] **Host calendar UI** → persist via `Api.listings.setCalendar` / `setPricing`.

---

## 5. 🎯 Focus areas / risks
- **Image upload is the biggest UX gap** — without it, host photos don't show on other devices. Do this early.
- **Deploy + real OTP** are what truly deliver "any phone, same data" (cross-device). Until deployed, it's local-only.
- **Catalogue is mixed** — Home/Explore blend backend + generated stays; bookings/messages reflect only for *backend* listings. Fully backend-driven catalogue removes the asterisks.
- **Mock auth** — anyone can log in as any phone until OTP is added (fine for dev, not launch).
- **Minor polish (deferred):** FlatList virtualization · "Verified" badge → real KYC · reel auto-open timer.

---

## 6. ✅ Pre-Ops phase checklist (what's needed to START Ops)
Good news: **the Ops phase can begin now** — the backend already exposes every Ops endpoint, tested.
- [x] Ops endpoints exist & pass tests (queues, approve/reject, dashboard, audit, RBAC).
- [x] Backend reachable locally for development (`localhost:4000`).
- [x] Ops portal **designed** (`OPS_PORTAL_DESIGN.md`).
- [ ] *(for the Ops team to use it for real, later)* backend **deployed** to a public URL.
- [ ] *(optional)* a few real `pending_review` items to review (create via the app).

→ **Building the Ops portal does NOT require deploy or payments.** It only needs the backend running (local is fine) + the design (done).

---

## 7. Ops phase — scope (what we build there)
MVP (fastest useful): **Login → Dashboard → Listings approve/reject + Reports resolve + Users suspend.**
Full: + KYC, Reels, Payout-changes, Bookings oversight, Reviews moderation, Audit. (All endpoints ready.)
Tech: `ops/` = Vite + React + TS, talks to the same backend. See `OPS_PORTAL_DESIGN.md`.

---

## 8. What's needed from YOU (when we reach each item)
- **Now (Ops build):** nothing — backend is ready locally.
- **Deploy (cross-device):** push repo to GitHub → connect Render (config ready) → paste Supabase keys as env vars.
- **Real OTP (#6):** a Twilio or MSG91 account (SID/token/sender).
- **Payments (#7):** a Stripe or Razorpay account (API keys + Connect/Route enabled).
- **Maps/Geo (prod):** a Google Maps/Places API key (Setup Step 6).

---

## 9. Recommended order from here
1. **Build the Ops portal MVP** (no blockers) — makes host→approve→guest real with a human.
2. **Wire image upload** to Supabase Storage (photos everywhere).
3. **Deploy to Render** (cross-device for real).
4. **Finish remaining app reads** (search/map, notifications, host screens, wishlist).
5. **Production:** OTP → payments → realtime → RLS/hardening.
