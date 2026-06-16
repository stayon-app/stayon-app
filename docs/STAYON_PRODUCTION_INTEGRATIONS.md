# StayOn — Production Integrations Playbook

> How to take StayOn from "works on localhost" to "moves real money safely." Covers
> the **escrow bank-middleware** (hold money, release on a trigger), **payments**
> (Stripe / Razorpay), **KYC vendor**, **insurance / background checks**, and
> **deployment** — what to get, how to connect, and how it ties the **guest app**,
> **host app**, and **Ops portal** together. Date: 2026-06-10.

---

## 0. The big picture — three layers, one money pipeline

```
 GUEST app ──pay──►  ┌──────────────────────────────────────────┐
                     │   PAYMENT PROCESSOR (the "bank middleware")│
 HOST app  ◄payout── │   Stripe Connect  /  Razorpay Route        │
                     │   • collects guest money                   │
 OPS portal ─hold──► │   • HOLDS it (escrow / held balance)       │
        release/     │   • releases → transfers to host on trigger│
        refund       └───────────────┬───────────────────────────┘
                                     │ webhooks + API
                            ┌────────▼─────────┐
                            │  StayOn BACKEND   │  records intent, escrow row,
                            │  (Express+Supabase)│  hold flag, payout state, audit
                            └───────────────────┘
```

**Key idea:** StayOn never literally "holds cash in a bank account" itself — that needs
a money-transmitter licence. Instead the **payment processor's marketplace product**
(Stripe **Connect** or Razorpay **Route**) is the regulated middleware that holds the
guest's money and only **transfers it to the host when StayOn triggers it** (after
check-in, unless Ops put it on hold). StayOn's backend is the **brain** that decides
*when* — the processor is the **vault** that does it legally.

### StayOn's 0% rule + processor fees (decide this first)
StayOn takes **0% platform fee** — the host keeps 100% of the nightly price. But Stripe/
Razorpay charge **their own** processing fee (~2.9% + ¢30 / ~2% in India). Someone pays it.
Options: (a) **guest pays it** as a separate "payment processing" line (cleanest, keeps
"host gets 100%"), (b) **StayOn absorbs it** (marketing cost), or (c) **host absorbs it**.
**Recommended: guest pays the processor fee** — preserves the 0%-to-host promise.

---

## 1. Payments + Escrow (the core) — Stripe Connect or Razorpay Route

### Which to use
- **India-first / INR:** **Razorpay Route** (built for Indian marketplaces, supports
  hold + linked-account transfers, UPI/cards/netbanking).
- **Global / USD:** **Stripe Connect** (Express accounts) — the world standard for
  marketplaces with **delayed payouts** and held balances.
- You can run **both** (region-routed). StayOn already stores prices in USD and converts.

