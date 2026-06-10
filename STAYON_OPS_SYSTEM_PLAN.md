# StayOn Operations System — Plan & Design

> The blueprint for StayOn's third surface: the **Ops portal** — the trust, safety,
> finance, and quality control center that sits between guests and hosts. This maps
> the **10 operational wings** to concrete software modules, says honestly what the
> software does vs. what is a human/external process, and gives a phased build plan.
> Date: 2026-06-10.

---

## 0. Guiding philosophy — software vs. operations

An "operations system" is **not** one app — it's three layers. Be clear which layer each
capability lives in, or you'll try to "code" things that are actually people or vendors:

| Layer | What it is | StayOn build? |
|---|---|---|
| **A. Ops Portal (software)** | Dashboards, review queues, decide/act, audit. The thing we build. | ✅ Yes — this doc |
| **B. Integrations (vendors)** | Payments, KYC, maps, SMS, insurance — external APIs we call. | 🔌 Seam + integrate later |
| **C. Human/Field ops** | 24/7 agents, on-ground inspectors, legal, emergency response. | 🧍 Process + tools to support them |

The Ops **portal** (Layer A) is what we design here; it *orchestrates* B and *empowers* C.

---

## 1. What already exists (don't rebuild)

The backend Ops layer is **already built and tested** (54/54). The portal is a UI on top of it.

- **9 RBAC roles:** `super_admin · ops_manager · trust_safety · kyc_reviewer · content_mod · finance · support · compliance · analyst`
- **21 Ops endpoints:** dashboard · audit · queues (kyc / listings / reels / payout-changes) · reports · reviews · users · bookings · + actions: approve/reject listing, kyc decision, reels decision, payout-change decision, force-cancel booking, **refunds**, resolve report, remove review, **suspend/ban user**.
- **Tables:** `staff · identities · reports · reels · payout_change_requests · audit_log` (+ all guest/host tables it moderates).
- **Identity anti-fraud:** one-person-one-identity hash (live) + KYC provider seam (`kyc.js`).
- **Every action is audited** (`audit_log`).

So ~70% of the *backend* for wings 1–4, 6, 8 already exists. The work is the **portal UI** + a few new endpoints.

---

## 2. The 10 wings → Ops modules (the master map)

For each wing: the **portal module** to build, what it does **in software**, what stays
**human/vendor**, the **backend** it uses, and the **owning role**.

### Wing 1 — Verification & Onboarding
| Capability | In software (portal) | Human / Vendor | Backend | Role |
|---|---|---|---|---|
| Host KYC / ID checks | **KYC review queue** → approve/reject, see ID-last4, dedup flags | Real document authenticity = **KYC vendor** (Onfido/Persona) via `kyc.js` seam | `/ops/queues/kyc`, `/ops/kyc/:user/:decision`, `identities` | `kyc_reviewer` |
| Guest ID / fraud at booking | **Risk flags** on the user (dup-identity, velocity) | Payment-fraud scoring = **payments vendor** | `identities`, new `risk_flags` | `trust_safety` |
| Property ownership | **Ownership doc upload + manual review** in the listing queue | Title/deed verification = manual + (later) registry API | `/ops/queues/listings` | `ops_manager` |
| Background checks | Show "required in this region" flag | **External vendor**, legal-gated | new `region_rules` | `compliance` |
| Property onboarding (photos/amenities/compliance) | **Listing review queue** → approve/reject + checklist (photos ≥ N, address, safety items) | — | `/ops/queues/listings`, `/ops/listings/:id/approve` | `content_mod` |

### Wing 2 — Payments & Finance
| Capability | In software | Human / Vendor | Backend | Role |
|---|---|---|---|---|
| Payment processing | **Show transactions**, status | **Stripe / Razorpay** (Layer B — to integrate) | new `payments` | `finance` |
| Holding funds until check-in | **Escrow status** view (held → released) | Vendor escrow / payout schedule | `bookings`, new `payouts` ledger | `finance` |
| Refunds & cancellations | **Refund console** (full/partial), force-cancel | Vendor refund call | `/ops/refunds`, `/ops/bookings/:code/force-cancel` | `finance` |
| Disputes | **Dispute case console** (open → evidence → decide) | Chargeback handling w/ vendor | new `disputes` | `support`+`finance` |
| Payout changes (bank edits) | **Payout-change approval queue** (anti-fraud) | — | `/ops/queues/payout-changes` | `finance` |
| Currency / tax | **Tax report export** per region; prices already USD→local | Filing = accountant/vendor | `bookings`, new `tax_summary` | `compliance` |

