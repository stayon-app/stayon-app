# StayOn — Public Website

The public, SEO-friendly marketing + browse/book site for StayOn. Built with
**Next.js 14 (App Router) + TypeScript**, it talks to the **same backend** as the
mobile app and Ops portal. This is a separate surface from `user/` (the Expo
app) — see the repo root `README.md` for the big picture.

## Run locally

```bash
cd web
npm install
cp .env.local.example .env.local   # optional — defaults to localhost:4000
npm run dev                         # → http://localhost:3000
```

The StayOn backend must be running (default `http://localhost:4000`). Start it
with `cd backend && npm start`.

## Configuration

| Env var | Default | Purpose |
|---|---|---|
| `API_BASE` | `http://localhost:4000/v1` | Backend base used by **Server Components** (browse/search/detail, server-side fetch). |
| `NEXT_PUBLIC_API_BASE` | `http://localhost:4000/v1` | Backend base used by the **browser** for auth/booking (login, OTP, profile). Must be public. |

Set both in `.env.local` for dev, or in the Vercel dashboard for production
(point them at your deployed backend). Login/signup reuse the **same** backend
auth endpoints (`send-otp`, `verify-otp`, `PUT /me`, `refresh`, `logout`) as the
mobile app — no separate auth service.

## Structure

```
web/
  app/
    layout.tsx          # root layout (header + footer)
    page.tsx            # home — hero, search, featured stays
    search/page.tsx     # search results grid
    stay/[id]/page.tsx  # listing detail
    globals.css         # StayOn design system (teal→indigo brand)
  components/           # Header, Footer, SearchBar, StayCard, ReserveButton
  lib/
    api.ts              # server-side backend client (searchStays, getStay)
    types.ts            # Listing type (mirrors backend listingOut)
```

Pages are **Server Components** that fetch the public backend directly
(`/search`, `/listings/:id`). No secrets live in this app.

## Scope

- **Done (slice 1):** public browse — home, search, listing detail.
- **Next (slice 2):** accounts (phone-OTP login on web) + the booking flow.
  The detail page's *Reserve* button is currently a placeholder.

## Deploy (Vercel)

1. New Project → import the repo → set the **Root Directory** to `web`.
2. Add the `API_BASE` env var (your deployed backend URL).
3. Deploy. `npm run build` is verified to pass.

## Gotcha

Don't run `npm run build` while `npm run dev` is running on this folder — it
corrupts the shared `.next` cache (`Cannot find module './###.js'`). Fix: stop
dev, delete `web/.next`, then `npm run dev`.
