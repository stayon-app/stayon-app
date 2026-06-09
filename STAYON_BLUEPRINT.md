# StayOn — Master Blueprint (Airbnb-grade UX + Apple-grade polish)

This is the single source of truth for how StayOn looks, behaves, and what intelligence powers it.
Reference: real Airbnb app structure. Aesthetic target: Apple (clarity, depth, restraint, motion).

---

## 1. Design Language (the "feels like Apple" rules)

### Color
| Token | Light | Dark | Use |
|---|---|---|---|
| primary | #0D9488 | #14B8A6 | brand actions, active states |
| primaryPressed | #0F766E | #0D9488 | pressed buttons |
| accent (CTA) | #FB7185 | #FB7185 | one hero CTA per screen max |
| ink (text) | #0F172A | #F1F5F9 | titles |
| inkSub | #475569 | #94A3B8 | body |
| inkFaint | #94A3B8 | #475569 | captions |
| line | #ECEFF3 | #1F2E29 | hairline separators (1px) |
| surface | #FFFFFF | #141A17 | cards |
| bg | #F7F8FA | #0A0F0D | screen background |

**Rule:** one accent CTA per screen. Everything else is ink + primary. No rainbow.

### Typography (SF-style scale)
- Display 30/800 (-0.8 tracking) — hero titles
- Title 22/800 — screen titles ("Profile", "Wishlists")
- Section 19/700 — section headers
- Body 15/500 — content
- Caption 13/500 — sub-labels
- Micro 11/600 uppercase (+0.5 tracking) — overlines
**Rule:** never more than 3 sizes visible in one viewport.

### Spacing & shape
- Base unit 4. Screen padding 20. Card padding 16. Section gap 24.
- Corner radius: cards 16, sheets 24 (top only), pills 22, buttons 14, images 12.
- Hairlines 1px `line` token, never heavy borders.

### Elevation (depth, not flat)
- Card: shadow y2 blur8 opacity0.06
- Floating/sheet: y8 blur24 opacity0.18
- Pressed: scale 0.97 + reduce shadow (gives the "physical" Apple press)

### Motion (this is what sells "premium")
- Screen transitions: slide_from_right 300ms ease-out
- Sheets: spring (friction 9, tension 50)
- Press feedback: scale 0.96–0.97 spring on every tappable
- List entrance: fade + 16px rise, 60ms stagger
- Haptics: light on select, medium on confirm, success on booking
- Skeleton shimmer while loading (never spinners on content)

---

## 2. Bottom Navigation — align to Airbnb's 5

Airbnb tabs: **Explore · Wishlists · Trips · Messages · Profile**.
StayOn today: Home · Explore · StayBot · Trips · Profile.

**Recommendation:** adopt Airbnb's 5 and fold our uniques in:
```
Explore   Wishlists   Trips   Messages   Profile
```
- **StayBot** → floating AI button on Explore (bottom-right), not a tab. Cleaner, still prominent.
- **Home + Explore merge** → one "Explore" tab (search-first, like Airbnb).
- Active tab = primary color + filled icon; inactive = inkFaint + outline icon.
- Tab bar: blurred translucent background (expo-blur) over content = Apple hallmark.

---

## 3. Tab-by-Tab Spec

### 3.1 EXPLORE (search-first home)
```
┌─────────────────────────────────┐
│  ⌕  Start your search            │  ← pill, tap → search sheet
├─────────────────────────────────┤
│  🏠 Homes  ·  Experiences  ·  Services │  ← category switch (top)
├─────────────────────────────────┤
│  Continue searching for homes in     │  ← resume card (last search)
│  New York · 30–31 May · 2 guests  ▸ │
│                                      │
│  Recently viewed         →           │  ← horizontal cards w/ heart
│  [card][card][card]                  │
│                                      │
│  Based on your New York search  →    │  ← personalized row
│  [Guest favourite cards]             │
│                                      │
│  Stay near <landmark>           →    │
└─────────────────────────────────┘
        [ AI ✦ ]  ← floating StayBot
```
- Search pill opens the **destination sheet** (autocomplete already built).
- Category switch (Homes/Experiences/Services) at top, underline indicator.
- Sections: Continue searching → Recently viewed → Based on your search → Near landmark → Curated collections.
- Cards: image carousel + heart, "Guest favourite" badge, title, ★rating, $price/night, "Prices include all fees" foot note.
- Result→Map: a "Map" pill floats; map shows price pins (built).

