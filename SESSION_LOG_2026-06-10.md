# StayOn — Work Session Log

> **Date:** 2026-06-10
> **Time:** 23:36 IST
> **Author:** Sai Prakash Reddy Sangam
> **Scope:** Connect the platform end-to-end (backend ↔ Supabase) and redesign the Operations portal login.

---

## 1. Summary

In this session we took the three frontends from "running on mock data" to a **fully connected, database-backed system**, added **real password authentication** to the Operations portal, and **redesigned the Ops login** into an animated, website-style split screen.

Everything below was implemented, type-checked (`tsc` → 0 errors), and verified live.

---

## 2. What was running at the start

| App | Folder | Status at start |
|---|---|---|
| Guest app | `user/` | Not installed |
| Host app | `host/` | Not installed |
| Operations portal | `operations/` | Not installed |
| Backend | `backend/` | Not installed, no `.env`, not running |

Diagnosis: the three frontends were correctly wired to `localhost:4000`, but the **backend was down** and **Supabase was not configured**, so nothing was live-connected.

---

## 3. What we did

### 3.1 Installed & launched all apps
- `npm install` in `user/`, `host/`, `operations/`, `backend/`.
- Launched dev servers (kept running in the background):

| App | URL |
|---|---|
| **Guest app** | http://localhost:8085/ |
| **Host app** | http://localhost:8086/ |
| **Operations portal** | http://localhost:5174/ |
| **Backend API** | http://localhost:4000/ |

- Verified both Expo web bundles compile (HTTP 200) and the Vite portal serves (HTTP 200).

### 3.2 Connected the backend to Supabase
- Created **`backend/.env`** (git-ignored) with the live Supabase project:
  - Project ID: `whxawgyzsvmfjgrqjupk`
  - `SUPABASE_URL`, `SUPABASE_ANON_KEY` (publishable), `SUPABASE_SERVICE_KEY` (secret)
  - Generated a strong `JWT_SECRET`, set `IDENTITY_SALT`, `OPS_STEPUP_PIN`.
- Started the backend → log confirmed: **`Supabase: connected (database-backed mode)`**.
- Verified live endpoints: ops login returns a real JWT; `/v1/search` returns 200 from the database.
- Database schema was already loaded by the user (no migrations needed this session).

**Result:** the full chain is now connected:
`Guest / Host / Ops → Backend (:4000) → Supabase (live DB)`

### 3.3 Added real password authentication (backend)
- Previously `POST /v1/ops/auth/login` **ignored the password** — it only looked up the email.
- Updated it (`backend/src/index.js`) to **enforce a real password**:
  - Uses the staff member's own password if set, otherwise the shared `OPS_PASSWORD`.
  - Rejects wrong/empty passwords with **401**.
  - Disabled staff accounts are blocked (403).
  - Writes an `ops.login` row to the audit log.
- Added `OPS_PASSWORD=stayon` to `backend/.env`.
- **Verified:** empty password → 401, wrong password → 401, correct password `stayon` → 200 + token.

**Ops credentials:** User ID `ops@stayon.com` · password `stayon`

### 3.4 Redesigned the Operations portal login
Files changed: `operations/src/App.tsx`, `operations/src/styles.css`.

Iterations during the session:
1. Built a split-screen login + a first splash screen.
2. Replaced the splash with one matching the **guest app** (resort photo carousel + glowing serif "Stay On"). *(later removed)*
3. Per request, **removed the photo splash entirely** and made a clean **website-style split login** the first screen.
4. Simplified the left panel to just the **animated app name** ("StayOn / Operations / Dashboard") that slides in word-by-word.
5. **Animated the sign-in form** — every element (kicker, heading, fields, button, hint) now staggers in like a splash.

**Final login design:**
- **Left half** — clean StayOn teal→indigo **gradient brand panel**; the app name **"StayOn Operations Dashboard"** slides in from the left, word-by-word (splash-style). Visible on windows wider than ~880px.
- **Right half** — the **Operations Team sign-in**:
  - **User ID** + **Password** (with Show/Hide toggle)
  - **Forgot password?** link → "Reset password" view (enter User ID → logs a reset request for the super-admin → "Back to sign in")
  - **Sign in** button (gradient, loading spinner)
  - Dark/Light theme toggle
  - Every element animates in on load.
- Upgraded fonts (Sora / Manrope), focus rings, hover states, and polished the dashboard tiles, metric cards, sidebar, and topbar (avatar chip).

---

## 4. Current state (as of this session)

```
  GUEST :8085 ✅     HOST :8086 ✅     OPS :5174 ✅
        │                 │                │
        └──── all → backend :4000 ────────┘   ✅ connected
                          │
                 BACKEND :4000 ✅  "Supabase: connected (database-backed mode)"
                          │
                 SUPABASE (whxawgyzsvmfjgrqjupk) ✅  live data
```

| Check | Result |
|---|---|
| Backend ↔ Supabase | ✅ connected (database-backed mode) |
| Ops login — correct password | ✅ 200 + JWT |
| Ops login — wrong/empty password | ✅ 401 rejected |
| Live `/v1/search` | ✅ 200 |
| Operations portal TypeScript | ✅ 0 errors |
| Guest + Host web bundles | ✅ compile (200) |

---

## 5. Files changed / created

| File | Change |
|---|---|
| `backend/.env` | **Created** — Supabase keys, JWT secret, `OPS_PASSWORD`, salts (git-ignored) |
| `backend/src/index.js` | Real password enforcement on `/v1/ops/auth/login` + login audit |
| `operations/src/App.tsx` | New animated split-screen login, password field, Forgot password flow; removed splash |
| `operations/src/styles.css` | Fonts, gradient brand panel, animated app name, staggered form animations, polished shell/tiles |
| `SESSION_LOG_2026-06-10.md` | **This document** |

---

## 6. Open / optional follow-ups

- **Per-staff passwords:** add a `staff.password` column + an admin "reset password" action so password resets are fully self-service (currently a shared `OPS_PASSWORD` + a request-to-admin reset flow).
- **Login breakpoint:** lower the ~880px breakpoint so the animated app-name panel stays visible on narrower windows.
- **Production:** rotate `JWT_SECRET`/`OPS_PASSWORD`, enable Supabase RLS, restrict the Google Maps key, real OTP/SMS, payments + KYC vendor keys (see `STAYON_PENDING.md`).
- Apply the same login/splash styling to the guest and host apps (optional).

---

*Generated 2026-06-10 23:36 IST.*
