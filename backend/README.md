# StayOn Backend — the central service (User · Host · Ops)

**One** Node/Express service + **one** shared store that all three clients talk to.
This is the "in-between": a host's listing and a user's booking live in the same
place, and Ops sits in the middle (approvals, KYC, reports). Dev build uses a
JSON file store (`data/db.json`); swap for PostgreSQL in production (see
`../BACKEND_SCHEMA_API.md`).

## Run
```bash
cd backend
npm install
npm start          # http://localhost:4000   (npm run dev = auto-reload)
```

## Prove the three communicate
```bash
node smoketest.js
```
It runs: **Host** creates+submits a listing → **Ops** approves it → a different
**User** searches and sees it → User books → **Host** accepts → the **User's**
trip flips to *confirmed* (cross-surface sync), then shows the contact-guard and
the Ops dashboard.

## Who logs in how
- **User / Host** (same account, two modes): `POST /v1/auth/login { phone, name }`
- **Ops staff**: `POST /v1/ops/auth/login { email }` — seeded `ops@stayon.com` (super_admin)

Send the returned `accessToken` as `Authorization: Bearer <token>`.

## Endpoint groups (see src/index.js)
| Group | Who | Examples |
|---|---|---|
| Auth | all | `/v1/auth/login`, `/v1/ops/auth/login`, `/v1/me` |
| Listings | host | `POST /v1/listings`, `/v1/listings/:id/submit`, `GET /v1/listings` |
| Search | user | `GET /v1/search?city=&guests=&maxPrice=` |
| Bookings | user | `POST /v1/bookings`, `GET /v1/bookings`, `/v1/bookings/:id/cancel` |
| Reservations | host | `GET /v1/reservations`, `/v1/reservations/:id/accept\|decline\|checkin\|checkout` |
| Messaging | user/host | `POST /v1/threads`, `/v1/threads/:id/messages` (contact-guard) |
| Reviews | user/host | `POST /v1/reviews`, `/v1/reviews/:id/respond` |
| Reels | author | `POST /v1/reels`, `GET /v1/reels` |
| Reports | user/host | `POST /v1/reports` |
| KYC | user/host | `POST /v1/identity/submit` |
| **Ops** | staff | `/v1/ops/queues/listings`, `/v1/ops/listings/:id/approve\|reject`, `/v1/ops/queues/kyc`, `/v1/ops/reports`, `/v1/ops/dashboard`, `/v1/ops/audit` |
| Notifications | all | `GET /v1/notifications` |

## Key guarantees wired in
- **Listings are public only after Ops approval** (`pending_review → published` → appears in `/search`).
- **Booking ↔ Reservation stay in sync** via the shared confirmation `code` (host accept/checkout/cancel ⇄ user trip status).
- **0% platform fee** (`PLATFORM_FEE = 0`); taxes withheld on refunds.
- **Contact-guard** blocks phone/email before a booking is confirmed.
- **Every Ops mutation is audited** (`/v1/ops/audit`).

## Next steps to production
1. Swap JSON store → PostgreSQL (schema in `../BACKEND_SCHEMA_API.md`).
2. Real OTP auth + refresh tokens.
3. Payment provider (escrow/payouts), media uploads (S3), search index.
4. WebSocket for realtime chat + live Ops queue counters.
5. Point the User & Host apps at this API (migration map in `../BACKEND_INTEGRATION.md`).
