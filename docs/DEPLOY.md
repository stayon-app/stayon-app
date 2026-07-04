# StayOn — Production Deploy

Auto-deploys on every push to `main` via `.github/workflows/deploy.yml`, which
triggers each host's **Deploy Hook**. Each host builds from its own root
directory using env vars set in that host's dashboard.

## Recommended hosting (all free to start)

| Part | Host | Free tier | Why |
|---|---|---|---|
| **Website** (`web/`, Next.js) | **Vercel** | Generous | Best-in-class Next.js hosting |
| **Ops portal** (`operations/`, Vite SPA) | **Vercel** | Yes | Static, same account as web |
| **Backend** (`backend/`, Express) | **Render** | Free (sleeps ~15 min idle) or $7/mo always-on | `render.yaml` already present |
| **Database + Storage** | **Supabase** | Yes (already live, Mumbai) | — |
| **Mobile** (`user/`, Expo) | **Expo EAS** | Yes | Later |

> Free-tier note: Render's free service **sleeps after ~15 min idle** (first
> request then takes ~50s). Fine for launch/testing; upgrade to the $7 plan for
> always-on before real traffic.

---

## One-time setup

### 1. Backend → Render
1. [render.com](https://render.com) → **New → Web Service** → connect this repo.
2. **Root Directory:** `backend` · **Build:** `npm install` · **Start:** `npm start`.
3. **Environment** → add:
   ```
   NODE_ENV=production
   SUPABASE_URL=…            (from Supabase → Settings → API)
   SUPABASE_SERVICE_KEY=…    (service_role key)
   SUPABASE_ANON_KEY=…
   JWT_SECRET=<long random>
   CLERK_SECRET_KEY=sk_live_…  (or sk_test_ for now)
   OTP_TRANSPORT=console
   SUPABASE_BUCKET_LISTINGS=listings
   SUPABASE_BUCKET_REELS=reels
   IDENTITY_SALT=<long random>
   ```
4. Deploy. Note the URL, e.g. `https://stayon-backend.onrender.com`.
5. **Settings → Deploy Hook** → copy the URL → GitHub secret `RENDER_DEPLOY_HOOK`.

### 2. Website → Vercel
1. [vercel.com](https://vercel.com) → **Add New → Project** → import this repo.
2. **Root Directory:** `web` (Vercel auto-detects Next.js).
3. **Environment Variables:**
   ```
   API_BASE=https://stayon-backend.onrender.com/v1
   NEXT_PUBLIC_API_BASE=https://stayon-backend.onrender.com/v1
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_…   (or pk_test_ for now)
   CLERK_SECRET_KEY=sk_live_…
   ```
4. Deploy. → **Settings → Git → Deploy Hooks** → create one for `main` → GitHub secret `VERCEL_WEB_DEPLOY_HOOK`.

### 3. Ops portal → Vercel
1. **Add New → Project** → same repo → **Root Directory:** `operations`.
   - Framework: Vite · Build: `npm run build` · Output: `dist`.
2. **Environment Variable** (note: **no** `/v1` — the ops client appends it):
   ```
   VITE_API_BASE=https://stayon-backend.onrender.com
   ```
3. Deploy → **Deploy Hook** for `main` → GitHub secret `VERCEL_OPS_DEPLOY_HOOK`.

### 4. GitHub secrets
Repo → **Settings → Secrets and variables → Actions → New repository secret**:
| Secret | From |
|---|---|
| `RENDER_DEPLOY_HOOK` | Render service → Settings → Deploy Hook |
| `VERCEL_WEB_DEPLOY_HOOK` | Vercel web project → Deploy Hooks |
| `VERCEL_OPS_DEPLOY_HOOK` | Vercel ops project → Deploy Hooks |

---

## How it works
Push to `main` → **CI** (`ci.yml`) typechecks each app → **Deploy** (`deploy.yml`)
POSTs each Deploy Hook → Render/Vercel rebuild from `main` with their env vars.
Hooks that aren't set yet are skipped, so partial setup is safe.

## Notes
- The backend allows all origins (CORS), so the Vercel domains work out of the box.
  Tighten CORS to your domains before public launch.
- **Restrict the Google Maps key** to your domains before launch.
- Prefer **live** Clerk keys (`pk_live_`/`sk_live_`) and a strong `JWT_SECRET` in prod.
- Alternative to hooks: Vercel/Render can **auto-deploy on push** natively (no
  Actions). This workflow gives you one place to gate/observe deploys instead.
