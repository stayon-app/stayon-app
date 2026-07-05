# StayOn Website — Design & Build Reference

> Living reference for the public website (`web/`, Next.js 14 App Router, port 3000).
> Covers what was built, the design system, the confidentiality rules, every component,
> and a **verification checklist** to re-run before shipping. Keep this updated as the
> site evolves. Last major rebuild commit: `8eba3bd`.

---

## 1. What this is

`web/` is StayOn's **public marketing + browse/book website** — both the **guest (user)**
surface and the **become-a-host** surface. It shares one backend with the mobile apps
(`user/`, `host/`). The goal was a premium, **unique** (not copied) Airbnb-caliber
experience that matches the apps' design language, going live globally.

**Golden rules**
- **Confidentiality:** the **guest site never shows host economics** (commission, "keep
  100%", payouts, earnings comparisons). Those live **only** on the host site. See §4.
- **Icons:** monochrome **solid-line icons everywhere** (not coloured emoji). See §3.4.
- **Fonts:** the apps' **system font stack** (the apps use `fontFamily: 'System'`). Do
  **not** reintroduce Plus Jakarta Sans or any webfont.
- **No new npm deps** — motion is CSS + IntersectionObserver, icons are inline SVG,
  Google Maps is loaded via an injected script.

---

## 2. Architecture

| Layer | Path | Notes |
|---|---|---|
| Backend | `backend/` | Express + Supabase, base `http://localhost:4000/v1`. Endpoints: `/v1/search`, `/v1/search?lat&lng&radius`, `/v1/listings/:id`, `/v1/listings` (POST create + `/submit`), `/v1/media/upload`. |
| Website | `web/` | Next.js 14 App Router, port 3000. Server Components fetch the backend directly (`web/lib/api.ts`); interactive pieces are `'use client'` islands. |
| Apps | `user/`, `host/` | Expo/React Native. Design source of truth for the website. |

- **Prices** are authored in USD on the backend; the site displays them in the viewer's
  currency via `<Price usd={} />` / `usePrefs().format()`.
- **Auth** is Clerk (`SignInButton`, `SignUpButton`, `UserButton`). The Clerk flow must
  stay byte-identical — do not restructure it.
- **Windows/dev note:** Read/Edit tools use forward-slash absolute paths.

---

## 3. Design system

### 3.1 Type
- `--font-sans`: `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto,
  'Helvetica Neue', Arial, sans-serif` + emoji fallbacks. Matches the apps.
- Scale: h1 `clamp(36–58px)/800`, h2 ~30/800, h3 18–20/700, body 14–18, eyebrow 11–13
  uppercase tracked. Tight heading tracking (`-0.02em … -0.03em`).

### 3.2 Colour tokens (`:root` in `globals.css`)
`--teal #0d9488` · `--indigo #6366f1` · `--ink #12122e` · `--slate #475569` ·
`--line #e6e8ee` · `--bg #fff` · `--bg-tint/--bg-soft` · `--gradient` (teal→indigo) ·
`--gradient-soft`. Radii `--r-md/lg/xl`, shadows `--shadow-xs/sm/md/lg`.

### 3.3 Motion
- `components/Reveal.tsx` — IntersectionObserver rise-in wrapper. Variants: `.reveal`,
  `.reveal-scale`, `.reveal-left`, `.reveal-right`, staggered via `delay` prop.
- Easing `cubic-bezier(0.16, 1, 0.3, 1)`; durations 150/300/700ms.
- **All motion is guarded by `@media (prefers-reduced-motion: reduce)`.**
- Card hover: image `scale(1.05)`; heart pop keyframe; carousel translateX.

### 3.4 Icons
- `components/WizIcon.tsx` — inline SVG **line icons** (`fill:none; stroke:currentColor`).
  Keyed set (home, search, key, map, tag, clock, lock, cash, shield, flash, location,
  heart, check, sparkles, star, calendar, property-types, etc.). Usable in server AND
  client components. **This is the icon language — extend it, don't add emoji.**
- Kept text glyphs (monochrome, conventional): `★` ratings, `✓` checks, `♡` heart.

---

## 4. Confidentiality matrix (CRITICAL)

| Surface | Shows | NEVER shows |
|---|---|---|
| **Guest** (`/`, `/search`, `/stay/[id]`, `/map`, `/trips`) | search, stays, categories, destinations, stories, ratings/reviews, "no booking fees", "the price you see is what you pay", verified stays, 24/7 support, a plain "Become a host" link | commission %, "hosts keep 100%", payout/earnings figures, revenue comparisons |
| **Host** (`/host` signed-out) | earnings estimator, "you keep 100%", 0% commission, pricing control, payout timing | — (economics allowed here) |

**Verify with:** grep the served guest HTML for
`commission | keep 100% | payout | 0% .* fee | host keeps` → must be **none**. (A leak was
found & fixed in `BookingWidget` — the fee note now reads "No booking fees · the price you
see is what you pay".)

---

## 5. Routes & information architecture

| Route | File | Type | Key pieces |
|---|---|---|---|
| `/` | `app/page.tsx` | Server | search-forward home: RotatingBg + SearchBar + CategoryRail, city carousels, guest favourites, destinations, travel stories, how-it-works, trust band, host CTA |
| `/search` | `app/search/page.tsx` | Server + client island | sticky SearchBar + `SearchResults` (split list ↔ map, filters, pagination) |
| `/stay/[id]` | `app/stay/[id]/page.tsx` | Server + islands | gallery lightbox, facts, description, amenities modal, reviews, location map, host block, sticky booking |
| `/map` | `MapSearch.tsx` | Client | Google Maps radius search |
| `/host` | `app/host/page.tsx` | Client | signed-out marketing + signed-in dashboard + listing wizard |

---

## 6. Component inventory

### Guest
- **`StayCard.tsx`** — mirrors the app's `PropertyCard`: swipeable **image carousel**
  (dots + hover arrows), **functional wishlist heart** (fills `#FF385C`, pop anim),
  verified shield, star rating, "N reviews", `+ taxes` price. Props `active/onHover/id`
  drive the split-search list↔map sync.
- **`SearchBar.tsx`** — Where/When/Who with a **2-month date-range calendar** and a
  **guests stepper**; "Popular destinations" dropdown. Builds `/search?...` params.
- **`SearchResults.tsx`** — split layout (list left, `SearchMap` right), **filter bar**
  (price slider, type, min beds, Instant book, Guest favourite) with a **live result
  count**, two-way highlight, and **pagination**. `PAGE_SIZE = 18`.
- **`SearchMap.tsx`** — Google Maps (hybrid) with custom `OverlayView` price pills; click
  a pill → `onSelect` highlights/scrolls the card. Active pin highlights.
- **`StayGallery.tsx`** — 5-up mosaic + "Show all N photos" → full-screen **lightbox**
  (←/→/Esc, counter).
- **`StayAmenities.tsx`** — first 10 amenities with line ticks + "Show all N amenities"
  **modal**. Labels mapped from `lib/wizard.ts`.
- **`StayReviews.tsx`** — rating summary + 6 category bars, built **only** from real
  `ratingAvg`/`ratingCount` (no fabricated review text; "new listing" empty state).
- **`StayLocationMap.tsx`** — "Where you'll be" Google map (hybrid) with an approximate
  circle (exact address after booking).
- **`BookingWidget.tsx`** — sticky booking card; quote breakdown (nights × rate, cleaning,
  taxes, total); guest-safe fee note. Clerk-gated reserve.
- **`StayCarousel.tsx`**, **`DestinationRail.tsx`**, **`StoryCard.tsx`**,
  **`CategoryRail.tsx`** + **`CategoryIcon.tsx`** — home discovery rails.
- **`RotatingBg.tsx`** — auto-cycling background images (paused under reduced-motion).
- **`Header.tsx`** — 3-column grid (brand · centered nav/pill · actions). **Route-aware**:
  guest search hidden on `/host`. Nav↔scroll-pill toggled via **CSS** (`.is-scrolled`),
  not remounting (fixes a `removeChild` crash).
- **`Footer.tsx`** + **`NewsletterSignup.tsx`** — premium dark footer with newsletter,
  trust badges, columns (all guest-safe).

### Host
- **`CreateListingForm.tsx`** — **three-phase listing wizard** mirroring the host app's
  `ListingWizardScreen`: (1) Tell us about your place → type grid, kind, location,
  basics, bathrooms, who-else; (2) Make it stand out → amenities, photos (min 6), title,
  highlights, description; (3) Finish up → booking, **price sweep**, weekend, discounts,
  safety, review. Monochrome `WizIcon`s. Posts the full rich payload the backend accepts.
- **`HostEarnings.tsx`** — two-pane estimator: rotating property image + "You keep 100%"
  badge, and **price-sweep** + nights sliders that update the monthly figure live.
- **`TiltCard.tsx`**, **`Accordion.tsx`** — host hero tilt cards, FAQ accordion.

### Shared libs
- **`lib/wizard.ts`** — mirrored listing data (PLACE_TYPES, PLACE_KINDS, AMENITY_OPTIONS,
  HIGHLIGHTS, DISCOUNT_OPTIONS, SAFETY_OPTIONS, MIN_PHOTOS).
- **`lib/wishlist.ts`** — localStorage wishlist store + `useWishlist(id)` hook (module
  store + subscribers so every card stays in sync; mirrors the app's `useFavorite`).
- **`lib/currency.ts`** — 20 currencies, `DEFAULT_CURRENCY='USD'`, `detectCurrency()`
  from `navigator` locale → region → currency.
- **`lib/googleMaps.ts`** — singleton `loadGoogleMaps()` (injects the Maps JS API once).
- **`lib/categories.ts`, `lib/destinations.ts`, `lib/stories.ts`** — curated home data.

---

## 7. Google Maps

- Loaded via `lib/googleMaps.ts` (`loadGoogleMaps()` singleton; key from
  `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, falling back to the same public key the apps ship in
  `user/app.json`).
- **Hybrid/satellite** default with map-type control (`roadmap/hybrid/satellite`).
- Used in: `SearchMap` (results, custom price-pill `OverlayView`), `MapSearch` (radius
  search + draggable pin + circle), `StayLocationMap` (detail area circle). **Leaflet is
  no longer used.**

---

## 8. Global / internationalisation

- **Currency auto-detects** from the visitor's locale (`detectCurrency()` →
  `PrefsProvider` on first load, unless a stored choice exists). 20 currencies; **USD**
  neutral default. Region→currency table incl. Eurozone.
- Copy is **region-neutral** ("Every bit your guests pay is yours", not "rupee");
  illustrative host prices use `<Price>` so they render in the viewer's currency.
- **Languages:** English active; others are listed but inactive (i18n seam for later — no
  translation layer yet).

---

## 9. Verification checklist (run before shipping)

```bash
cd web

# 1. Types compile
npx tsc --noEmit            # expect exit 0

# 2. CSS braces balanced
awk '{o+=gsub(/{/,"{"); c+=gsub(/}/,"}")} END{print o"/"c}' app/globals.css

# 3. Routes return 200 (dev server on :3000, backend on :4000)
sid=$(curl -s http://localhost:4000/v1/search | grep -oE '"id":"[^"]+"' | head -1 | sed 's/"id":"//;s/"//')
for p in / /search /map /host "/stay/$sid"; do
  echo "$p -> $(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000$p)"
done

# 4. CONFIDENTIALITY — guest pages must be clean
for p in / /search "/stay/$sid"; do
  curl -s "http://localhost:3000$p" \
    | grep -oiE 'keep 100%|commission|payout|host keeps|0% .*fee' | sort -u
done   # expect NO output
```

Also manually: search dropdown + calendar open/close; category pills; carousels scroll;
sections rise-in; reduced-motion off; 720/860px breakpoints; currency switch live;
wishlist heart persists; gallery lightbox; amenities modal; sticky search + booking.

---

## 10. Known limitations & deferred work

- **Seed listings have single photos** → the card carousel and "Show all photos" only
  appear once a listing has >1 image (wizard listings add 6+). Code is correct; data is
  thin.
- **Reviews** show a summary only — the backend returns `ratingAvg`/`ratingCount` but **no
  per-review text**, so we intentionally do not fabricate authored reviews.
- **`next/image` not adopted** — needs `images.remotePatterns` config for Unsplash + the
  backend/Supabase host before swapping `<img>` (risk on live: a missed domain breaks
  images). Currently raw `<img loading="lazy">`.
- **Currency rates are static** in `lib/currency.ts` — swap for a live feed later.
- **Dark mode** not implemented on the website (apps have it).

---

## 11. Backlog (design audit — pick to build next)

Grounded in the Airbnb 2025 references + the apps. Status: ✅ done · ⬜ pending.

- ✅ Card image carousel · ✅ functional wishlist · ✅ "+ taxes" pricing
- ✅ Split search + map · ✅ filter bar + result count · ✅ pagination
- ✅ Gallery lightbox · ✅ reviews summary · ✅ amenities modal · ✅ host block
- ✅ Sticky booking widget · ✅ price breakdown · ✅ Google Maps everywhere
- ✅ Host 3-phase wizard · ✅ earnings price-sweep · ✅ dark footer + newsletter
- ✅ Global currency detection · ✅ solid-line icons · ✅ route-aware header
- ⬜ **All-in "total for stay"** on cards/detail when dates selected (total-price default)
- ⬜ **Skeleton shimmer** loaders (search grid, carousels, detail)
- ⬜ **Recently-viewed** rail on home · ⬜ **wishlist page** at `/saved`
- ⬜ **In-page anchor tabs** on detail (Photos · Amenities · Reviews · Location)
- ⬜ **Mobile sticky booking bottom-bar**
- ⬜ **`next/image`** adoption · ⬜ **language translation** layer · ⬜ **dark mode**
- ⬜ "Search as I move the map" toggle · ⬜ map "viewed pin" grey state
- ⬜ Live listing **preview pane** + **map location picker** in the wizard

---

## 12. Change-log

| Commit | Summary |
|---|---|
| `8eba3bd` | Premium Airbnb-caliber rebuild of the public website (guest + host) — all of the above. |
| `a915daa` | Brand-exact pass: buttons = apps' STAYON_GRADIENT (#0D9488→#6366F1); surfaces = teal family; working i18n (en/hi/fr/es); left/right side reveals; host owner facts strip; route-aware header. |

_When you make further changes, add a row here and update §11 statuses._
