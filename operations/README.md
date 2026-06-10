# StayOn — Operations Portal

The **third surface** of StayOn: the trust, safety, finance, and quality control center
for the Ops team. It is a **desktop web dashboard** that talks to the **same backend**
(`d:/Stayon/backend`) as the guest + host apps, via the `/v1/ops/*` endpoints.

> 📐 Full design & scope: **[../STAYON_OPS_SYSTEM_PLAN.md](../STAYON_OPS_SYSTEM_PLAN.md)**
> (the 10 operational wings → modules, RBAC, roadmap, what's software vs. human/vendor).

---

## Stack

- **React + Vite + TypeScript** (web SPA) — desktop-first dashboard.
- Auth: `POST /v1/ops/auth/login` → JWT (staff). RBAC enforced by the backend
  (`authStaff(role)`) and mirrored in the UI per role.
- Shares the backend's Supabase data; the portal never touches the DB directly.

## How it connects

```
Ops Portal (this app)  ──HTTPS + staff JWT──►  Backend /v1/ops/*  ──►  Supabase
```

Every decision (approve/reject/refund/suspend) calls an action endpoint, which writes
`audit_log` and notifies the affected user.

## Modules (build order — see the plan)

**Phase 1 (MVP, backend already done):**
Dashboard · KYC review · Listings review · Reports · Users (suspend/ban) ·
Bookings (force-cancel) · Finance (refunds + payout-change approvals) · Audit log.

**Later:** Reels moderation · Support tickets + Disputes · QA scorecards · Region rules +
GDPR · Markets/Partners · Safety cases · Field tasks.

## Core UI pattern

Everything is **Queue → Review → Decide**: a reviewer opens a queue, reviews an item's
evidence on one card, clicks an action, and advances to the next — fast and auditable.

## Folder layout

```
operations/
├── README.md
└── src/
    ├── api/         # ops API client (opsApi.ts) → /v1/ops/*
    ├── auth/        # staff login + role context (RBAC)
    ├── components/  # shared UI (QueueReviewDecide, Sidebar, Table…)
    ├── modules/     # one folder per module (dashboard, kyc, listings, …)
    └── lib/         # helpers (formatting, audit, roles)
```

## Run (once scaffolded)

```bash
cd operations
npm install
npm run dev            # Vite dev server
# point VITE_API_BASE at the backend (default http://localhost:4000)
```

## Status

Folder + API client scaffolded. Next: `npm create vite@latest . -- --template react-ts`
then build **Phase 1** modules against `src/api/opsApi.ts`.
