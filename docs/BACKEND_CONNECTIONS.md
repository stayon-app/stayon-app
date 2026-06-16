# StayOn — Backend Connection Map (Host ⇄ Backend ⇄ User, with Ops in the middle)

> Companion to `BACKEND_PLAN.md`. This document lists **every connection point**
> that must be established between the three clients (User app, Host app, Ops
> portal) and the central backend — endpoint by endpoint, event by event.
>
> **Legend**
> - **H** = Host app · **U** = User app · **O** = Ops portal · **BE** = Backend · **EXT** = external provider
> - `REST` = request/response call · `WS` = realtime channel · `WEBHOOK` = provider→BE callback · `JOB` = async worker · `PUSH` = notification

---

## 0. How each client connects (transport layer)
| Client | Connects via | Auth | Realtime |
|---|---|---|---|
| User app | HTTPS REST to `/v1`, WS for chat/notifications | Bearer JWT (access+refresh) | `ws://…/user/{userId}` |
| Host app | HTTPS REST to `/v1`, WS | Bearer JWT (same account, host mode) | `ws://…/user/{userId}` |
| Ops portal | HTTPS REST to `/v1/ops`, WS for live queues | Staff JWT + RBAC role claims | `ws://…/ops/{role}` |
| Providers | inbound WEBHOOKs to `/v1/webhooks/*` | signed secrets | — |

**Connection primitives to build first:** API gateway · JWT auth + refresh · WS server · webhook receiver · job queue · event bus (so one action fans out to many listeners).

---

## 1. Identity & Auth (the foundation every other connection needs)
| # | From → To | Connection | Effect |
|---|---|---|---|
|1.1| U/H → BE | `POST /auth/otp/request` `POST /auth/otp/verify` | issue JWT; create User if new |
|1.2| U/H → BE | `POST /auth/refresh`, `GET /me`, `PATCH /me` | session refresh; profile read/update |
|1.3| O → BE | `POST /ops/auth/login` | staff login; role claims (RBAC) |
|1.4| BE → EXT | SMS provider (OTP), email provider | send codes |
|1.5| any → BE | every request carries JWT → BE authorizes by role | gate access |

**KYC sub-flow (H/U → O):**
|1.6| H/U → BE | `POST /identity/submit` (doc + selfie via presigned upload) | Identity → `pending` |
|1.7| BE → EXT | KYC provider (Onfido/Persona) verify | provider runs checks |
|1.8| EXT → BE | `WEBHOOK /webhooks/kyc` | provider result attaches to Identity |
|1.9| BE → O | appears in **Ops KYC queue** (`GET /ops/queues/kyc`) | manual review |
|1.10| O → BE | `POST /ops/kyc/:id/approve|reject` | Identity → `verified`/`rejected` |
|1.11| BE → H/U | `PUSH` + status on `GET /me` | unlocks instant-book / payout changes |

---

## 2. Listings — create → review → publish → public (the key public-visibility flow)
| # | From → To | Connection | Effect |
|---|---|---|---|
|2.1| H → BE | `POST /listings` (draft autosave each wizard step) | Listing `draft` |
|2.2| H → BE | image/video upload via `POST /media/presign` → S3 PUT | media URLs stored |
|2.3| H → BE | `POST /listings/:id/submit` | Listing `draft → pending_review` |
|2.4| BE → O | **Ops listing queue** (`GET /ops/queues/listings`) + WS counter | review item appears |
|2.5| BE → JOB | optional AI pre-moderation (photos/text) | risk score attached |
|2.6| O → BE | `POST /ops/listings/:id/approve` | Listing `pending_review → published` |
|2.7| BE → JOB | index in search (geo + filters) | now discoverable |
|2.8| BE → H | `PUSH` "Listing approved" | host sees it live |
|2.9| O → BE | `POST /ops/listings/:id/reject` (reason) | `rejected`; host notified to edit |
|2.10| U → BE | `GET /search`, `GET /listings/:id` | **only `published` returned** → public visibility |
|2.11| H → BE | `PUT /listings/:id` (edit) | material edits → re-enter `pending_review` |
|2.12| H → BE | `PUT /listings/:id/status` (snooze/unlist) | toggle visibility |

➡️ **This is the "host adds a listing, a different user sees it" chain**: 2.1 → 2.3 → 2.6 → 2.7 → 2.10.

---

## 3. Search & discovery (U → BE)
| # | From → To | Connection | Effect |
|---|---|---|---|
|3.1| U → BE | `GET /search?city&lat&lng&radius&dates&guests&price&vibes&amenities&instant` | query search index |
|3.2| U → BE | `GET /destinations`, `GET /listings/:id/similar` | discovery rails |
|3.3| BE | availability filter joins PricingCalendar + Bookings | hides booked dates |
|3.4| U → BE | `GET /reels`, `GET /blogs`, `GET /things-to-do` | content feeds |
|3.5| U → BE | `POST /events` (views, taps) | feeds ranking/recs |

