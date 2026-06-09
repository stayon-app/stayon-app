# StayOn × Supabase — what YOU need to do (step by step)

This is everything required from your side to make the backend database-backed and
cross-device. It takes ~15 minutes. After you do this and send me the keys, I flip
the backend to Supabase and we test "log in on any phone, see the same data."

Supabase free tier is enough to start. (Google Cloud is only needed later for the
Maps/Places key — see step 6; not required for the first cross-device milestone.)

---

## Step 1 — Create the Supabase project (5 min)
1. Go to **https://supabase.com** → **Sign in** (GitHub/Google) → **New project**.
2. Fill in:
   - **Name:** `stayon`
   - **Database Password:** click *Generate* → **copy & save it** (you'll need it).
   - **Region:** pick the one closest to your users (e.g., *Mumbai (ap-south-1)* for India).
3. Click **Create new project** and wait ~2 minutes for it to provision.

## Step 2 — Get the 3 keys I need
In the project, go to **Settings (gear icon) → API**. Copy these:
1. **Project URL** — looks like `https://abcdxyz.supabase.co`
2. **anon public** key (a long `eyJ…` string)
3. **service_role** key (another long `eyJ…` string) — ⚠️ **secret**, server-only

Then go to **Settings → Database → Connection string → URI** and copy:
4. **Connection string** — `postgresql://postgres:[YOUR-PASSWORD]@db.abcdxyz.supabase.co:5432/postgres`
   (replace `[YOUR-PASSWORD]` with the password from Step 1)

## Step 3 — Create the database tables (2 min)
1. In Supabase, open **SQL Editor** (left sidebar) → **New query**.
2. Open the file **`backend/supabase/schema.sql`** in this repo, copy ALL of it.
3. Paste into the SQL editor → click **Run**. You should see "Success".
   (This creates all tables: users, listings, bookings, reviews, etc.)

## Step 4 — Create the image storage bucket (1 min)
1. Go to **Storage** (left sidebar) → **New bucket**.
2. Name it **`listings`**, toggle **Public bucket = ON** (so images load by URL), → **Create**.
   (Repeat for a bucket named **`reels`** if you want video too.)

## Step 5 — Send me the keys
Paste these back to me (I'll put them in `backend/.env`, which is git-ignored):
```
SUPABASE_URL=        (Step 2.1)
SUPABASE_ANON_KEY=   (Step 2.2)
SUPABASE_SERVICE_KEY=(Step 2.3)
DATABASE_URL=        (Step 2.4)
```
⚠️ The **service_role** key and DB password are secrets — only put them in the
backend `.env`, never in the app.

## Step 6 — (LATER, optional) Google Maps/Places key
Only needed when we move map search server-side. When you're ready:
1. **https://console.cloud.google.com** → create a project → **APIs & Services → Library** →
   enable **Maps JavaScript API**, **Places API**, **Geocoding API**.
2. **Credentials → Create credentials → API key** → copy it.
3. **Restrict** the key (HTTP referrers / IP) before launch.
4. Send it to me → I'll set `GOOGLE_MAPS_KEY` on the server (not in the app).

---

## What I do once you send Step 5
1. Put the keys in `backend/.env`.
2. Switch the backend store from the JSON file → **Supabase Postgres**.
3. Wire **image upload** → Supabase Storage (so photos work on every device).
4. Run the connection test → confirm reads/writes hit the database.
5. Deploy the backend to a public URL so your phone can reach it (not localhost).
6. Point the app at it (`EXPO_PUBLIC_API_BASE`).
7. We run the **cross-device acceptance test**: create a listing on one phone, log in on
   another → it's there with photos, and you can manage it.

## TL;DR — your to-do
- [ ] Create Supabase project (Step 1)
- [ ] Copy the 4 values (Step 2)
- [ ] Run `schema.sql` in SQL Editor (Step 3)
- [ ] Create `listings` (and `reels`) storage bucket, public (Step 4)
- [ ] Send me the 4 values (Step 5)
- [ ] (later) Google Maps key (Step 6)

That's it — once I have the keys, I do the rest.
