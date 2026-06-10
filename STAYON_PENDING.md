# StayOn — Pending Work

> The single source of truth for what's left. The **software is essentially complete**
> across guest, host, ops, and backend. What remains splits into: your **accounts/keys**,
> your **actions** (migrations, push, deploy), **production hardening**, and a few **small
> software gaps**. Last updated: 2026-06-10.

---

## 🔑 Needs YOUR accounts / keys (code is ready — just drop them in)
- [ ] **Payments** — `STRIPE_SECRET_KEY` or `RAZORPAY_*`. Adapter runs in **sim mode** now; uncomment the SDK lines in `backend/src/payments.js`.
- [ ] **KYC vendor** — `KYC_API_KEY` (Onfido / Persona / HyperVerge). Seam ready in `backend/src/kyc.js`.
- [ ] **SMS / OTP** — Twilio / MSG91 for **real OTP** (login is phone-based but doesn't verify a real code yet).
- [ ] **AI key** — `GEMINI_API_KEY` for photo room-classification (falls back to manual now).
- [ ] **Insurance / background-check** partners (status-only in Ops).

## 🚀 Needs YOUR action
- [ ] **Run migrations 002–009** in Supabase SQL Editor (in order).
- [ ] **Push to GitHub** — repo `saiprakas/stayon-app` exists, commit ready locally → `git push -u origin main`.
- [ ] **Deploy** — backend → Render, Ops portal → Vercel/Netlify, apps → EAS. Set `EXPO_PUBLIC_API_BASE` / `VITE_API_BASE`. **Restrict the Google Maps key** to your domains.

## 🔒 Production hardening (security — partly code, partly config)
- [ ] **Supabase RLS** policies (service key bypasses them now).
- [ ] Rotate `JWT_SECRET`; set `IDENTITY_SALT`, `OPS_STEPUP_PIN`.
- [ ] Rate-limit auth · HTTPS-only · backups · restrict Ops portal access (SSO).

## 🧩 Small software gaps (no accounts needed)
- [x] **#16 Deep FAQ/support texts** "listing" → "stay".
- [x] **#14 Feature flags** gate Reels / Instant-book (not just StayBot).
- [x] **#13 Host payout-setup screen → `/payout-account/connect`**.
- [x] **#12 Host review list → backend** (replies already sync; list now backend-sourced).
- [x] **#15 Deleted** the dead "gyyyff" test listing (Hyderabad, no references) — done 2026-06-10.

## ✨ Optional polish
- [x] **2FA (TOTP)** for ops staff — enroll/verify, step-up accepts authenticator code (done 2026-06-10).
- [x] **Per-host analytics** — stays, rating, bookings, revenue, payouts in the host drawer (done 2026-06-10).
- [x] **Push notifications** — backend-complete (token storage + Expo push in notify); app activates after `expo install expo-notifications` + dev build.
- [ ] ID↔selfie **auto-match** (needs KYC vendor).

---

## ✅ Done (for reference)
Guest + host app (single Expo app, modes) · all backend endpoints (Supabase) · search /
booking / guest-based pricing / availability / filters · listing create + **edit** · cloud
photos · **guest↔host messaging** · calendar→search availability · reservations→earnings→
payouts · wishlist · notifications · identity dedup · **AI** (StayBot live search, host
assistant, photo classify) · lucide icons · Airbnb maps (Light/Street/Satellite) · **Ops
portal** (29 modules, all wings, RBAC, light/dark, collapsible sidebar, 360 view, KYC
review cards with view-only IDs, payout escrow + **hold** + **scheduler**, settlements,
satisfaction, dev requests, feature flags, **step-up PIN**) · **payments/escrow adapter**
(sim + Stripe-ready) · host **payout connect** · per-staff PINs.

Companion docs: `STAYON_DOCUMENTATION.md` · `STAYON_OPS_SYSTEM_PLAN.md` ·
`STAYON_OPS_RESEARCH_DESIGN.md` · `STAYON_PRODUCTION_INTEGRATIONS.md`.