### What to get
| Provider | Get this |
|---|---|
| **Stripe** | Business account → enable **Connect** → API keys (`STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`), **webhook signing secret**, Connect **client id** |
| **Razorpay** | Account → activate **Route** → `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, webhook secret |
| Both | A business entity, bank account, PAN/GST (India) or EIN (US), and KYB approval (1–3 days) |

### How the escrow flow works (Stripe Connect example)
1. **Host onboarding** → create a Stripe **Connected (Express) account** for the host;
   host completes Stripe's bank + ID onboarding (hosted page). Store `stripe_account_id`
   on the host. *(This replaces our placeholder `bank_accounts` table verification.)*
2. **Guest books** → backend creates a **PaymentIntent** with
   `capture_method: 'manual'` **or** uses `transfer_data` + a delayed transfer so the
   funds land in **StayOn's platform balance (held)**, not the host's, yet.
3. **Money is now in escrow** — sitting in the processor, controlled by StayOn.
4. **Trigger to release** (the "after a certain time"):
   - Default: **24h after check-in** (our `payout.run-scheduler` already computes this).
   - The scheduler calls Stripe **`transfers.create`** → moves the held funds to the
     host's connected account → Stripe **pays out** to the host's bank on its schedule.
5. **Ops hold** → if `payout_held = true` (dispute/issue), the scheduler **skips** the
   transfer until Ops **releases** it. (Already wired: `/ops/bookings/:code/hold` /`/release`.)
6. **Refund** → before release, `refunds.create` returns money to the guest (Ops "Refund").

### Where it plugs into StayOn (the seams already exist)
| StayOn piece (today) | Becomes (production) |
|---|---|
| `bookings.total_usd` + booking create | Create **PaymentIntent**; store `payment_intent_id` |
| `bank_accounts` table + "verify" | Stripe **Connected account** onboarding + status |
| `/v1/ops/escrow` (derived view) | Reflect real **held balance** + transfer state |
| `payout_held` / `/ops/bookings/:code/hold` | **Skip the Stripe transfer** while held |
| `/v1/ops/payouts/run-scheduler` | Loop eligible bookings → **`transfers.create`** |
| `/v1/ops/refunds` | **`refunds.create`** on the PaymentIntent |
| **0% fee** | `application_fee_amount = 0` (host gets 100%); guest covers processor fee |

### New backend pieces to add
- `src/payments.js` — a provider adapter: `createIntent(booking)`, `capture(code)`,
  `transferToHost(code)`, `refund(code, amount)`, `createConnectedAccount(host)`,
  `onboardingLink(host)`. One interface, Stripe + Razorpay behind it (like `kyc.js`).
- **Webhooks** — `POST /v1/webhooks/stripe` (verify signature) to mark
  paid / transferred / payout.paid / charge.refunded and update `bookings` + notify.
- Columns: `bookings.payment_intent_id`, `users.stripe_account_id`, `escrow_state`.

### How each app connects
- **Guest app:** at booking, call backend → get a **client secret** → show Stripe/Razorpay
  **payment sheet** (`@stripe/stripe-react-native` or Razorpay SDK) → confirm → backend
  marks the booking paid via webhook.
- **Host app:** "Set up payouts" → opens the **Stripe/Razorpay onboarding link** → host
  adds bank + ID → status shows "Payouts enabled." Earnings/Payouts screens read real
  transfer state.
- **Ops portal:** the Finance modules (Escrow, Bookings hold, Refunds, Bank verification)
  already exist — they now act on **real** processor state via the backend.

---

## 2. KYC vendor (identity authenticity) — Onfido / Persona / HyperVerge

We already **dedupe** identities (one ID = one account) and have a **review queue**.
A vendor adds **authenticity** (is the document real? does the selfie match?).

### What to get
- **Persona** (great free dev tier) / **Onfido** / **HyperVerge** (India) account →
  `KYC_PROVIDER`, `KYC_API_KEY`, a **template/inquiry id**, webhook secret.

### How to connect (the seam exists)
- File: **`backend/src/kyc.js` → `verifyIdentity()`** — already the single hook. Implement
  the provider branch (worked Persona example is in the file).
- Flow: app uploads ID + selfie (already built) → backend creates a vendor **inquiry** →
  vendor runs document + biometric checks → **webhook** returns `verified | rejected |
  pending` → backend sets `identities.status` → Ops only reviews **edge cases**.
- Set `IDENTITY_SALT` (long random) so the dedup hash isn't guessable.

### Apps / Ops
- **App:** identity screen already captures ID front/back + **selfie** → just point the
  upload at the vendor's hosted SDK (or keep our upload + send to the vendor server-side).
- **Ops:** the KYC review card already shows the photos (view-only) — now most are
  auto-decided; reviewers handle only flagged ones.

---

## 3. Insurance & background checks (partners)

Mostly **business + legal**, not code. The portal stores **status**, not the policy.

- **Insurance** (host damage / guest liability): partner (e.g., a host-guarantee
  underwriter). Get an API or a manual process → store `coverage` status per stay; show a
  "Protected" badge. Trigger a claim from a **Safety case** / **Maintenance** record.
- **Background checks** (where legally required): vendor (Checkr-style) →
  `region_rules` decides *where* it's required → store pass/fail flag; **never** store the
  raw report. Legal-gated; surface only "cleared / not cleared."
- These are **read-only status** in Ops (Wing scope in `STAYON_OPS_SYSTEM_PLAN.md`).

---

## 4. Deployment (go live)

### Backend (Express + Supabase) → Render
- `render.yaml` is ready. Push the repo to GitHub → Render **New Web Service** → set env:
  `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET`, `GEMINI_API_KEY` (optional),
  `STRIPE_SECRET_KEY` / `RAZORPAY_*`, `KYC_PROVIDER` / `KYC_API_KEY`, `IDENTITY_SALT`,
  webhook secrets. Run **all migrations** (001 schema + 002–007) in Supabase once.
- Add the processor **webhook URLs** in Stripe/Razorpay → `https://api.stayon…/v1/webhooks/*`.

