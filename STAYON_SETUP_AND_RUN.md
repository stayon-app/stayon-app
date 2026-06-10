# StayOn — Setup & Run Guide

> Everything a developer needs to install and run **all three** parts of StayOn on a
> fresh machine: the **Guest + Host app** (one Expo app), the **Backend** (Node/Express +
> Supabase), and the **Operations portal** (Vite/React). Last updated: 2026-06-10.

---

## 0. What you're running (3 parts, 1 system)

| Part | Folder | Tech | Port | What it is |
|---|---|---|---|---|
| **Guest + Host app** | `user/` | Expo SDK 56 · React Native · TypeScript | **8085** (web) | The mobile app — guest & host modes in one app |
| **Backend** | `backend/` | Node + Express + Supabase | **4000** | The one API for app + ops; talks to Postgres |
| **Operations portal** | `operations/` | Vite + React 18 + TypeScript | **5174** | Staff web console (29 modules) |

They share **one Supabase database**. Start order: **Backend → App / Ops**.

---

## 1. Prerequisites (install these once)

| Tool | Version | Why | Get it |
|---|---|---|---|
| **Node.js** | 20+ (tested on 24) | runs backend, builds app + ops | https://nodejs.org |
| **npm** | comes with Node | installs packages | — |
| **Git** | any | clone the repo | https://git-scm.com |
| **Supabase account** | free tier | the database + storage | https://supabase.com |
| **A browser** | Chrome/Edge | run app on web + the ops portal | — |
| *(optional)* **Expo Go** app | latest | run the app on a real phone | App Store / Play Store |
| *(optional)* **Android Studio / Xcode** | — | run on an emulator/simulator | — |

> No global Expo CLI needed — it's bundled. You run it with `npx expo` / `npm run`.

Check your install:
```bash
node --version    # v20+  (you have v24)
npm --version
git --version
```

---

## 2. Get the code
```bash
git clone <your-repo-url> Stayon
cd Stayon
```
Folders: `user/` (app) · `backend/` (API) · `operations/` (ops portal) + the docs.

---

## 3. Backend (start this FIRST)

### 3.1 Install
```bash
cd backend
npm install
```
Installs: **express** (web server), **@supabase/supabase-js** (database client),
**jsonwebtoken** (auth tokens), **cors**.

### 3.2 Configure `.env`
Copy the example and fill it in:
```bash
cp .env.example .env        # Windows PowerShell: copy .env.example .env
```
Edit `backend/.env`:
```ini
# Required
SUPABASE_URL=https://<your-project>.supabase.co
SUPABASE_SERVICE_KEY=<service_role key from Supabase → Settings → API>
JWT_SECRET=<any long random string>

# Optional (features degrade gracefully if absent)
GEMINI_API_KEY=          # AI photo room-classification
KYC_PROVIDER=            # onfido | persona | hyperverge
KYC_API_KEY=
IDENTITY_SALT=<long random string>
OPS_STEPUP_PIN=2468      # PIN to open sensitive ops boxes
STRIPE_SECRET_KEY=       # real payments (else runs in sim mode)
PAYMENTS_PROVIDER=       # stripe | razorpay | sim (auto)
```

### 3.3 Create the database (run migrations once)
In **Supabase → SQL Editor**, paste & run each file from `backend/supabase/` **in order**:
```
migration-001 … 010   (001 = schema, 002–010 = features)
```
Paste the **whole file** at once and click **Run**. (010 covers 2FA + push; 009 payments;
008 dev-requests; 007 payout-hold; 006 ID docs; 004/005 ops modules.)

### 3.4 Run
```bash
npm start            # → http://localhost:4000   (production-style)
# or, auto-restart on file changes:
npm run dev
```
Verify it's up: open **http://localhost:4000** → `{"service":"StayOn backend","status":"ok"}`.

### 3.5 Test (optional)
```bash
npm run test:full    # → "ALL CONNECTED — 54 passed, 0 failed"
```

---

## 4. Guest + Host app (`user/`)

### 4.1 Install
```bash
cd ../user
npm install
```
Key packages (already in `package.json`): **expo** (framework), **react-navigation**
(screens/tabs), **react-native-maps** (Airbnb-style maps), **react-native-svg** +
**lucide-react-native** (icons), **expo-image / expo-image-picker** (photos),
**expo-location / expo-sensors** (geo + tilt), **expo-haptics / expo-blur /
expo-linear-gradient** (polish), **async-storage / expo-secure-store** (local data).

