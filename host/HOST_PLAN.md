# StayOn Host — Build & Design Plan

How we'll **design** and **build** the host app. It mirrors the guest app
(`d:/Stayon/user`) in structure and visuals, reuses its design system, and ships in
small, verifiable milestones. Pair this with `HOST_REQUIREMENTS.md` (the *what*) — this
doc is the *how*.

---

## PART A — DESIGN PLAN

### A1. Design principles (same bar as the guest app)
- **Identical visual identity** — reuse the exact tokens: teal `#0D9488`, gradient
  `STAYON_GRADIENT = ['#0D9488','#6366F1']`, system font, 4px spacing grid, the radius
  & shadow scales. Copy `constants/` verbatim from the guest app.
- **40 / 30 / 20 / 10** — spacing & layout 40%, typography 30%, imagery 20%, colour 10%.
- **Dark mode everywhere** — `useTheme()` + `makeStyles(colors)`; never hardcode colour.
- **Ionicons only, no emojis.** Prices authored in **USD**, rendered via
  `useCurrency().format()`.
- **One `STAYON_GRADIENT` CTA per screen** (List property / Accept / Publish / Payout).
- **Premium, calm, data-clear** — the host app leans more *dashboard* than *catalog*:
  big readable numbers, clean cards, generous white space.

### A2. Information architecture (navigation)
5 bottom tabs + a stack for detail/flows:

| Tab | Purpose |
|-----|---------|
| **Today** | Dashboard — next check-ins, new requests/messages, earnings snapshot, "Ask the Assistant" |
| **Reservations** | Upcoming / current / past bookings; accept/decline; detail |
| **Calendar** | Availability + pricing (open/block, daily/weekend/seasonal, min-nights) |
| **Inbox** | Guest↔host messages + notifications |
| **Profile** | Listings, earnings/payouts, reviews, settings, KYC, support |

Stack screens: onboarding/KYC/payout, listing create/edit/photos/pricing, reservation
detail/check-in/checkout/review, payouts, host assistant, settings cluster, auth.

### A3. Screen design language (how each screen looks)
- **Headers** → shared `ScreenHeader` (back chevron + title + right action).
- **Lists/settings** → `SettingsRow` + `SettingsSection` (cards, dividers, chevrons/switches).
- **Empty states** → `EmptyState` (icon halo + copy + CTA) for no listings/reservations/messages.
- **Sheets/modals** → `BottomSheet` for pickers (dates, amenities, filters).
- **Buttons** → `GradientButton` (primary), `DashedButton` (add/secondary).
- **Chips/tags** → `Chip` (amenities, filters, statuses). **Ratings** → `RatingStars`.
  **Money** → `PriceTag`. **Loading** → `Skeleton`. **Toasts** → `Toast`.
- **Images** → `ProgressiveImage` (blur-up) for photos/avatars.
- **Maps** → `PropertyMapWeb` with `pinStyle="location"` for a listing's location.

### A4. New host-specific components (built fresh, same tokens)
- **`StatCard`** — a labelled metric (earnings, occupancy, nights) with trend arrow.
- **`EarningsChart`** — simple bar/line revenue chart (lightweight, token-coloured).
- **`ListingCard`** — host view of a property (status, nightly rate, next check-in, reviews).
- **`ReservationCard`** — guest name, dates, guests, total, status badge, quick actions.
- **`CalendarGrid`** — month grid: available / booked / blocked / past, tap to edit.
- **`StepWizard`** — progress header + next/back for the listing-create & onboarding flows.
- **`StatusBadge`** — Pending / Confirmed / Completed / Cancelled (semantic colours).

### A5. Brand touches
- Boot loader reused (web sweeping bar) with brand label "StayOn Host".
- Same Splash → Onboarding gate, but onboarding speaks to *hosts* ("Start earning").
- Host accent stays teal/indigo; status colours: success (confirmed), warning
  (pending), error (cancelled/declined) from the existing palette.

---

## PART B — BUILD PLAN

