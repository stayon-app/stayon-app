# StayOn — Setup & Package Documentation

This monorepo has **four** independent apps. Each has its own `package.json` and is
installed/run separately. Use this doc to reproduce the project exactly on any branch.

> **Important:** No extra npm packages were added during recent work. The website uses
> **Leaflet via CDN** (no install) and free browser APIs (geolocation/Intl, OpenStreetMap
> Nominatim) — so `npm install` against the committed `package.json` / lockfiles reproduces
> everything 1:1.

## Prerequisites
- **Node.js ≥ 20** (Node 22/24 work). npm ≥ 10.
- For the mobile apps (`user`, `host`): **Expo CLI** is invoked via `npx expo` (no global install needed). For device testing, the **Expo Go** app, or Android Studio / Xcode for emulators.
- A modern browser for the website and Expo web.

## One-time install (run in each app folder)
```bash
# from the repo root
cd backend && npm install
cd ../host   && npm install
cd ../user   && npm install
cd ../website && npm install
```

---

## 1. `website/` — marketing + booking website (Vite + React)
**Stack:** React 18, Vite 5, TypeScript 5. Maps via **Leaflet (CDN)**.

```bash
cd website
npm install
npm run dev        # http://localhost:5175 (auto-bumps to 5176 if taken)
npm run build      # production build → dist/
npm run preview    # preview the build
```

**Dependencies** (`website/package.json`):
- `react@^18.3.1`, `react-dom@^18.3.1`
- dev: `@vitejs/plugin-react@^4.3.4`, `vite@^5.4.11`, `typescript@^5.6.3`, `@types/react@^18.3.12`, `@types/react-dom@^18.3.1`

**External (no npm install):**
- Leaflet `1.9.4` — loaded via `<link>`/`<script>` in `website/index.html` (unpkg CDN).
- OpenStreetMap **Nominatim** geocoding — called at runtime via `fetch` (no key).
- Unsplash images — via plain `images.unsplash.com` URLs (no SDK/key).
- **flagcdn.com** country flag images — used in the phone-number country picker (`src/countries.ts`), keyless, CORS-ok. Renders real flags cross-platform (Windows browsers don't render emoji flags).

No `.env` required.

---

## 2. `backend/` — central API (Node + Express)
**Stack:** Express 4, Supabase JS, JWT. Uses Node's native `--env-file`.

```bash
cd backend
npm install
npm run dev        # node --watch src/index.js (reads .env if present)
npm start          # production
npm run test:full  # node fulltest.js
```

**Dependencies** (`backend/package.json`):
- `@supabase/supabase-js@^2.107.0`, `cors@^2.8.5`, `express@^4.21.2`, `jsonwebtoken@^9.0.2`

**Env:** create `backend/.env` (optional; loaded only if present) for Supabase URL/key and JWT secret. The website/apps currently run with mock/client-side data and do **not** require the backend to be running.

---

## 3. `user/` — guest mobile app (Expo / React Native)
**Stack:** Expo ~56, React Native 0.85, React 19, TypeScript.

```bash
cd user
npm install
npm run start      # expo start (press w = web, a = Android, i = iOS)
npm run web        # expo start --web
npm run android
npm run ios
```

**Key dependencies** (`user/package.json`): `expo@~56.0.4`, `react@19.2.3`, `react-native@0.85.3`, `expo-location@~56.0.15` (drives geo content), `expo-image`, `expo-image-picker`, `expo-secure-store`, `expo-haptics`, `expo-av`, `expo-blur`, `expo-linear-gradient`, `expo-sensors`, `@react-navigation/*`, `react-native-maps@1.27.2`, `react-native-reanimated@4.3.1`, `react-native-gesture-handler`, `react-native-screens`, `react-native-safe-area-context`, `@shopify/flash-list`, `react-native-calendars`, `lottie-react-native`, `lucide-react-native`, `dayjs`, `@gorhom/bottom-sheet`, `@react-native-async-storage/async-storage`, `@react-native-community/netinfo`, `react-native-svg`, `react-native-web`.
- dev: `@babel/core`, `@expo/metro-runtime`, `babel-preset-expo`, `typescript`, `@types/react`.

---

## 4. `host/` — host mobile app (Expo / React Native)
Same Expo/RN stack as `user` (minus `expo-sensors` / `lucide-react-native`).

```bash
cd host
npm install
npm run start      # expo start
npm run web
```

---

## What runs where (ports)
| App | Command | URL |
|-----|---------|-----|
| website | `npm run dev` (in `website/`) | http://localhost:5175 / 5176 |
| backend | `npm run dev` (in `backend/`) | per `src/index.js` |
| user (web) | `npm run web` (in `user/`) | Expo dev server (web) |
| host (web) | `npm run web` (in `host/`) | Expo dev server (web) |

## Going live with the real backend (optional)

The `backend/` is a complete Supabase-backed API (auth, listings, search, bookings,
reservations, messaging, reviews, KYC/identity, payments/escrow, payouts, media,
and an Ops portal). All three frontends are wired to it and **fail-safe** — they
fall back to local data when the backend isn't running, so it's entirely optional.

**1. Create a Supabase project**, then `cp backend/.env.example backend/.env` and fill:
`SUPABASE_URL`, `SUPABASE_SERVICE_KEY` (required to boot), `JWT_SECRET`, `IDENTITY_SALT`.
Run the SQL in `backend/supabase/schema.sql` then the `migration-00*.sql` files (Supabase SQL editor).

**2. Run it:** `cd backend && npm install && npm run dev` → `http://localhost:4000`.

**3. Point the frontends at it:**
- **Website:** create `website/.env` with `VITE_API_BASE=http://localhost:4000/v1` (defaults to that already), then `npm run dev`.
- **Apps:** set `EXPO_PUBLIC_API_BASE=http://localhost:4000/v1` (on a physical device use your machine's LAN IP, not `localhost`).

Without these, everything still works from `localStorage`/AsyncStorage. With them, a
published listing, identity submission, login and booking are sent to the real DB.

## Notes for reproducing on another branch / main
- Commit each app's `package.json` **and** its `package-lock.json` (the website has one; ensure the Expo apps' locks are committed too). `npm ci` (instead of `npm install`) reproduces locked versions exactly.
- The website needs **internet access at runtime** for: Leaflet CDN, Unsplash images, OpenStreetMap tiles + Nominatim geocoding. These are public and keyless.
- Geo-personalised home content (website + `user`) is **curated data baked into the source** (`website/src/data.ts` → `COUNTRY_CONTENT`; `user/src/data/homeContent.ts`). No API keys needed. To go live-data later, wire `backend/` to the tourism/image APIs and feed the same country keys.