### Wing 3 — Trust & Safety
| Capability | In software | Human / Vendor | Backend | Role |
|---|---|---|---|---|
| Fraud detection/prevention | **Risk dashboard** + auto-flags (dup ID, impossible-travel, price anomalies) | ML model tuning | `identities`, new `risk_flags` | `trust_safety` |
| Fake/scam listing monitoring | **Reports queue** + takedown | — | `/ops/reports`, `/ops/listings/:id/reject` | `trust_safety` |
| Suspend / ban | **User actions** (suspend/ban/reinstate) | — | `/ops/users/:id/:action` | `trust_safety` |
| Insurance / coverage | Show coverage status on a stay | **Insurance partner** (Layer B) | new `coverage` | `ops_manager` |
| Emergency response | **Safety alert console** (a guest/host SOS → case) | **Human 24/7 + local services** | new `safety_cases` | `trust_safety` |
| Safety standards | **Safety checklist** enforced in listing review | Field inspection (Wing 9) | `listings.extra.safety` | `content_mod` |

### Wing 4 — Customer Support
| Capability | In software | Human / Vendor | Backend | Role |
|---|---|---|---|---|
| 24/7 support | **Ticket/case console** (assign, status, SLA timer) | **Human agents** | new `tickets` | `support` |
| Dispute resolution | **Resolution center** (both parties + evidence) | Agent decision | new `disputes` | `support` |
| Booking assistance | **Look-up any booking/user**, act on their behalf | Agent | `/ops/bookings`, `/ops/users` | `support` |
| Multilingual | UI i18n + canned replies per language | Bilingual agents / MT | static | `support` |

### Wing 5 — Compliance & Legal
| Capability | In software | Human / Vendor | Backend | Role |
|---|---|---|---|---|
| STR regulation per market | **Region rules registry** (max-nights, permits) → warn/block listing | Legal research | new `region_rules` | `compliance` |
| Tax compliance (GST/VAT) | **Tax summaries + exports** | Filing | `bookings` | `compliance` |
| Privacy (GDPR/CCPA) | **Data-subject console**: export user data / delete account | DPO process | new `/ops/users/:id/export`, `…/erase` | `compliance` |
| Contracts / liability | Store ToS version a user accepted | Legal | new `consents` | `compliance` |

### Wing 6 — Quality Assurance
| Capability | In software | Backend | Role |
|---|---|---|---|
| Host performance monitoring | **Host scorecard** (rating, response, cancels, complaints) | `reviews`, `reservations`, derived | `analyst` |
| Guest feedback analysis | **Review insights** (themes, low-rating alerts) | `reviews` + AI summarize | `analyst` |
| Remove low-quality/unsafe listings | **Takedown** from QA flags | `/ops/listings/:id/reject` | `content_mod` |
| Continuous improvement | **Trends dashboard** (NPS, repeat rate) | `/ops/dashboard` extended | `analyst` |

### Wing 7 — Community & Engagement
| Capability | In software | Note | Role |
|---|---|---|---|
| Host training / education | **Resources CMS** (already a host Resources screen) | content mgmt | `ops_manager` |
| Guest loyalty | **StayCoins** program admin (exists, parked) | already scaffolded | `ops_manager` |
| Rewards / Superhost | **Superhost rules engine** (auto-award from QA metrics) | derived from Wing 6 | `analyst` |
| Community events/partnerships | **Announcements / campaigns** | broadcast notifications | `ops_manager` |