### 3.2 WISHLISTS
```
Wishlists                         Edit
┌──────────┐  ┌──────────┐
│ 4-photo  │  │  cover   │
│ mosaic   │  │  image   │
│ Recently │  │ Vijaya.. │
│ viewed   │  │ 1 saved  │
└──────────┘  └──────────┘
┌──────────┐  ┌──────────┐
│ birthday │  │  couple  │
│ 5 saved  │  │ 7 saved  │
```
- 2-column grid, 4-image **mosaic** cover (Airbnb signature) when ≥4 saves, else single cover.
- First card always "Recently viewed · Today" (auto).
- Tap → collection detail (built). Long-press → rename/delete.
- Empty state: friendly illustration + "Create your first wishlist".

### 3.3 TRIPS
```
Trips
[Upcoming] [Past]
┌─────────────────────────────┐
│ [img]  Manhattan Loft       │
│        Jun 12–15 · Confirmed │
│        Booking STY-A8K2  ▸  │
│  [Message] [Receipt] [Cancel]│
│  🔑 Self check-in · code 24h │
└─────────────────────────────┘
```
- Empty: timeline illustration + "Build the perfect trip · Get started" (built).
- Each trip: status pill, actions (message/receipt/cancel/rebook/review), check-in banner.
- Past trips → "Write review" CTA (built).

### 3.4 MESSAGES
```
Messages                    ⌕  ⚙
[All] [Hosting] [Travelling] [Support]   ← filter chips
┌─────────────────────────────┐
│ ◉ Alex Morgan       2m  •2  │  ← avatar, online dot, unread count
│   Manhattan Loft            │
│   Your access code is 4829  │
```
- Filter chips: All / Hosting / Travelling / Support.
- Rows: avatar + online dot, name + superhost ribbon, property, last msg, time, unread badge.
- ⚙ opens "Messaging settings" sheet: Quick replies, Suggested replies, Archived, Feedback.
- Empty per-filter state: "You don't have any messages" + Show all.
- Chat room: bubbles, date dividers, quick-reply chips, "keep payments on StayOn" hint.

### 3.5 PROFILE
```
Profile                              🔔
┌─────────────────────────────┐
│        (avatar / initials)   │
│        Sai Prakash Reddy     │
│        Guest                 │
└─────────────────────────────┘
┌──────────┐  ┌──────────┐
│ Past     │  │Connections│  ← 2 feature cards w/ imagery + NEW badge
│ trips    │  │           │
└──────────┘  └──────────┘
┌─────────────────────────────┐
│ 🏠 Become a host         ▸  │
└─────────────────────────────┘
Account settings              ▸
Get help                      ▸
View profile                  ▸
Privacy                       ▸
──────────
Refer a host · Find a co-host · Legal · Log out
        [ Switch to hosting ]  ← floating pill
```
- Account Settings sub-screen: Personal info, Login & security, Privacy, Notifications, Payments, Translation, Booking permissions, Travel for work, Accessibility, Taxes. (rows w/ icon + chevron, version at bottom)
- Get help sub-screen: Help Centre, Safety issue, Report concern, Give feedback.
- StayOn uniques live here: StayCoins, Group Trip, StayServices.

---

## 4. Imagery & "3D emoji / illustrations" — honest strategy

Airbnb's suitcase / connections / host figures are **proprietary 3D illustrations** — we can't copy them. Apple's Memoji/Animoji are **Apple-only, no third-party API**. Options that are legal + look premium:

1. **Open 3D illustration sets** (recommended): use a free/licensed 3D pack (e.g., open-source "3D Casual" style, or commission). Render as static PNGs in cards like Airbnb's. → gives the exact "3D figure on a card" look.
2. **Apple-style emoji as images** via CDN (`emojicdn.elk.sh/<emoji>?style=apple`) — renders real Apple emoji as `<Image>` on every platform. Use sparingly (profile accents, empty states).
3. **Keep Ionicons** for functional UI (filters, settings, nav) — this is the clean Apple-SF-Symbols look and stays.

