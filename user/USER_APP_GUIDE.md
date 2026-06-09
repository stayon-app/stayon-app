# StayOn — Guest (User) App Guide

The **guest-facing** StayOn app: discover stays, experiences and things to do, book
them, manage trips, and chat with an AI concierge. This document covers the whole
user side — architecture, screens, data, the design system, and the dynamic
location behaviour — so anyone can pick it up quickly.

> Scope: this is the **guest** app at `d:/Stayon/user`. Host and operations apps
> are separate. Prices are authored in **USD** and rendered in the user's currency.

---

## 1. Tech stack

| Area | Choice |
|------|--------|
| Runtime | **Expo SDK 56** + React Native + **TypeScript** |
| Entry | `index.ts` → `App.tsx` |
| Navigation | `@react-navigation/native` — native-stack + bottom-tabs |
| State / storage | React state + **AsyncStorage** (no backend yet; all data is local/mock) |
| Location | `expo-location` (GPS + reverse geocode) |
| Maps | `react-native-maps` on native (**Apple Maps on iOS**, Google on Android); **Leaflet/OpenStreetMap** on web |
| Places search | Google Places (live worldwide autocomplete) + a local curated index |
| Media | `expo-image`, `expo-linear-gradient`, `@expo/vector-icons` (**Ionicons only — no emojis**) |
| Dates | `dayjs` |

### Run it
```bash
cd d:/Stayon/user
npm install
npx expo start          # then press w / i / a, or scan the QR
# or directly:
npx expo start --web    # browser (http://localhost:8081)
```
Type-check (no emit): `npx tsc --noEmit`.

---

## 2. App boot sequence

```
index.ts
 ├─ src/bootLoader.ts   ← injects a branded web loading screen (sweeping bar) ASAP
 ├─ react-native-gesture-handler
 └─ App.tsx
      Splash  →  Onboarding (first run only)  →  MainNavigator
      Providers: ThemeProvider › CurrencyProvider › AuthProvider
      Top-level <ErrorBoundary> shows a recoverable error screen on crashes
```
- **`bootLoader.ts`** — pure DOM/CSS spinner shown on web before React paints (the
  ~10 MB bundle takes a moment); removed via `hideBootLoader()` once `App` mounts.
  No-op on native (the animated `SplashScreen` covers that).

---

## 3. Navigation map

Bottom tabs (`MainNavigator.tsx`):

| Tab | Screen |
|-----|--------|
| Home | `HomeScreen` |
| Explore | `ExploreScreen` |
| StayBot (center) | `StayBotScreen` |
| Trips | `TripsScreen` |
| Profile | `ProfileScreen` |

Stack screens pushed over the tabs (selection): `PropertyDetails`, `Booking`,
`BookingConfirmation`, `MapExplore`, `MapSearch`, `NearbyStays`, `DestinationDetails`,
`ActivityDetails`, `PlaceDetails`, `BlogPost`, `Offers`, `Wishlist`, `StayWallet`,
`Chat`, `Messages`, `NotificationCenter`, `CustomerSupport`, `ResolutionCenter`,
`WriteReview`, plus the Account/Settings cluster and Auth modals.

**43 screens / 21 components** total.

---

## 4. Dynamic, location-aware behaviour (core idea)

Until the user searches, **Home and Explore reflect the user's live location**;
search switches them to the requested place. Driven by
`hooks/useLocationDetection.ts` (GPS → reverse-geocode → city/region/country).

- **Home › "Nearby You"** — real stays from `BOT_STAYS` sorted by **distance** from
  live coords (`utils/distance.ts`), with "x km away" labels; "See all" → `NearbyStays`.
- **Home › "Things to Do"** — generated for the user's **city/country** (plus a few
  "explore the world" picks). No prices — inspiration only.
- **Home** also shows wanderlust rows (Popular Destinations, Curated, StayReels,
  Travel Stories) spanning **other countries**, so users discover where to go next.
- **Explore** auto-centres on the detected **city → state → country** (section titles
  like "Stay near {landmark}", "{city} homes…") until the user searches or picks a
  destination, then it follows that place. A manual pick stops the live sync.

> The curated datasets are keyed by location **name**, so this works for any city
> worldwide and swaps to real inventory the moment a backend is connected.

---

## 5. Design system

Tokens in `src/constants/`:
- **`colors.ts`** + **`ThemeContext.tsx`** — full **light/dark** palettes (`useTheme()`),
  shadow scale, and an overlay/scrim scale (`overlayLight/Medium/Strong`).
- **`fonts.ts`** — `fontSizes`, `lineHeights`, a `letterSpacing` scale, and composed
  `textStyles` (`h1–h4`, `body`, `button`, plus `eyebrow / label / link / error`).
- **`spacing.ts`** — 4px grid (`xs…5xl`), `borderRadius`, `iconSizes`.
- **`animations.ts`** — durations, easings, native spring configs, stagger delays.
- **`utils/color.ts › withOpacity(color, n)`** — theme-aware rgba from any token.

**Theming rule:** dark mode requires `useTheme()` + a `makeStyles(colors)` factory —
**never hardcode colors**. The brand CTA gradient is `STAYON_GRADIENT` (teal→indigo).

### Shared primitives (`src/components/common/`) — reuse these, don't re-roll
`ScreenHeader`, `EmptyState`, `SettingsRow` + `SettingsSection`, `Chip`,
`RatingStars`, `PriceTag`, `DashedButton`, `SeeAllCard` (image end-card for
carousels), plus `Skeleton`, `Toast`, `BottomSheet`, `ProgressiveImage`.