### Wing 8 — Technology & Data Operations
| Capability | In software | Backend | Role |
|---|---|---|---|
| Fraud algorithms | **Rule engine** behind risk flags | `risk_flags` | `trust_safety` |
| Automated verification | KYC vendor auto-decision → only edge cases reach humans | `kyc.js` | `kyc_reviewer` |
| Analytics / performance | **Ops dashboard** (GMV, bookings, conversion, queue health) | `/ops/dashboard` | `analyst` |
| AI recommendations / personalization | StayBot + search ranking (guest app) | existing | `analyst` |

### Wing 9 — Logistics & Field Operations *(mostly human; portal = coordination)*
| Capability | In software | Human/Field |
|---|---|---|
| Property inspections | **Field-task console** (assign inspection, checklist, photos, result) | **Inspector on-ground** |
| On-ground city teams | **Task assignment + map of open tasks** | City ops staff |
| On-site emergencies | Hooks into Safety cases (Wing 3) | **Local responders** |
→ Build a light **`field_tasks`** module; the actual work is people.

### Wing 10 — Expansion & Partnerships *(mostly business; portal = config + directory)*
| Capability | In software | Human/Business |
|---|---|---|
| Cleaning / property-manager partners | **Partner directory** + assign to a stay | BD contracts |
| Tourism-board tie-ups | Market config flags | Partnerships team |
| New-market launch | **Market admin** (enable region, currency, rules, taxes) | GTM team |
→ Build a **`markets`** + **`partners`** admin; the deals are human.

---

## 3. Portal architecture (what we build)

A **desktop web dashboard** (the audit recommends React + Vite web, separate from the
Expo app; it shares the same backend `/v1/ops/*`). Layout:

```
┌──────────────────────────────────────────────────────────────┐
│  StayOn Ops      ⌘K search     🔔   role: trust_safety  ▾     │
├──────────┬───────────────────────────────────────────────────┤
│ Sidebar  │  Main work area (queue list  ·  detail/decide)     │
│          │                                                     │
│ Dashboard│  ┌───────────── Queue ─────────────┐ ┌── Detail ──┐│
│ Queues ▾ │  │ • KYC (4)                        │ │ Review card ││
│  KYC     │  │ • Listings (12)                  │ │ evidence    ││
│  Listings│  │ • Reels (3)                      │ │ [Approve]   ││
│  Reels   │  │ • Payout changes (2)             │ │ [Reject]    ││
│ Reports  │  └─────────────────────────────────┘ └────────────┘│
│ Bookings │                                                     │
│ Users    │  Every decision → writes audit_log + notifies user │
│ Finance  │                                                     │
│ Safety   │                                                     │
│ Support  │                                                     │
│ Markets  │                                                     │
│ Audit    │                                                     │
└──────────┴───────────────────────────────────────────────────┘
```

**The core interaction (used everywhere): Queue → Review → Decide.**
A reviewer sees a queue, opens an item (all evidence on one card), clicks Approve/Reject/
Refund/Suspend, which calls the action endpoint, writes the audit log, notifies the user,
and advances to the next item. Fast, consistent, auditable.

### Modules (screens) to build
1. **Dashboard** — GMV, bookings, queue health, alerts (`/ops/dashboard`)
2. **KYC** review (`/ops/queues/kyc`)
3. **Listings** review + onboarding checklist (`/ops/queues/listings`)
4. **Reels/content** moderation (`/ops/queues/reels`)
5. **Reports** (fake listings, abuse) (`/ops/reports`)
6. **Bookings** lookup + force-cancel (`/ops/bookings`)
7. **Users** (suspend/ban/reinstate, risk flags) (`/ops/users`)
8. **Finance** — refunds, payout-change approvals, tax export
9. **Safety** — emergency/safety cases *(new)*
10. **Support** — tickets + dispute resolution *(new)*
11. **Markets/Partners** — region rules, partner directory *(new)*
12. **Audit log** — full history (`/ops/audit`)

---

## 4. Roles → modules (permissions matrix)

