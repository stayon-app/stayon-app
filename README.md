# StayOn — 0%-fee stay-booking platform

StayOn is an Airbnb-style marketplace with **zero commission** (hosts keep 100%). Guest,
host, and operations all run on **one shared backend + one database**.

> 📖 **Full developer documentation:** see **[STAYON_DOCUMENTATION.md](STAYON_DOCUMENTATION.md)**
> (architecture, tech stack, every module, feature flows, setup). This README is the quick start.

---

## What's in this repo

| Folder | What it is |
|---|---|
| **`user/`** | The Expo app — **guest + host in one** (host code lives in `user/src/host/`). Guest⇄host via a mode switch. |
| **`backend/`** | The all-in-one Node/Express API for user + host + ops, backed by Supabase. |
| **`*.md`** | Planning & design docs (vision, backend plan, schema/API, ops portal, production plan). |

## Tech stack

- **App:** Expo SDK 56 · React Native 0.85 · React 19 · TypeScript · React Navigation 7 ·
  Google Maps · lucide-react-native
- **Backend:** Node.js · Express 4 · JWT auth
- **Data:** Supabase — Postgres + PostGIS + Storage

## Core principles

1. **0% fees** — no platform/guest/host fees.
2. **One app, two modes** — guest & host share one login and one codebase.
3. **One person = one identity** — government-ID hash is unique (anti-fraud).
4. **Cloud-first** — stays/photos/identities live in the cloud, so any device sees the same data.

---

## Quick start

### 1. Backend
```bash
cd backend
cp .env.example .env        # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, JWT_SECRET
npm install
node --env-file-if-exists=.env src/index.js   # → http://localhost:4000
npm run test:full                              # 54-check end-to-end test
```

### 2. Database (Supabase SQL Editor)
Run in order: `backend/supabase/schema.sql`, then `migration-002-listing-extra.sql`,
then `migration-003-identity-unique.sql`. Create public Storage buckets `listings` and `reels`.

### 3. App
```bash
cd user
npm install
npx expo start --web --port 8085               # → http://localhost:8085
```

### Verify a change
- Types: `cd user && ./node_modules/.bin/tsc --noEmit -p tsconfig.json` → **0 errors**
- Web bundle: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:8085/index.bundle?platform=web&dev=true"` → **200**

---

## Security notes

- **Secrets** (`backend/.env`: Supabase service key, JWT secret, AI keys) are **git-ignored** — never commit them.
- The **Google Maps key** in the app source must be **domain-restricted** before any public launch.
- This is a **private** repository.

---

## Project layout (high level)

```
user/src/
  api/  components/  constants/  contexts/  data/  hooks/
  navigation/  screens/  services/  types/  utils/
  host/        # the host app (screens, data, navigation)
backend/src/
  index.js  auth.js  supabase.js  kyc.js
backend/supabase/
  schema.sql  migration-002-*.sql  migration-003-*.sql
```

For everything else — every endpoint, table, context, and feature flow — read
**[STAYON_DOCUMENTATION.md](STAYON_DOCUMENTATION.md)**.