### Ops portal (Vite) → Vercel / Netlify / Render Static
- `cd operations && npm run build` → deploy the `dist/` folder. Set `VITE_API_BASE` to the
  live backend URL. Restrict access (staff-only; add SSO later).

### Apps (Expo) → EAS / web
- Set `EXPO_PUBLIC_API_BASE` to the live backend. `eas build` for iOS/Android; `expo export`
  for web. **Restrict the Google Maps key** to your domains before launch.

### Production hardening
- **RLS** policies in Supabase (defense in depth) · **real OTP/SMS** auth (Twilio/MSG91) ·
  **HTTPS only** · rotate `JWT_SECRET` · PCI: never touch raw card data (the SDKs handle it) ·
  rate-limit auth · backups.

---

## 5. End-to-end money lifecycle (the "hold + trigger" you asked about)

```
1. Guest books            → backend creates PaymentIntent (manual/delayed)
2. Guest pays             → processor COLLECTS + HOLDS funds (escrow)        [held]
3. Backend records        → bookings.status=confirmed, escrow_state=held
4. (optional) Ops HOLD    → payout_held=true (dispute/issue)                 [on-hold]
5. Trigger: 24h after     → scheduler: if !held → transfers.create →
   check-in                 funds move to host's connected account           [releasable→paid]
6. Processor payout       → host's bank receives money (its payout schedule) [paid]
   ── OR ──
   Refund before release  → refunds.create → guest refunded                  [refunded]
```

The **"certain time" trigger** = our existing `/v1/ops/payouts/run-scheduler` (run it on a
**cron**, e.g., Render Cron or Supabase scheduled function, every hour). It already:
skips `payout_held`, pays bookings past `check_in + grace`, logs to audit. Swap its
"mark paid" line for **`payments.transferToHost(code)`**.

---

## 6. What to get — checklist

- [ ] **Stripe** account + Connect enabled (or **Razorpay** + Route) → keys + webhook secret
- [ ] **KYC vendor** (Persona/Onfido/HyperVerge) → key + template + webhook
- [ ] **SMS** provider (Twilio / MSG91) for real OTP
- [ ] **Insurance** partner (host guarantee) — contract
- [ ] **Background-check** vendor (only where legally required)
- [ ] **GitHub** repo (done: `saiprakas/stayon-app`) → **Render** (backend) + **Vercel** (ops)
- [ ] Run **migrations 001–007** on the production Supabase
- [ ] Set all **env vars** + **webhook URLs**
- [ ] **Restrict** the Google Maps key; enable Supabase **RLS**

## 7. Build order (recommended)
1. **Payments adapter** (`payments.js`) + PaymentIntent on booking + webhook → real "paid"
2. **Host Connect onboarding** (replaces bank_accounts) → "payouts enabled"
3. **Wire the scheduler/hold/refund** to real transfers (the Ops Finance modules light up)
4. **KYC vendor** via `kyc.js`
5. **Deploy** (Render + Vercel + EAS) + cron the scheduler
6. Insurance/background-check status + RLS + OTP

---

*StayOn's backend already has the **shape** of all of this — escrow view, payout hold,
scheduler, refund, bank-verify, KYC seam. Production = swapping the simulated money/ID
steps for the processor + vendor APIs behind the same endpoints. The apps and Ops portal
don't change much; they already call these endpoints.*