**Plan:** functional UI = Ionicons (done). Feature/marketing cards (Past trips, Connections, Become a host, empty states) = 3D illustration PNGs. Profile avatar = gradient-ring initials now, photo upload later.

---

## 5. AI / ML Models — what, where, how

| # | Model | What it does | Where in app | Build path |
|---|---|---|---|---|
| 1 | **Search ranking** | order results by relevance to query + user history | Explore results, map | Learning-to-rank (LightGBM) on click/booking logs; start with heuristic score |
| 2 | **Personalized recommendations** | "Based on your search", "Recently viewed" rows | Explore home | Collaborative filtering (matrix factorization) + content embeddings |
| 3 | **Destination autocomplete / geocoding** | type → places (built w/ static list) | Search sheet | Swap to Google Places / Mapbox geocoding API for worldwide |
| 4 | **Dynamic pricing / "smart price"** | suggest nightly price, "good deal" badges | Property, deals | Regression on comparable listings, seasonality, demand |
| 5 | **StayBot (LLM)** | conversational trip planning, Q&A | StayBot button | Claude API (claude-haiku for speed / sonnet for quality) w/ tool-use to search listings |
| 6 | **Review summarization + sentiment** | "Guests love the location" highlights, category scores | Property reviews | LLM summarization + sentiment classifier |
| 7 | **Image quality / moderation** | flag low-quality or unsafe listing photos | Host upload | Vision model (CLIP-style) + moderation API |
| 8 | **Fraud / trust scoring** | detect fake listings, risky bookings | Booking, payments | Gradient-boosted classifier on behavioral signals |
| 9 | **Smart filters ("Vibe" match)** | map mood → amenity/tag filters (built UI) | Vibe search | Embed listing tags; cosine match to vibe vector |
| 10 | **Demand forecasting** | "book soon, 3 viewing" live signals | Property | Time-series (Prophet/LSTM) on view/booking velocity |
| 11 | **Translation** | auto-translate messages/listings | Messages, listings | Translation API (on-device for privacy where possible) |
| 12 | **Price prediction for guests** | "prices likely to rise" nudges | Search, property | Forecast model surfaced as a badge |

**Phasing:**
- **Phase A (now, no backend):** heuristic ranking, static autocomplete, StayBot mocked.
- **Phase B (backend live):** wire #3 geocoding, #5 StayBot to Claude API, #2 recs from logged behavior.
- **Phase C (scale):** #1 ranking, #4 pricing, #6 review AI, #8 fraud, #10/#12 forecasting.

**Data to start logging now:** searches, views, hearts, bookings, dwell time, filter usage. (Everything the models need later.)

---

## 6. Interactive elements (states everywhere)
- Buttons: default / pressed (scale+darken) / disabled (faded) / loading (inline spinner) — never dead.
- Forms: inline validation, helpful errors, success confirmation.
- Feedback: skeletons on load, toast on success, alert on error, haptic on action.
- Every list: empty state (illustration + CTA), loading (skeleton), error (retry).

## 7. Accessibility & performance
- Contrast AA, accessibilityLabel/Role on all controls, keyboard/screen-reader friendly.
- expo-image with blurhash placeholders, FlashList for long lists, memoized cards.
- 60fps: animations on native driver, avoid heavy re-renders.

---

## 8. Execution Roadmap (priority order)
1. **Nav realign** → Explore/Wishlists/Trips/Messages/Profile + StayBot floating; blurred tab bar.
2. **Profile redesign** → feature cards (Past trips, Connections, Become a host) w/ 3D illustrations; Account Settings + Get Help sub-screens (match Airbnb rows).
3. **Explore redesign** → search-first, Homes/Experiences/Services switch, "Continue searching" + personalized rows.
4. **Messages** → filter chips (All/Hosting/Travelling/Support) + settings sheet.
5. **Wishlists** → 4-photo mosaic covers, "Recently viewed" auto card.
6. **Design-system pass** → tokens, motion, press states, blurred bars, skeletons app-wide.
7. **AI Phase A** → behavior logging + heuristic ranking + StayBot polish.

*Each step ships independently and keeps the app compiling.*
