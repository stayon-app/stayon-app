# StayOn — HOST App Requirements

Everything the **host side** needs, derived by reading the entire guest app
(`d:/Stayon/user/src`) line by line — from a listing appearing on the guest's home
screen, through the booking request → confirmation → **check‑in** → **checkout**, to
the **host reviewing the guest** afterwards. Every guest-facing detail is mapped here
to a host capability, data field, or screen.

> This folder (`d:/Stayon/host/`) is where **all host-related work lives**. Build the
> host app at `d:/Stayon/host/` mirroring the guest app's structure (`src/...`).

Citations look like `PropertyDetailsScreen.tsx:567` and refer to files under
`d:/Stayon/user/src/`.

---

## 0. The lifecycle (host's job at each stage)

```
LISTING                         BOOKING                         STAY                 AFTER
─────────                       ─────────                       ─────                ─────
Create & manage a listing  →  Receive request / instant book  →  Check‑in  →  Checkout  →  Review the guest
(photos, price, rules,         Accept or decline (24h)            give access  inspect &    + respond to the
 amenities, availability)      Message the guest                  during‑stay  damage       guest's review of
                               Confirm → address revealed         support      report        the listing
                                                                                            Get paid (payout)
```

Each stage below lists the **data**, **host actions**, and **screens** required.

---

## 1. Listing — what a host must provide

A listing is the source of everything the guest sees. The complete field set
(derived from `types/Property.ts`, `data/stays.ts`, `PropertyCard.tsx`,
`PropertyDetailsScreen.tsx`):

### Host‑entered fields
- **Basics** — `title`, `type` (Entire unit / Loft / Apartment / Cabin / Villa…),
  `description` (short), `spaceDescription` (long "About the space"),
  `registrationNumber` (local STR licence). `Property.ts:93,94,126,127,130`
- **Location** — `neighborhood`, `city`, `country`, `latitude`, `longitude`,
  `location.description`, plus the **exact `address`** (hidden until a booking is
  confirmed). `Property.ts:58‑66`, `PropertyDetailsScreen.tsx:584`
- **Capacity** — `guests` (max), `bedrooms`, `beds`, `bathrooms`. `stays.ts:17‑19`,
  `Property.ts:120‑123`
- **Pricing (USD)** — `price` (nightly), `cleaningFee` (optional). Currency display is
  handled by `useCurrency()`. `stays.ts:11`, `Property.ts:100‑104`
- **Photos** — `images[]` each `{ uri, caption }`, plus a hero `image`. High‑res
  (~1600px). `Property.ts:114`, `PropertyDetailsScreen.tsx:488‑502`, `stays.ts:28`
- **Amenities** — from a master list of ~25 (`wifi, kitchen, pool, hottub, ac,
  heating, washer, dryer, parking, evcharger, gym, workspace, tv, fireplace, bbq,
  beach, pets, selfcheckin, crib, breakfast, coffee, hairdryer, smokealarm, firstaid,
  coalarm, extinguisher`), grouped `basics | features | safety | location`.
  `Property.ts:301‑328`, `stays.ts:21`
- **Vibes/tags** (power discovery) — `romantic, beach, city, mountain, luxury, budget,
  family, pet, wellness, adventure, ski, lake, nature, work`. `stays.ts:20`,
  `HomeScreen.tsx` category matchers
- **House rules & check‑in** — `checkInTime`, `checkOutTime`, `checkInMethod`
  (Self check‑in / Key pickup / Host greeting / Reception), `houseRules[]`
  `{icon,title,description}`. `Property.ts:139‑142`, `PropertyDetailsScreen.tsx:567,974`
- **Cancellation** — `cancellationPolicy` (Flexible | Moderate | Strict) +
  `cancellationDetails`. `Property.ts:143‑144`, `PropertyDetailsScreen.tsx:816,1016`