### 4.2 Point the app at your backend
Set the API base (defaults to localhost). Create `user/.env` or export before start:
```ini
EXPO_PUBLIC_API_BASE=http://localhost:4000/v1
```
> On a **real phone**, use your computer's LAN IP, e.g. `http://192.168.1.20:4000/v1`
> (localhost on the phone means the phone itself).

### 4.3 Run
```bash
npm run web        # → http://localhost:8085   (fastest to preview)
# or:
npm start          # Expo dev server → press w (web), a (Android), i (iOS), or scan QR in Expo Go
npm run android    # emulator / device
npm run ios        # simulator (macOS only)
```
- **Guest mode** is the default. Switch to **Host mode** via the profile/mode toggle.
- Everything is one app — host screens live under `user/src/host/`.

---

## 5. Operations portal (`operations/`)

### 5.1 Install
```bash
cd ../operations
npm install
```
Packages: **react / react-dom**, built with **vite** + **typescript**.

### 5.2 Point it at your backend (optional — defaults to localhost:4000)
Create `operations/.env`:
```ini
VITE_API_BASE=http://localhost:4000
```

### 5.3 Run
```bash
npm run dev        # → http://localhost:5174
```
Sign in with the seed admin **`ops@stayon.com`** (no password for the seed account).
Sensitive boxes ask for the step-up **PIN `2468`** (or your `OPS_STEPUP_PIN`).

### 5.4 Build for production
```bash
npm run build      # outputs static files to operations/dist/
npm run preview    # preview the built site locally
```

---

## 6. Daily run — the 3 commands

Open **3 terminals**:
```bash
# 1) Backend            (terminal A)
cd backend && npm start

# 2) Guest + Host app   (terminal B)
cd user && npm run web

# 3) Ops portal         (terminal C)
cd operations && npm run dev
```
Then open: **app** http://localhost:8085 · **ops** http://localhost:5174 ·
**API** http://localhost:4000.

---

## 7. Verify / health checks
```bash
# backend up?
curl http://localhost:4000/                  # → status ok
# app web bundle builds?
curl -o /dev/null -w "%{http_code}\n" "http://localhost:8085/index.bundle?platform=web&dev=true"   # 200
# ops portal serving?
curl -o /dev/null -w "%{http_code}\n" http://localhost:5174/    # 200
# type-check (0 = clean)
cd user && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
cd operations && ./node_modules/.bin/tsc --noEmit -p tsconfig.json
```

---

## 8. Troubleshooting

| Symptom | Fix |
|---|---|
| Backend: `FATAL: Supabase not configured` | fill `SUPABASE_URL` + `SUPABASE_SERVICE_KEY` in `backend/.env` |
| Ops module shows "run migration-00X" | run that SQL file in Supabase SQL Editor |
| App can't reach backend on phone | use your LAN IP in `EXPO_PUBLIC_API_BASE`, not `localhost` |
| Port already in use | kill the process on 4000 / 8085 / 5174, or change the port |
| Icons/maps fail in web bundle | ensure `metro.config.js` keeps `mjs` in `resolver.sourceExts`; restart `expo start --clear` |
| Ops portal blank / login fails | confirm backend is running on :4000 and `VITE_API_BASE` matches |
| Expo cache weirdness | `npx expo start --clear` |

---

## 9. Env var reference (quick)

**backend/.env** — `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET` (required);
`GEMINI_API_KEY`, `KYC_PROVIDER`, `KYC_API_KEY`, `IDENTITY_SALT`, `OPS_STEPUP_PIN`,
`STRIPE_SECRET_KEY` / `RAZORPAY_*`, `PAYMENTS_PROVIDER` (optional).
**user/.env** — `EXPO_PUBLIC_API_BASE`.
**operations/.env** — `VITE_API_BASE`.

---

## 10. Going to production (pointers)
- **Backend → Render** (Web Service, set the env vars, run migrations on the prod DB).
- **Ops portal → Vercel / Netlify** (`npm run build` → deploy `dist/`, set `VITE_API_BASE`).
- **App → EAS** (`eas build` for iOS/Android; `npx expo export` for web). Restrict the
  Google Maps key to your domains.
- Full details in **`STAYON_PRODUCTION_INTEGRATIONS.md`**; remaining tasks in
  **`STAYON_PENDING.md`**.

---

### TL;DR
```bash
# one-time
cd backend && npm install        # + fill .env + run migrations in Supabase
cd ../user && npm install
cd ../operations && npm install
# every day (3 terminals)
cd backend && npm start          # :4000
cd user && npm run web           # :8085
cd operations && npm run dev     # :5174
```