---

## 4. Availability & pricing (H sets ⇄ U sees)
| # | From → To | Connection | Effect |
|---|---|---|---|
|4.1| H → BE | `PUT /listings/:id/calendar` (per-date + range price, block) | PricingCalendar updated |
|4.2| H → BE | `PUT /listings/:id/pricing` (base, weekend, cleaning, discounts) | pricing rules |
|4.3| BE → JOB | reindex availability/price | search reflects it |
|4.4| U → BE | `GET /listings/:id/quote?dates&guests` | live price incl. taxes, **0% fee** |

---

## 5. Booking lifecycle (the U ⇄ H core loop, Ops oversight)
| # | From → To | Connection | Effect |
|---|---|---|---|
|5.1| U → BE | `POST /bookings` (listingId, dates, guests) | Booking `pending`; hold dates |
|5.2| BE → EXT | payment authorize (escrow hold) | funds held |
|5.3a| Instant book | BE auto-confirms | Booking `confirmed` |
|5.3b| Request | BE → H `PUSH` "New request" + Reservation in host app | host decides |
|5.4| H → BE | `POST /reservations/:id/accept` / `decline` | `confirmed` / `cancelled` (+refund) |
|5.5| BE → U | `PUSH` + `GET /bookings` reflects status | guest sees confirmed/declined |
|5.6| BE → EXT | on confirm: capture or schedule capture | payment captured |
|5.7| H → BE | `POST /reservations/:id/checkin` / `checkout` | `completed` at checkout |
|5.8| BE → U | trip → `completed`; unlock review | moves to Past trips |
|5.9| U → BE | `POST /bookings/:id/cancel` | `cancelled`; refund (taxes withheld) |
|5.10| BE → H | reservation → `cancelled` (the two-way sync, now server-side) | host calendar frees up |
|5.11| O → BE | `GET /ops/bookings`, `POST /ops/bookings/:id/force-cancel` | dispute/oversight |

➡️ **Confirmation code** ties Booking↔Reservation↔Payment↔Payout across all surfaces.

---

## 6. Payments & escrow (U pays ⇄ BE holds ⇄ H paid; Ops refunds)
| # | From → To | Connection | Effect |
|---|---|---|---|
|6.1| U → BE | `GET /payment-methods`, `POST /payment-methods` (provider token) | saved cards (no raw PAN) |
|6.2| U → BE | booking pay → BE → EXT authorize | escrow hold |
|6.3| EXT → BE | `WEBHOOK /webhooks/payments` (auth/capture/fail) | update Payment state |
|6.4| BE → JOB | on check-in+24h, release payout (rate+cleaning, **0% fee**) | Payout `scheduled→paid` |
|6.5| O → BE | `POST /ops/refunds` (dispute resolution) | refund via EXT; taxes withheld |
|6.6| EXT → BE | `WEBHOOK` chargeback/dispute | opens Ops dispute item |

---

## 7. Payouts & payout-account changes (H ⇄ Ops-gated)
| # | From → To | Connection | Effect |
|---|---|---|---|
|7.1| H → BE | `GET /payouts`, `GET /earnings` (day/month, trends) | financial dashboards |
|7.2| H → BE | `POST /payout-method/change-request` (+ ID proof) | PayoutChangeRequest `pending` |
|7.3| BE → O | **Ops payout-change queue** | identity-vs-account verification |
|7.4| O → BE | `POST /ops/payout-changes/:id/approve|reject` | live method updates / rejected |
|7.5| BE → H | `PUSH` "Payout details updated" | host confirmation |
|7.6| BE → EXT | KYB on host payout account | provider compliance |

---

## 8. Messaging (U ⇄ H realtime, contact-guard server-side)
| # | From → To | Connection | Effect |
|---|---|---|---|
|8.1| U/H → BE | `POST /threads` (get-or-create by listing+guest) | shared Thread |
|8.2| U/H → BE | `GET /threads`, `GET /threads/:id/messages` | inbox + history |
|8.3| U/H → BE | `POST /threads/:id/messages` → **contact-guard** runs | block phone/email/address pre-booking |
|8.4| BE → U/H | `WS` push to the other party + unread badge | realtime delivery |
|8.5| H → BE | `GET/POST /saved-messages`, `/scheduled-messages` | canned/scheduled replies |
|8.6| O → BE | `GET /ops/threads` (on dispute only, audited) | support intervention |

---

## 9. Reviews (U writes ⇄ H sees/responds; Ops moderates)
| # | From → To | Connection | Effect |
|---|---|---|---|
|9.1| U → BE | `POST /reviews` (after `completed` booking) | Review `published` |
|9.2| BE → H | review appears in host Reviews + rating recompute | host sees it (the bridge, server-side) |
|9.3| H → BE | `POST /reviews/:id/respond` | public host response |
|9.4| H → BE | `POST /guest-reviews` (host→guest review) | guest reputation |
|9.5| U/H → BE | `POST /reports` (targetType=review) | flag → Ops |
|9.6| O → BE | `POST /ops/reviews/:id/remove` | Review `removed` |