- **Safety** — `safetyFeatures[]` `{label, available, notes}`. `Property.ts:147`,
  `PropertyDetailsScreen.tsx:993`
- **Availability & booking** — `minNights`, `maxNights?`, `instantBook` (bool).
  `Property.ts:151‑153`, `stays.ts:24`

### Computed (NOT host‑entered) — the host *earns* these
- `rating`, `reviewCount`, `reviews[]`, `reviewBreakdown`, `reviewCategories` — from
  guest reviews. `Property.ts:107‑111`
- `taxes` — auto per location via `utils/tax.ts` `getTaxBreakdown(location, subtotal)`.
- `cleaningFee` shown to guest = **12% of subtotal** in the current model
  (`BookingScreen.tsx:158`) — decide whether host sets a flat fee or platform derives it.
- `isGuestFavorite`, `host.isSuperhost`, `host.verified`, `badge` — platform badges
  from performance. `Property.ts:55,157`, `PropertyDetailsScreen.tsx:342‑360`
- `host.responseRate`, `host.responseTime`, `host.hostingSince`, `host.rating`,
  `host.reviewCount` — aggregated from activity. `Property.ts:46‑55`,
  `PropertyDetailsScreen.tsx:719‑761`

### Host listing-editor interface (target shape)
```ts
interface HostListingDraft {
  id?: string;
  title: string; type: string; description: string; spaceDescription?: string;
  location: { neighborhood: string; city: string; country: string;
              latitude: number; longitude: number; description?: string; address?: string };
  guests: number; bedrooms: number; beds: number; bathrooms: number;
  price: number; cleaningFee?: number; currency?: 'USD';
  images: { uri: string; caption?: string }[];
  amenities: { id: string; label: string; category: string; available: boolean }[];
  vibes?: string[];
  checkInTime: string; checkOutTime: string; checkInMethod: string;
  houseRules: { id: string; icon: string; title: string; description: string }[];
  cancellationPolicy: 'Flexible' | 'Moderate' | 'Strict'; cancellationDetails: string;
  safetyFeatures?: { id: string; label: string; available: boolean; notes?: string }[];
  registrationNumber?: string;
  minNights: number; maxNights?: number; instantBook: boolean;
}
```

### Listing-management screens
`ListingCreate` (wizard: Basics → Location → Capacity → Photos → Amenities → Pricing →
Rules → Safety → Preview), `ListingDetails` (view/edit), `ListingPhotos` (upload,
reorder, captions, set hero), `Pricing`, `Availability/Calendar`, `ListingReviews`.

---

## 2. Booking lifecycle — host actions

### Reservation data model (mirror of the guest booking)
`id`/`confirmationCode` (e.g. `STY‑A8K2M1`), `property`, `location`, **`address`**
(revealed only after confirmation), `checkIn`, `checkOut`, `nights`, `guests`,
`subtotal`, `cleaningFee`, `taxes`, `total`, `status` (`upcoming|completed|cancelled`,
plus host‑side `pending` for requests), `card` (last4), `createdAt`, `image`,
`cancelReason`, `refundAmount`, **guest `message` to host**, **type** `instant|request`.
`data/bookings.ts`, `BookingScreen.tsx:150‑162,286‑297`, `BookingConfirmationScreen.tsx`

Price math (`BookingScreen.tsx:153‑162`): `subtotal = price × nights`;
`cleaningFee = round(subtotal × 0.12)`; `taxes = getTaxBreakdown(location, subtotal)`;
`discount = promo ? round(subtotal × 0.10) : 0`; `total = subtotal + cleaningFee + taxes − discount`.

### Stage A — Request received (non‑instant)
Guest taps "Request to book" when `instantBook=false` (`BookingScreen.tsx:319`). Host
must: get notified (guest, dates, nights, guests, **message**, total, code), and
**Accept** (→ confirmed, guest charged, address revealed) or **Decline** (→ not
charged) within 24h.