| Module | super_admin | ops_manager | trust_safety | kyc_reviewer | content_mod | finance | support | compliance | analyst |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| Dashboard | ✅ | ✅ | ✅ | • | • | ✅ | ✅ | ✅ | ✅ |
| KYC | ✅ | ✅ | ✅ | ✅ | | | | view | |
| Listings | ✅ | ✅ | ✅ | | ✅ | | | view | |
| Reels | ✅ | ✅ | | | ✅ | | | | |
| Reports | ✅ | ✅ | ✅ | | ✅ | | ✅ | | |
| Bookings | ✅ | ✅ | ✅ | | | view | ✅ | view | view |
| Users | ✅ | ✅ | ✅ | | | | view | view | |
| Finance | ✅ | view | | | | ✅ | | view | |
| Safety | ✅ | ✅ | ✅ | | | | ✅ | | |
| Support | ✅ | ✅ | | | | | ✅ | | |
| Markets/Partners | ✅ | ✅ | | | | | | ✅ | |
| Audit | ✅ | ✅ | view | | | view | | ✅ | view |

(• = limited/own-queue only. The backend `authStaff(role)` already enforces this.)

---

## 5. What we deliberately do NOT build as software (honest scope)

- **Real payment money movement** → that's **Stripe/Razorpay** (Layer B); we build the
  *console* around it, not a payment processor.
- **Real ID authenticity** → KYC **vendor**; we build the *review queue*.
- **Insurance, background checks** → **partners/legal**; we store status + flags only.
- **24/7 staffing, on-ground inspections, emergency response** → **humans**; we build the
  *task/case tools* that direct them.
- **Legal filings, tax filing, contracts** → **professionals**; we build *reports/exports*.

Trying to "code" these would be wrong. The portal's job is **orchestrate, review, decide, audit.**

---

## 6. Build roadmap (phased)

### Phase 0 — Portal shell (1 sprint)
Web app + ops login (`/ops/auth/login`) + RBAC routing + sidebar + the reusable
**Queue→Review→Decide** component + Audit log viewer.

### Phase 1 — MVP (the trust core; backend already done)
Dashboard · **KYC** · **Listings** review · **Reports** · **Users** (suspend/ban) ·
**Bookings** (force-cancel) · **Finance** (refunds + payout-change approvals).
→ This makes StayOn safely operable today; no new backend needed.

### Phase 2 — Quality & Support
**Reels** moderation · **Support tickets + Disputes** (new tables) · **Host scorecards /
QA** · **Review insights** (AI summarize).

### Phase 3 — Compliance & Growth
**Region rules + tax exports** · **GDPR data export/erase** · **Markets/Partners admin** ·
**Safety/emergency cases** · **Field-task console**.

### Phase 4 — Integrations (Layer B)
Payments (Stripe/Razorpay) · KYC vendor · Insurance partner · SMS/OTP · push.

---

## 7. New backend pieces needed (small, additive)

Tables: `risk_flags · disputes · tickets · region_rules · markets · partners · field_tasks
· payments · consents`. Endpoints follow the existing `/v1/ops/*` + `authStaff` pattern.
GDPR: `/ops/users/:id/export`, `/ops/users/:id/erase`. Everything writes `audit_log`.

---

## 8. Summary — coverage of your 10 wings

| Wing | Portal module | Status |
|---|---|---|
| 1 Verification & Onboarding | KYC + Listings review | **Backend ready → build UI** |
| 2 Payments & Finance | Finance console | Partial (refunds/payout ready; processor = vendor) |
| 3 Trust & Safety | Reports + Users + Safety | **Mostly ready → build UI** (+safety cases) |
| 4 Customer Support | Tickets + Disputes | New module |
| 5 Compliance & Legal | Region rules + GDPR | New module |
| 6 Quality Assurance | Scorecards + Review insights | New (data exists) |
| 7 Community & Engagement | Resources + Loyalty + Superhost | Partial (StayCoins/Resources exist) |
| 8 Technology & Data | Dashboard + Risk engine | Partial (dashboard ready) |
| 9 Logistics & Field | Field-task console | New (light; work is human) |
| 10 Expansion & Partnerships | Markets + Partners admin | New (config; deals are human) |

**Recommendation:** build **Phase 0 + Phase 1** first — it uses the backend we already have
and makes StayOn safely operable end-to-end. Everything else layers on cleanly.