---

## 10. Reels / stories / blogs (H/U create → Ops moderate → public)
| # | From → To | Connection | Effect |
|---|---|---|---|
|10.1| H/U → BE | `POST /media/presign` → upload video → `POST /reels` | Reel `pending` |
|10.2| BE → JOB | transcode + AI content moderation | thumbnails + risk score |
|10.3| BE → O | **Ops reels queue** | manual review |
|10.4| O → BE | `POST /ops/reels/:id/approve|reject` | `live` / `rejected` |
|10.5| U → BE | `GET /reels` (dynamic feed) | live reels only; "View this stay" → listing |

---

## 11. Reports & disputes (U/H file → Ops resolve)
| # | From → To | Connection | Effect |
|---|---|---|---|
|11.1| U/H → BE | `POST /reports` (listing/user/booking/review/message + reason) | Report `open` |
|11.2| BE → O | **Ops reports queue** + WS | triage |
|11.3| O → BE | `POST /ops/reports/:id/assign|resolve|dismiss` | status transitions |
|11.4| O → BE | linked actions: refund (6.5), remove (9.6), suspend user (12.x) | enforcement |

---

## 12. Users & trust actions (Ops → affects H/U)
| # | From → To | Connection | Effect |
|---|---|---|---|
|12.1| O → BE | `GET /ops/users`, `GET /ops/users/:id` | profile, history, verification |
|12.2| O → BE | `POST /ops/users/:id/suspend|ban|reinstate` | account state |
|12.3| BE → U/H | enforced on next request / `PUSH` | access blocked / notified |
|12.4| O → BE | `POST /ops/users/:id/impersonate` (audited) | support troubleshooting |

---

## 13. Offers (Ops-managed; the only two: 15% first, 10% referral)
| # | From → To | Connection | Effect |
|---|---|---|---|
|13.1| U → BE | `GET /offers/eligible` | shows 15% first / 10% referral if eligible |
|13.2| BE | applied at `quote`/`booking` if eligible | discount in price |
|13.3| O → BE | `GET /ops/offers`, redemption audit | track, no fake sales |

---

## 14. Wishlists, wallet, receipts (U ⇄ BE)
| # | From → To | Connection | Effect |
|---|---|---|---|
|14.1| U → BE | `GET/POST/DELETE /wishlists` | saved places sync across devices |
|14.2| U → BE | `GET /receipts`, `GET /bookings/:id/receipt` | formatted receipts |
|14.3| U → BE | `GET /wallet` (passes/credit) | stored value |

---

## 15. Safety, maintenance, damages (H ⇄ Ops)
| # | From → To | Connection | Effect |
|---|---|---|---|
|15.1| H → BE | `GET/PUT /listings/:id/safety` (devices, disclosures) | shown to guests |
|15.2| H → BE | `POST /maintenance`, `POST /damage-reports` (at checkout) | issue tracking |
|15.3| BE → O | safety incidents / damage claims → Ops | mediation, claims |

---

## 16. Notifications fan-out (BE → all)
Single **event bus**; each event triggers `PUSH`/email/SMS + WS:
- booking.created/confirmed/declined/cancelled/completed → U & H
- listing.approved/rejected, reel.approved/rejected, kyc.verified/rejected → author
- payout.released, payout-change.approved → H
- message.created → recipient
- review.posted → H; review.requested → U
- report.filed → O; dispute.opened → O & involved parties

---

## 17. Ops dashboard, analytics & audit (cross-cutting)
| # | From → To | Connection | Effect |
|---|---|---|---|
|17.1| O → BE | `GET /ops/dashboard` (KPIs, queue counts) + WS live counters | overview |
|17.2| all → BE | `POST /events` (telemetry) → warehouse | analytics |
|17.3| O → BE | `GET /ops/reports/*` (finance, occupancy, trust) | reporting |
|17.4| BE | **every Ops mutation → AuditLog** (actor, action, target, ts) | compliance |

---

## 18. Build order for the connections
1. **Transport + Auth** (§0, §1) — nothing works without it.
2. **Listings + Media + Search** (§2, §3, §9 media) — host can publish, user can find (via Ops approve).
3. **Ops queues + RBAC + Audit** (§2.4–2.9, §10, §7.3, §11, §17.4) — the "in-between" goes live.
4. **Bookings + Pricing** (§4, §5).
5. **Payments + Payouts** (§6, §7).
6. **Messaging + Reviews + Notifications** (§8, §9, §16).
7. **Reports/Trust + Offers + Wallet + Safety** (§11–§15).
8. **Analytics + hardening** (§17, security).

*Each numbered row above is a concrete endpoint/event to implement — together they are the complete set of connections between Host, User, and Ops.*