### Stage B — Instant book
`instantBook=true` → auto‑confirmed and charged. Host is notified; optional auto
welcome/check‑in message.

### Stage C — Reservations dashboard
Upcoming / current / past, sorted by check‑in. Per reservation: image, title,
location, address (post‑confirm), dates, nights, guests, total, code, guest name;
quick actions **Message**, **Receipt**, **Cancel** (within policy). Mirrors
`TripsScreen.tsx` from the host side, incl. the essentials strip
(`TripsScreen.tsx:819‑865`).

### Stage D — Check‑in (host supplies access)
24h before, host provides: **exact address + directions**, **check‑in method**
(smart‑lock code / key pickup / greeting / reception), parking & entry, Wi‑Fi,
emergency contacts, and a house‑rules reminder. Guest must agree to house rules at
checkout (`BookingScreen.tsx:787‑799`). Default arrival after `checkInTime`, checkout
before `checkOutTime`.

### Stage E — During stay
Monitor & reply to messages, provide support (local tips, early/late checkout),
prepare for checkout.

### Stage F — Checkout
Inspect property, document **damage** (photos), confirm departure; booking →
`completed` which opens the review window.

### Stage G — Host reviews the guest  ← (the "review after checkout")
After checkout the host writes a **host→guest review** (publicly shown on the guest's
profile — see `ViewProfileScreen.tsx:21‑40` `HOST_REVIEWS`). Proposed fields:
`overall`, `communication`, `cleanliness`, `ruleFollowing`, `recommend` (bool),
`text`, optional evidence photos. Host can also **respond** to the guest's review of
the listing.

### Calendar & availability + pricing rules
Open/block dates, view the booking schedule, enforce `minNights`, instant‑book toggle.
Guest date picker reads availability (`BookingScreen.tsx:869‑892`). **Pricing
controls:** base **daily** rate, **weekend** rate, **seasonal/holiday** rates, and
**discounts** (weekly, monthly, promo codes — guest promo flow at
`BookingScreen.tsx` discount logic). All authored in USD.

