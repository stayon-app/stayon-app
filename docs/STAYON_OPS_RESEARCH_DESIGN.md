# StayOn Ops — Research-Grounded Design (v2)

> Refines the Ops plan using how **real marketplace operations teams** (Airbnb-style)
> actually run trust & safety, identity, payouts, and fraud — mapped to **every
> requirement you listed**. Companion to `STAYON_OPS_SYSTEM_PLAN.md`. Date: 2026-06-10.

---

## A. What the research says (the principles we design around)

1. **Everyone gets verified, but *progressively* — guests light, hosts heavy.**
   Real platforms verify *every* booking guest and *every* host, but the depth differs:
   - **Guest (buyer):** lighter KYC — legal name, phone, email, **government ID**, age,
     payment validity. Goal = stop fake accounts & stolen-card bookings.
   - **Host (seller):** heavy KYC/KYB — ID **+ property ownership + bank/payout
     verification**. Goal = stop fake listings & payout fraud.
   *(Sumsub/iDenfy/Lemonway, Airbnb help.)*

2. **New-account fraud is the #1 risk.** Fraudsters use stolen or **synthetic
   identities** to open new accounts. So new users need a **stricter first-time check**;
   existing/returning users get **ongoing monitoring** (risk re-scoring), not re-KYC.

3. **Automate, escalate only edge cases.** A vendor auto-decides most IDs (biometric +
   government-source match); **humans review only flags** (manual-review queue). Closely
   governed by privacy/compliance.

4. **Money is held in escrow, released on a schedule.** Platforms do **not** pay the host
   instantly. Funds are **held until check-in**, then a **scheduled payout** (daily/weekly)
   goes to a **verified bank account**. Each money direction (guest-in, host-out) is its
   own fraud surface → bank-change verification + transfer monitoring.

5. **KYC and fraud must not be siloed.** The gap between them is where bad actors thrive →
   one **risk view** per user that combines identity + behavior + money signals.

---

## B. Your requirements → the refined module map

Each line: your ask → the Ops module → what it does → status (✅ built · �driving on existing backend · ➕ to add).

### Guest (user) side
| You asked | Module | What it does | Status |
|---|---|---|---|
| Verify guest identities — **new vs existing** + personal details | **Guest Verification (progressive KYC)** | New user → full ID + name/phone/email/age check; existing/returning → risk re-score only, no re-KYC. Manual-review queue for flags. | �/➕ (queue ✅; new-vs-existing logic ➕) |
| KYC review | **KYC** | Verify/reject ID; one-ID-one-account dedup already live | ✅ |
| User booking requests | **Bookings** | See every booking, status (pending/confirmed), force-cancel | ✅ |
| Reports about users | **Reports** | Handle abuse/fraud reports for/against a guest → resolve | ✅ |
| Support tickets from user requests | **Support tickets** | Guest help requests → assign · in-progress · resolve (SLA) | ✅ (needs migration-004) |
| Finance & refunds | **Finance → Refunds** | Full/partial refund to a guest | ✅ |
| User safety | **Safety center** | Guest SOS/incident → escalate/resolve | ✅ (needs migration-004) |

### Host side
| You asked | Module | What it does | Status |
|---|---|---|---|
| Host listing | **Listings** | Approve/reject host stays (onboarding review) | ✅ |
| Host maintenance | **Maintenance** | Track property maintenance/damage issues per listing | ➕ |
| Reviews & updates to host | **Host scorecards + Review insights** | Performance, rating, review themes, push updates to host | ✅ |
| Solve host issues / resolve | **Host issues (tickets+disputes for hosts)** | Host-raised tickets + disputes → resolve | ✅ (support/disputes; needs migration-004) |
| **Host finance / payouts — money on time** | **Payout Operations** | **Escrow** (hold until check-in) → **scheduled payout** (on-time) → **verified bank**; payout-change approval (anti-fraud) | ➕ (payout-change ✅; escrow+schedule ➕) |
| Ground inspection | **Field tasks** | Assign on-ground property inspection + checklist + result | ✅ (needs migration-004) |
| Host safety | **Safety center** | Host incident → escalate/resolve | ✅ |