### B0. Tech setup (Milestone 0 — Scaffold)
- New Expo **SDK 56** app at `d:/Stayon/host` mirroring `user/` (same deps).
- **Copy the shared foundation** from the guest app:
  `constants/`, `contexts/` (Theme, Currency, Auth + add `role`), `components/common/`,
  `GradientButton`, `PropertyMapWeb`, `BottomSheet`, `hooks/useHaptics`,
  `utils/{color,distance,currency,animations,confirm}`, `bootLoader.ts`.
- `App.tsx` + `index.ts` with the Splash → (Host)Onboarding → Main gate.
- `navigation/MainNavigator.tsx` with the 5 host tabs (empty screens first).
- **Acceptance:** app boots on web, tabs switch, `npx tsc --noEmit` clean, web bundle 200.

### B1. Data layer first (mock, AsyncStorage)
Before screens, define the local stores so UI binds to real shapes:
`data/listings.ts`, `data/reservations.ts`, `data/messages.ts`, `data/payouts.ts`,
`data/reviews.ts` — each with seed data + get/set helpers (same pattern as the guest
app's `data/*`). Add `utils/hostFilters.ts` and `utils/payout.ts`.

### B2. Milestones (each ends green: `tsc` clean + web bundle 200 + a screenshot)

| M | Deliverable | Screens / pieces |
|---|-------------|------------------|
| **M0** | Scaffold & shared foundation | tabs shell, theme, boot, onboarding gate |
| **M1** | Auth & onboarding + KYC | Auth/OTP/AccountCreation (role=host), HostOnboarding wizard, IdentityVerification, PayoutSetup |
| **M2** | Listings | ListingCard, ListingCreate (StepWizard), ListingDetails, ListingPhotos, Pricing |
| **M3** | Calendar & pricing rules | CalendarGrid, block/open, daily/weekend/seasonal, min-nights, instant-book |
| **M4** | Reservations & booking flow | Today dashboard, Reservations list, ReservationDetail (accept/decline), StatusBadge |
| **M5** | Check-in / checkout | CheckInPrep (checklist + access code/address), CheckOut + DamageReport |
| **M6** | Inbox & notifications | Inbox, Chat thread, host notification types + NotificationCenter |
| **M7** | Reviews | host→guest review after checkout, respond to guest reviews |
| **M8** | Earnings & payouts | StatCard, EarningsChart, Earnings dashboard, Payouts, PayoutHistory, TaxCenter |
| **M9** | Host Assistant (AI, advisory) | HostAssistant chat over reservations/payouts/reviews — answers/suggests, never acts |
| **M10** | Support & polish | Help center, Resolution center, settings cluster, empty states, dark-mode pass |

### B3. Working method (same as the guest app)
- Build screen-by-screen; after each change run `npx tsc --noEmit` (must be 0 errors).
- Verify on web (`expo start --web`, bundle 200) and review by screenshot, then iterate.
- Reuse primitives before building new UI; keep the 4px grid + type tokens.
- Keep prices USD-authored; everything theme-aware for dark mode.

### B4. Sharing strategy
- **Now:** copy shared code into `host/src` (fastest path to a running app).
- **Later (with a backend):** extract `shared/` packages (`@stayon/design-tokens`,
  `@stayon/ui`, `@stayon/utils`) consumed by both `user/` and `host/`.

### B5. What's reused vs new (summary)
- **Reuse:** all design tokens, Theme/Currency/Auth contexts, the 11 common primitives,
  GradientButton, PropertyMapWeb, BottomSheet, useHaptics, color/distance/currency/
  animations/confirm utils, bootLoader, Auth/OTP/AccountCreation/IdentityVerification.
- **New (host):** the 5-tab navigator, all host screens, the host data stores &
  services, and the host components (StatCard, EarningsChart, ListingCard,
  ReservationCard, CalendarGrid, StepWizard, StatusBadge).

### B6. Definition of done (per milestone)
1. `npx tsc --noEmit` → 0 errors. 2. Web bundle serves 200. 3. Dark + light both look
right. 4. Empty/loading states present. 5. No hardcoded colours, no emojis.

---

## Suggested first action
**M0 — Scaffold:** stand up `host/src` with the copied foundation, the 5 tabs, and the
onboarding gate, so we have a running host shell to build onto. Then M1 (auth/KYC) and
M2 (listings).