### Payouts
**StayOn charges NO platform fee — to the guest OR the host.** The guest pays the
nightly rate + cleaning fee + taxes only; the host keeps **100%**: `payout =
(price × nights) + cleaningFee`. **Taxes pass through** (host remits, doesn't keep).
Host needs a payout account, payout history (released ~24h after check‑in), refund
handling on cancellation (`refund = total − taxes`), and tax docs.

### Cancellation & resolution
Policies Flexible/Moderate/Strict; guest cancel flow captures a reason and shows the
refund (`TripsScreen.tsx:262‑309`); host‑side damage claims / disputes via a
resolution center.

### Booking-lifecycle screens
`Today` (dashboard), `Reservations`, `ReservationDetail` (accept/decline, guest info,
message, check‑in/out actions, review guest), `CheckInPrep` (checklist + access code +
send), `CheckOut/DamageReport`, `Calendar`, `Payouts/Earnings`, `PayoutHistory`,
`PropertySettings` (instant‑book, min nights, rules, check‑in method, policy).

---

## 3. Messaging, reviews, notifications, support

### Host inbox
Conversation: `id`, guest `{id,name,avatar}`, listing/booking context, `unread`,
`online`, `lastMessage`, `timestamp`, `messages[] {id,text,sender:'host'|'guest',ts}`.
`MessagesScreen.tsx:98‑126`, `ChatScreen.tsx:21‑34`. Inbox = thread list + chat view +
"keep comms on StayOn" hint + quick‑reply templates.

### Reviews — both directions
- **Guest → listing** (`WriteReviewScreen.tsx`, `data/reviews.ts`): categories
  cleanliness/accuracy/communication/location/check‑in/value, overall, recommend, text.
  Host **views and responds**; response rate/time shown to guests
  (`PropertyDetailsScreen.tsx:759‑761`).
- **Host → guest** (post‑checkout): the fields in Stage G; shown on the guest profile.

### Host profile & trust (shown to guests)
`name, avatar, isSuperhost, verified, responseRate, responseTime, hostingSince,
joined, reviewCount, rating, bio (work/skill), languages`.
`PropertyDetailsScreen.tsx:349‑407,688‑773`.

### Host notifications (types)
`booking_request, booking_confirmed, booking_cancelled, guest_message,
review_received, review_reminder (review your guest), payout_sent, payout_failed,
checkin_today, checkout_reminder, dispute_filed, listing_flagged,
superhost_status_changed`. Structure & filters mirror `NotificationCenterScreen.tsx`.

### Support & resolution
Host help center (live chat / call / email / 24‑7 emergency) with host FAQs (bookings,
payouts, reviews, listing, guests, property, account, superhost), and a host
Resolution Center for damage claims & disputes (case: type, bookingId, guestId,
description, photos[], status). `CustomerSupportScreen.tsx`, `ResolutionCenterScreen.tsx`.

### Host Assistant — AI insights (ADVISORY ONLY)
A chat/insights helper that lets the host *understand* their numbers — it **answers
and explains, it does not act**. It never accepts/declines bookings, changes prices,
edits listings, or messages guests on the host's behalf. Think of it as a read‑only
analyst over the host's own data.

**What it answers (read‑only over reservations/payouts/reviews/calendar):**
- Earnings — "How much did I make this month / this year?", "What's my next payout and
  when?", "Earnings after the platform fee?", "Cleaning fees vs taxes breakdown".
- Statistics — occupancy rate, nights booked, average nightly rate, average stay
  length, repeat‑guest rate, cancellation rate, response rate/time.
- Outcomes & trends — best/slowest months, weekend vs weekday performance, which
  listing earns most, month‑over‑month revenue, rating trend.
- Light, non‑binding **suggestions** the host chooses to act on themselves — e.g.
  "your weekends sell out — you *could* raise the weekend rate", "blocking these dates
  costs ~$X". It only suggests; the host makes every change manually.

**Hard boundaries (must NOT do):** no booking accept/decline, no price/calendar edits,
no guest messaging, no payouts — purely informational. Mirrors the guest StayBot
pattern (`services/stayBotEngine.ts`) but scoped to **analytics/Q&A**, computed from
the host's local `reservations` / `payouts` / `reviews` data (no fabricated numbers).

**Screen:** `HostAssistant` (chat UI reusing the guest bot's bubble/quick‑reply
components) + small insight cards surfaced on the **Today** and **Earnings** screens
("Ask about your earnings").

---

## 4. Platform & shared code (reuse the guest foundation)

### Reuse as‑is (copy now; consider a `shared/` package later)
- **Contexts**: `ThemeContext` (light/dark, `useTheme`), `CurrencyContext`
  (`format()`), `AuthContext` (**add `role: 'guest'|'host'`**).
- **Constants**: `colors, fonts (textStyles, letterSpacing), spacing, animations,
  countries`.
- **Primitives** (`components/common/`): `ScreenHeader, EmptyState,
  SettingsRow/Section, Chip, RatingStars, PriceTag, DashedButton, BottomSheet,
  Skeleton, Toast, ProgressiveImage`. Plus `GradientButton` (`STAYON_GRADIENT`),
  `PropertyMapWeb`, `PremiumFilterSheet`.
- **Hooks**: `useHaptics` (and optionally `useLocationDetection`).
- **Utils**: `color (withOpacity), distance, currency, animations, confirm`; adapt
  `stayFilters` → `hostFilters`; add `payout`.
- **Boot**: same `bootLoader.ts` (web loading screen) + Splash/Onboarding/Main gate —
  route hosts to **HostOnboarding**.

### Host navigation (its own tabs)
`Today` · `Reservations` · `Calendar` · `Inbox` · `Profile` — plus the stack screens
listed in §1–§3. (Guest uses Home/Explore/StayBot/Trips/Profile; host differs.)

### Host auth & onboarding
Reuse `Auth/OTP/AccountCreation/IdentityVerification` with `role:'host'`; add
**HostOnboarding** (become‑a‑host → property → photos → pricing → availability →
**payout setup** → verify). Extend identity verification with a payout/bank step.

### Conventions (same as guest)
Dark mode via `useTheme()` + `makeStyles(colors)` (never static colors); **Ionicons
only, no emojis**; prices authored in **USD**, rendered via `useCurrency().format()`;
4px spacing grid + type tokens; one `STAYON_GRADIENT` CTA per screen; the 40/30/20/10
premium bar.

### Recommended structure
```
d:/Stayon/host/
  src/
    contexts/      ← copy ThemeContext, CurrencyContext, AuthContext(+role)
    constants/     ← copy colors, fonts, spacing, animations, countries
    components/
      common/      ← copy the 11 shared primitives
      ListingCard.tsx, ReservationCard.tsx, CalendarGrid.tsx   ← host-specific
    hooks/         ← useHaptics (copy) + useListings, useReservations
    utils/         ← color, distance, currency, animations, confirm (copy)
                     hostFilters.ts, payout.ts (new)
    data/          ← listings, reservations, messages, payouts, reviews (host)
    services/      ← listingService, reservationService, payoutService (backend later)
    screens/       ← Today, Reservations, Calendar, Inbox, Profile,
                     ListingCreate/Details/Photos/Reviews, Pricing,
                     ReservationDetail, CheckInPrep, CheckOut, ReservationMessages,
                     HostOnboarding, PayoutSetup/History, settings cluster
    navigation/    ← MainNavigator (host tabs + stack)
    bootLoader.ts  ← copy (brand "StayOn Host")
  App.tsx, index.ts, app.json, package.json
```

---

## 5. Full host screen list (build target)

**Core tabs:** Today, Reservations, Calendar, Inbox, Profile.
**Listings:** ListingCreate, ListingDetails, ListingPhotos, Pricing, ListingReviews,
PropertySettings.
**Reservations:** ReservationDetail, CheckInPrep, CheckOut/DamageReport,
ReservationMessages (or reuse Chat).
**Money:** Payouts/Earnings, PayoutSetup (bank), PayoutHistory, TaxCenter.
**AI (advisory only):** HostAssistant — earnings/stats/outcomes Q&A; no actions.
**Reviews:** GuestReview (host→guest), ReviewsInbox (respond to guest reviews).
**Account/Auth:** Auth, OTP, AccountCreation, HostOnboarding, IdentityVerification,
AccountSettings, NotificationSettings, LanguageCurrency, PrivacySharing, Support,
ResolutionCenter, NotificationCenter.

---

## 6. Build order (suggested)

1. **Scaffold** — copy shared contexts/constants/primitives/utils + bootLoader; set up
   host `MainNavigator` (5 tabs) and `App.tsx` with the HostOnboarding gate.
2. **Listings** — data model + ListingCreate wizard + ListingDetails/Photos/Pricing.
3. **Reservations** — Today + Reservations + ReservationDetail (accept/decline,
   message, check‑in/out), with mock `data/reservations.ts`.
4. **Calendar & availability** — block dates, pricing, min‑nights, instant‑book.
5. **Inbox** — reuse messaging primitives for guest↔host threads.
6. **Reviews** — host→guest review after checkout + respond to guest reviews.
7. **Payouts** — earnings, payout account, history; commission/refund/tax model.
8. **Notifications & support** — host notification types + help/resolution center.
9. **Host Assistant (AI, advisory)** — read-only earnings/stats/outcomes Q&A over the
   host's data; suggestions only, never acts. Build last (needs reservations + payouts).

> Keep `npx tsc --noEmit` clean after each step, exactly like the guest app.