Premium bar (the "40/30/20/10" rule): **40% spacing & layout, 30% typography,
20% imagery, 10% colour.**

---

## 6. Data stores (`src/data/` — all AsyncStorage-backed)

| File | Purpose |
|------|---------|
| `stays.ts` | `BOT_STAYS` — curated, tagged stay inventory (vibes, amenities, coords). Source of truth for recommendations, nearby, category counts. `botStayToProperty()` maps to the card/detail shape. |
| `destinations.ts` | Curated destination index for search suggestions. |
| `cards.ts` | Saved payment cards (the checkout wallet). |
| `wallet.ts` | StayWallet passes/tickets. |
| `wishlists.ts` | Wishlist collections + seed. |
| **`favorites.ts`** | Heart/favourite store — writes a **"Saved"** collection into wishlists; `useFavorite(stay)` hook keeps every card's heart in sync. |
| **`reviews.ts`** | Guest-written reviews; `addReview` / `getReviews` / `relativeDate`. |
| **`recentlyViewed.ts`** | Stays the guest opened (deduped, capped 12) for the Home row. |
| **`pendingBooking.ts`** | The in-progress checkout for the Home "Finish your booking" nudge. |
| `bookings.ts`, `itineraries.ts` | Trip/itinerary data. |

---

## 7. Key features & where they live

- **Search modal** (`ModernSearchModal`) — live Google Places + local matches.
  "Browse by Category" chips have **live counts** (from `BOT_STAYS` vibes) and the
  **quick filters** (Top Rated / Instant Book / Best Value / Luxury) actually flow
  through `onSearch` → Home/Explore → `MapExplore`, which filters the results.
- **Filters** (`PremiumFilterSheet`) — shared filter logic in `utils/stayFilters.ts`;
  applied on **both** Explore and Home (price, type, beds, amenities, chips).
- **Favorites → Wishlists** — heart on any card/detail persists to the **Saved**
  collection and shows in the Wishlists tab.
- **Reviews** — Write-a-Review persists and shows on the property (newest first).
- **Recently viewed** — opening a stay records it; a row appears on Home.
- **Resume booking** — reaching the Pay step saves the checkout; Home shows a
  floating "Complete your … reservation" card that reopens it (cleared on success).
- **Maps** — `PropertyMapWeb` (web). `pinStyle='price'` for **search/results**
  (₹/$ bubbles); `pinStyle='location'` for the **property detail** map (a pin
  pointing at the stay, **no price**). Native iOS = Apple Maps.
- **StayBot** (`StayBotScreen` + `services/stayBotEngine.ts`) — local NLU concierge:
  slot-fills destination/vibe/budget/guests **and dates/month/nights**, recommends
  real bookable stays, then shows a **booking summary to confirm** before checkout
  (real dates flow into the Booking screen). Optional "Smart AI" uses a pasted
  Anthropic key (`services/aiProvider.ts`); for a release, route this through a backend
  (a client-side key isn't production-safe).
- **Payments** (`BookingScreen`) — "Credit or debit card" row with an **inline
  chevron** that expands a collapsible saved-card chooser; Apple/Google/PayPal as
  radio options.
- **Currency & i18n** — `useCurrency().format()` renders USD-authored prices in the
  user's currency (India → INR, else USD); switchable in Settings.

---

## 8. Conventions (please follow)

1. **Dark mode**: `useTheme()` + `makeStyles(colors)`. No static colors.
2. **Icons**: Ionicons only. **No emojis** anywhere in UI text.
3. **Money**: author in USD; render via `useCurrency().format()`. Coverage is
   USA/UK/EU + India.
4. **Spacing/typography**: use the tokens (`spacing`, `fontSizes`, `textStyles`),
   not magic numbers.
5. **Reuse the shared primitives** in `components/common/` before building new UI.
6. After any change: `npx tsc --noEmit` must be clean.

---

## 9. Known limitations / TODO before launch

- **No backend** — auth/OTP, payments, bookings, notifications and StayBot "smart
  mode" are mock/local. Swap the `data/*` and `services/*` for real APIs; the
  location/search/filter plumbing already expects it.
- **Google Maps/Places API key** is currently embedded — **restrict it** (referrer +
  API limits) before shipping.
- **Component consolidation (deferred)**: `PropertyCardLarge`/`StayListCard` should
  fold into `PropertyCard` variants; `SearchModal` into `ModernSearchModal`. Do this
  with the screenshot-verify loop, not a blind rewrite.
- **Polish backlog**: detail-screen hero scrims + carousel dots, sticky "Book" CTA
  on activity/place details, chat bubble rhythm + typing indicator.

---

## 10. Directory cheat-sheet

```
src/
  screens/        43 screens (Home, Explore, PropertyDetails, Booking, StayBot, …)
  components/     cards, hero, search/filter modals, SeeAllCard, …
    common/       shared primitives (ScreenHeader, EmptyState, SettingsRow, Chip, …)
  navigation/     MainNavigator.tsx (tabs + stack)
  contexts/       Theme, Currency, Auth
  hooks/          useLocationDetection, useHaptics, useExploreData
  data/           local stores (stays, favorites, reviews, recentlyViewed, …)
  services/       stayBotEngine, aiProvider, places
  utils/          color, distance, stayFilters, currency, tax, animations, tripActions
  constants/      colors, fonts, spacing, animations, countries
  bootLoader.ts   web loading screen
App.tsx           providers + Splash/Onboarding/Main gate
index.ts          entry
```