### Platform / cross-cutting
| You asked | Module | What it does | Status |
|---|---|---|---|
| **Ops can update development** | **Dev / Release Ops** | Feature flags (toggle features live), incident log, changelog, "what's shipping" board — links ops to the dev process | ➕ (new) |
| Finance + host + user management together | **Dashboard + per-user 360 view** | One screen per user: identity + bookings + payouts + risk | ➕ (360 view) |
| **No fraud in money / bank transfers** | **Fraud & Risk center** | Risk flags: dup identity, impossible-travel, **bank-account change**, payout velocity, chargeback patterns → block/hold | ➕ (new) |
| Booking safety | **Safety center** | Booking-level safety holds (e.g., flagged guest+host) | ✅ |

---

## C. New modules to ADD (from your brief)

1. **Guest Verification (progressive)** — split the KYC queue into *new-user* (full check)
   vs *existing-user* (risk re-score). Store `risk_flags` per user.
2. **Payout Operations** — escrow ledger (held → releasable → paid), payout **schedule**
   (release N days after check-in), **bank-account verification** before first payout,
   payout-change approval (already built). "Pay host on time" = the scheduler.
3. **Fraud & Risk center** — one rules engine raising flags on identity dup, **bank
   changes**, transfer velocity, mismatched geo; ops can **hold money / block transfer**.
4. **Maintenance** (host) — property issue/damage tracker per listing.
5. **Dev / Release Ops** — feature flags + incident log + changelog so the ops team can
   push and track product updates (your "update development" ask).
6. **Per-user 360 view** — click any guest/host → identity, bookings, payouts, reviews,
   risk on one page (the "user + host + finance management together" ask).

New tables: `risk_flags · escrow_ledger · bank_accounts · maintenance · feature_flags ·
incidents`. Endpoints follow the existing `/v1/ops/*` + `authStaff` + audit pattern.

---

## D. How a real ops team is staffed (maps to our 9 roles)

- **Trust & Safety** → identity, reports, safety, risk (our `trust_safety`).
- **KYC reviewers** → manual ID review only (`kyc_reviewer`).
- **Finance** → escrow, payouts, refunds, bank-change approvals (`finance`).
- **Support** → guest/host tickets, disputes (`support`).
- **Compliance** → privacy/GDPR, region rules, data oversight (`compliance`).
- **Content mod** → listings & reels (`content_mod`).
- **Analyst** → scorecards, fraud trends (`analyst`).
- **Ops manager / super admin** → everything + dev/release ops.

---

## E. Build status & next step

- **Live now:** KYC, Listings, Reports, Users, Bookings, Refunds, Guests, Hosts,
  Scorecards, Insights, GDPR, Audit, Dashboard (boxes), light/dark theme.
- **One step:** run **`migration-004`** → activates Support, Disputes, Safety, Markets,
  Partners, Field tasks, Region rules.
- **To build (this v2):** Guest progressive-verification split · Payout Operations
  (escrow+schedule+bank) · Fraud & Risk center · Maintenance · Dev/Release Ops · 360 view.

**Recommended order:** (1) migration-004, (2) **Fraud & Risk + Payout Ops** (the money-
safety core you stressed), (3) Guest progressive verification, (4) Maintenance + Field,
(5) Dev/Release Ops + 360 view.

---

## Sources
- [Airbnb identity verification (Help Center)](https://www.airbnb.com/help/article/1237) ·
  [Hospitable: Airbnb ID verification](https://hospitable.com/airbnb-identity-verification) ·
  [Authme: Airbnb verification vs fraud](https://authme.com/blog/how-airbnbs-new-verification-policy-battles-housing-fraud/)
- [Sumsub: KYC for marketplaces](https://sumsub.com/marketplaces/) ·
  [iDenfy: KYC for gig & marketplaces](https://idenfy.com/blog/kyc-for-gig-and-online-marketplaces/) ·
  [Lemonway: identity verification on marketplaces](https://www.lemonway.com/en/blog/identity-verification-marketplace)
- [SEON: marketplace payment fraud](https://seon.io/resources/marketplace-payment-fraud/) ·
  [Sharetribe: marketplace payments & escrow](https://www.sharetribe.com/academy/marketplace-payments/) ·
  [Rapyd: secure marketplace payments](https://www.rapyd.net/blog/secure-payments-marketplace/)
