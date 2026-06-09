# StayOn Operations Portal — Design

> The web app the Ops team uses to govern host ⇄ user. It's a thin client on the
> backend `/v1/ops/*` endpoints (already built + tested). Internal tool, desktop-first.

---

## 1. Tech (recommended)
- **React + Vite** SPA (fast, simple), **TypeScript**, plain CSS or Tailwind.
- Lives at `d:/Stayon/ops/` — its own app, separate from the guest/host Expo app.
- Talks to the same backend (`VITE_API_BASE=http://localhost:4000/v1`, later the Render URL).
- Auth: `POST /v1/ops/auth/login {email}` → staff JWT (Bearer on every call).
- Deploy later as a Render static site (or Vercel/Netlify).

## 2. Layout (desktop dashboard)
```
┌───────────────────────────────────────────────────────────────┐
│  StayOn Ops            🔔   Ops Admin (super_admin) ▾   Log out  │  ← top bar
├───────────┬───────────────────────────────────────────────────┤
│ ▣ Dashboard│   < page title >                    [search / filter]│
│ ▣ Listings⁳│  ┌─────────────────────────────────────────────┐  │
│ ▣ KYC     ②│  │                                              │  │
│ ▣ Reels   ⑤│  │     queue table / detail panel               │  │
│ ▣ Payouts ①│  │                                              │  │
│ ▣ Reports ④│  │                                              │  │
│ ▣ Bookings │  └─────────────────────────────────────────────┘  │
│ ▣ Users    │                                                    │
│ ▣ Reviews  │                                                    │
│ ▣ Audit    │                                                    │
└───────────┴───────────────────────────────────────────────────┘
        ↑ sidebar shows live pending counts (badges) per queue
```
- **Left sidebar:** sections with **live pending-count badges** (from `/ops/dashboard`).
- **Top bar:** brand, notifications, the signed-in staff member + role, log out.
- **Content:** a queue **table** on top; clicking a row opens a **detail panel** (right drawer or below) with the full item + action buttons.
- **Design language:** clean, dense admin UI; StayOn **teal** accents; status pills reuse the app's colour system (pending=amber, approved/live=green, rejected/cancelled=red).

## 3. Screens (each → its endpoints + actions)
| Screen | Shows | Actions | Endpoints | Role |
|---|---|---|---|---|
| **Dashboard** | KPI cards (bookings, GMV, live listings) + queue counts | — | `GET /ops/dashboard` | any staff |
| **Listings review** | queue of `pending_review` listings (photos, host, city, price) | **Approve** / **Reject (reason)** | `GET /ops/queues/listings`, `POST /ops/listings/:id/approve|reject` | content_mod |
| **KYC** | pending identity submissions | **Approve / Reject** | `GET /ops/queues/kyc`, `POST /ops/kyc/:userId/approve|reject` | kyc_reviewer |
| **Reels** | pending reels/videos (preview) | **Approve / Reject** | `GET /ops/queues/reels`, `POST /ops/reels/:id/approve|reject` | content_mod |
| **Payouts** | pending payout-account change requests (+ proof) | **Approve / Reject** | `GET /ops/queues/payout-changes`, `POST /ops/payout-changes/:id/approve|reject` | finance |
| **Reports** | open reports/disputes (target, reason) | **Resolve / Dismiss** | `GET /ops/reports`, `POST /ops/reports/:id/resolve` | trust_safety |
| **Bookings** | all bookings (oversight, search by code) | view (force-cancel later) | `GET /ops/bookings`* | ops_manager |
| **Users** | guests + hosts, status, verification | **Suspend / Ban / Reinstate** | `GET /ops/users`, `POST /ops/users/:id/suspend|ban|reinstate` | trust_safety |
| **Reviews** | flagged reviews | **Remove** | `GET /ops/reviews?flagged`* | content_mod |
| **Audit** | every Ops action (who/what/when) | read-only | `GET /ops/audit` | compliance |

\* a couple of read endpoints (`/ops/bookings`, `/ops/reviews?flagged`) are tiny additions to the backend — I'll add them when building.

## 4. RBAC (what each role sees)
- **super_admin** → everything (+ staff management later).
- **content_mod** → Listings, Reels, Reviews.
- **kyc_reviewer** → KYC.
- **finance** → Payouts.
- **trust_safety** → Reports, Users.
- **compliance** → Audit (read-only).
- **analyst** → Dashboard (read-only).
Sidebar hides sections the role can't access; the backend already enforces this (403).

## 5. The core interaction (review → decide)
1. Badge shows "Listings ③" → click → table of 3 pending listings.
2. Click a row → detail panel: photos, full address, price, host, AI risk note.
3. Click **Approve** → row disappears, badge → ②, host gets notified, listing goes live in guest search. (Or **Reject** with a reason.)
Same pattern for KYC, Reels, Payouts, Reports.

## 6. Build plan
1. Scaffold `ops/` (Vite + React + TS) + API client (Bearer) + login screen.
2. App shell: sidebar + top bar + role-gated nav + live badges.
3. **Listings review** (the flagship) end-to-end.
4. KYC, Reels, Payouts, Reports (same table+detail pattern, reused component).
5. Users, Reviews, Bookings, Audit.
6. Polish (search, filters, empty states) → deploy as a static site.

## 7. MVP cut (fastest useful version)
Login → Dashboard → **Listings review (approve/reject)** + **Reports (resolve)** + **Users (suspend)**. That alone makes the "Ops in the middle" real. The rest reuse the same component.
