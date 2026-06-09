# StayOn Host — Complete Design Specification

End-to-end visual + UX + analytics design for the host app, every screen and every
detail, using the **exact** design system of the guest app (`d:/Stayon/user`). This is
the design source of truth; pair with `HOST_REQUIREMENTS.md` (what) and `HOST_PLAN.md`
(build order).

Reference apps' look: teal→indigo brand, system font, 4px grid, soft cards, dark/light.

---

## 0. SPLASH SCREEN — "StayOn Host"

The very first frame, before anything else.

- **Background:** full-bleed brand gradient `linear-gradient(160°, #0D9488 → #0F766E →
  #4F46E5)` (the same family as `STAYON_GRADIENT`).
- **Logo lockup (centered):** the StayOn mark, then the wordmark **"StayOn"** with a
  small pill/eyebrow **"HOST"** beside or beneath it (uppercase, letter-spacing +2,
  `fontSizes.xs`, 80% white). This is what distinguishes it from the guest splash.
- **Wordmark:** white `#FFFFFF` (host uses a clean white wordmark, not the guest's
  lavender — clearer for a tool app), `fontSizes['4xl']` (36) bold, letter-spacing −0.5,
  with a subtle soft glow (`textShadow` radius ~24, brand teal at low opacity).
- **Motion:** logo scales/fades in (spring), wordmark letters stagger in (~90ms each),
  a thin indeterminate progress bar sweeps beneath (reuse the web boot-loader bar).
- **Tagline (optional, fades in last):** "Your hosting, simplified." (12px, 85% white).
- **Duration:** ~1.6–2.0s, then crossfades to Onboarding (first run) or the Today tab.
- **Web boot loader:** identical sweeping-bar loader with label **"StayOn Host"** shown
  before React paints (reuse `bootLoader.ts`, change the brand string).
- **Status bar:** light content over the dark gradient.

After splash → **Onboarding** (first run, host-voiced "Start earning with StayOn") →
**Today** dashboard.

---

## 1. VISUAL DESIGN FOCUS

### 1.1 Typography — families, weights, hierarchy, readability
- **Family:** System font (San Francisco on iOS, Roboto on Android) — same as guest.
- **Weights:** 400 regular · 500 medium · 600 semibold · 700 bold.
- **Scale (`fontSizes`):** xs 11 · sm 13 · base 15 · md 16 · lg 18 · xl 20 · 2xl 24 ·
  3xl 30 · 4xl 36 · 5xl 48. **Line-heights** paired (`lineHeights`).
- **Letter-spacing:** headings tight (−0.5/−0.3), eyebrows wide (+1/+2), body 0.
- **Composed styles (`textStyles`):** `h1–h4`, `body`, `bodyLarge/Small`, `button`,
  `caption`, `eyebrow`, `label`, `link`, `error`.
- **Host hierarchy (how we apply it):**
  - **Big metric numbers** (earnings, occupancy) → `5xl/4xl` bold, tight spacing — the
    hero of every dashboard card.
  - Screen titles → `2xl` bold (`ScreenHeader`).
  - Section headers → `xs` uppercase eyebrow (label) + content.
  - Card titles → `base/md` semibold; supporting text → `sm` regular secondary colour.
  - Numbers use **tabular alignment** (right-aligned in tables/rows) for scannability.
- **Readability:** body ≥ 15px, secondary text ≥ 13px, min contrast AA (see §1.8); never
  put long text on the gradient.

### 1.2 Color palette — primary/secondary/accent + dark/light
**Brand**
- Primary teal `#0D9488` · light `#14B8A6` · dark `#0F766E` · ultra-light `#CCFBF1` ·
  subtle `#F0FDFA`. Secondary coral `#FB7185`. Gold `#F59E0B`.
- **Signature gradient** `STAYON_GRADIENT = ['#0D9488','#6366F1']` — primary CTAs only.

**Light surfaces / text**
- bg `#FFFFFF` · secondary `#F8FAFB` · card `#FFFFFF` · border `#E5E7EB`.
- text primary `#0F172A` · secondary `#475569` · tertiary `#94A3B8` · inverse `#FFFFFF`.

**Dark mode** (via `useTheme()`)
- bg `#0A0F0D` · surface `#141A17` · card `#1A2420` · border `#1F3330`.
- primary `#14B8A6` · text `#F1F5F9` · secondary `#94A3B8`.

**Semantic / status** (booking states & analytics)
- success/confirmed `#14B8A6` · warning/pending `#F59E0B` · error/cancelled `#EF4444`
  · info `#06B6D4`.
- **Chart palette** (consistent, colour-blind-aware): teal `#0D9488`, indigo `#6366F1`,
  amber `#F59E0B`, coral `#FB7185`, cyan `#06B6D4`, slate `#94A3B8`. Use **teal as the
  primary series**; grey for "available/idle"; amber for "pending"; red for "cancelled".
- **Rule:** never hardcode — pull from `useTheme().colors`; derive tints with
  `withOpacity(color, n)`.

### 1.3 Layout structure — dashboard nav, cards/grid, responsive
- **Navigation:** 5 bottom tabs — **Today · Reservations · Calendar · Inbox · Profile**
  (custom tab bar like the guest app; active = teal + dot, inactive = slate). Detail &
  flows push on a native stack.
- **Today dashboard** = vertical scroll of **cards**:
  1) Greeting + date, 2) **Earnings snapshot** (StatCard row), 3) **Next check-ins**
  list, 4) **Action needed** (pending requests / unread), 5) **Mini insight** + "Ask the
  Assistant", 6) Occupancy mini-bar.
- **Grid system:** 4px base; content gutters `spacing.lg` (20). Stat cards in a 2-up grid
  on phones, 3–4-up on wide/tablet/web. Lists are full-width rows.
- **Cards:** radius `lg/xl` (16/20), `colors.card`, 1px `borderLight`, `shadows.sm/md`,
  padding `spacing.base` (16).
- **Responsive:** phone-first; on web/tablet, content max-width ~1100, dashboards become
  multi-column (CSS-style fl\\-wrap of cards), charts widen. Use `useWindowDimensions()`
  breakpoints (e.g. ≥768 = tablet, ≥1024 = web wide).

### 1.4 Backgrounds & textures
- **Clean surfaces** by default (`background`/`card`) — content stays calm so numbers pop.
- **Gradient** reserved for: splash, primary CTAs, the Earnings hero header, and small
  accent chips — never as a full content background behind text-heavy areas.
- **Minimal texture:** subtle 6–8% tint blocks (`withOpacity(primary, .06)`) behind
  highlighted cards / empty-state halos; hairline dividers (`StyleSheet.hairlineWidth`).
  No noisy patterns.

### 1.5 Buttons & CTAs — placement, size, states
- **Primary:** `GradientButton` (teal→indigo), full-width at the bottom of forms/sheets,
  height ~52, radius `lg`, bold label. **One per screen.** (List property / Publish /
  Accept / Confirm payout.)
- **Secondary:** outline or `colors.primarySubtle` filled, same height.
- **Tertiary / add:** `DashedButton` (Add photo / Add listing / Block dates).
- **Destructive:** text/outline in `colors.error` (Decline / Cancel / Remove).
- **Inline actions:** icon buttons (message, more) in card corners.
- **States:** default → pressed (scale 0.97 + haptic) → disabled (opacity 0.5, muted
  gradient) → loading (spinner replaces label). Min touch target 44×44; `hitSlop` on
  small icons.
- **Placement:** sticky bottom bar for the key CTA on long screens (Reservation detail,
  Listing create) so it's always reachable.

### 1.6 Icons & imagery
- **Icons:** **Ionicons only** (scalable vector), consistent stroke; sizes from
  `iconSizes`. Map meaning clearly — `calendar`, `cash`/`wallet`, `stats-chart`,
  `bed`, `people`, `key`, `shield-checkmark`, `chatbubbles`, `notifications`, `star`.
  **No emojis.**
- **Imagery:** property photos via `ProgressiveImage` (blur-up), 4:3 / 1:1 crops,
  radius `md/lg`. Guest avatars circular with verified tick overlay. Always provide an
  `accessibilityLabel` (alt text) describing the photo/guest.

### 1.7 Spacing & alignment
- **4px grid** (`spacing`): xs4 sm8 md12 base16 lg20 xl24 2xl32 3xl40 4xl48 5xl64.
- Screen padding `lg` (20) horizontal; section rhythm `2xl` (32) top gaps; card padding
  `base` (16); row min-height 56.
- **Alignment:** labels left, numbers right (tabular), icons baseline-aligned to text;
  consistent 8px icon↔label gaps. Whitespace balance: let metric cards breathe (no
  cramped charts).

### 1.8 Accessibility
- **Contrast:** body & numbers meet **WCAG AA (≥4.5:1)**; large headings ≥3:1. Verify
  teal-on-white and white-on-gradient; darken text where needed. Dark mode tuned the same.
- **Labels / alt text:** every icon-only button has `accessibilityLabel`; images and
  charts have text alternatives (e.g. chart announces "Earnings June ₹70,153, up 12%").
- **Keyboard / focus (web):** all actions reachable via keyboard; visible focus rings;
  logical tab order; Esc closes sheets.
- **Screen reader:** `accessibilityRole` on buttons/links/switches; live-region toasts;
  group related text so VoiceOver/TalkBack reads a card as one unit.
- **Targets & motion:** ≥44px targets; honour "reduce motion" (a11y setting) by cutting
  non-essential animation; never convey meaning by colour alone (pair with icon/label).

### 1.9 Micro-interactions — animations, transitions, feedback
- **Reuse the guest motion tokens** (`constants/animations.ts`): durations
  instant/fast/normal/slow, spring `{friction:8,tension:40}`, stagger.
- **Entrances:** cards fade+slide up (Reveal pattern), list items stagger ~90ms,
  dashboard numbers **count-up** to value.
- **Press feedback:** scale 0.97 + haptic (`useHaptics`) on buttons & cards.
- **State changes:** Accept/Decline → status badge morph + toast ("Booking confirmed");
  block a date → cell colour transition; payout → success check animation.
- **Charts:** bars grow from baseline, line draws left→right on first render.
- **Transitions:** stack `slide_from_right`, modals/sheets `slide_from_bottom` with a
  drag handle; tab switches instant.
- **Loading:** `Skeleton` placeholders that match final layout (no blank flashes).

---

## 2. DATA ANALYTICS & DASHBOARD FOCUS

**Charting approach:** lightweight, token-coloured charts via `react-native-svg`
(works on web + native). Optionally `react-native-gifted-charts`/`victory-native` for
speed. All series use the §1.2 chart palette, animate on first render, and ship a text
alternative for a11y. Every metric reads from the host's real `reservations`/`payouts`/
`reviews`/`calendar` data (no fabricated numbers).

### 2.1 Earnings Dashboard
- **Total earnings** — hero **StatCard**: big `5xl` number (currency-formatted) + period
  toggle (This month / YTD / All) + **trend** arrow & % vs previous period, with a small
  **sparkline/line graph** of daily/weekly revenue.
- **Upcoming payouts** — **timeline view**: vertical list of scheduled payouts (date,
  amount, status: scheduled/processing/paid), next payout pinned at top with countdown.
- **Booking statistics** — **bar chart** (bookings per month) + **pie/donut** (by listing
  or by status confirmed/completed/cancelled). Legend with values.
- **Revenue reports** — **downloadable CSV / PDF**: a "Export" action generating a
  statement (period, per-booking rows: dates, nights, gross, cleaning, fee, taxes, net) —
  share sheet on native, file download on web.
- **Layout:** hero earnings card → payout timeline → stats charts → export button.

### 2.2 Booking Analytics
- **Upcoming vs completed** — **segmented bar / stacked** visualization (and a segmented
  control to switch ranges); counts + % split.
- **Acceptance / rejection rates** — **donut** (accepted vs declined vs expired) +
  **trend line** over time; show the host's response SLA.
- **Seasonal demand** — **heatmap** (month × day-of-week intensity) and/or a **line
  chart** of bookings across the year; highlight peak/slow periods.

### 2.3 Pricing Analytics
- **Daily vs weekend vs seasonal** — **grouped bar** comparing average realised rate by
  pricing type; show base vs achieved.
- **Discount usage** — **stat + bar**: how often weekly/monthly/promo discounts applied,
  total discount given.
- **Revenue impact of promotions** — **before/after** comparison (bookings & revenue
  with vs without promo); net impact callout (e.g. "+18% bookings, −6% avg rate").

### 2.4 Calendar Analytics
- **Occupancy rate** — **big % ring/donut** (booked ÷ available days) for the period + a
  small month-by-month bar.
- **Blocked / open dates** — **mini calendar heat view** colour-coding booked / open /
  blocked / past; quick counts.
- **Booking schedule trends** — **line chart** of lead time (how far ahead guests book)
  and length-of-stay distribution.

### 2.5 Communication Analytics
- **Response time** — **StatCard** (avg time to first reply) + trend; ties to the
  response-rate badge shown to guests.
- **Support resolution rate** — **donut/%**: cases resolved vs open, avg resolution time.
- **Notification engagement** — **bar**: seen vs ignored by type (requests, messages,
  reviews, payouts) — helps the host not miss requests.

### 2.6 Where analytics live
- **Today tab:** 1–2 glanceable insight cards (earnings snapshot, occupancy, "action
  needed") + a single "Ask the Assistant" entry.
- **Earnings/Analytics screen** (under Profile or its own stack): the full set above,
  organised in the 2.1–2.5 order, period filter at top, export at bottom.
- **Host Assistant (AI, advisory):** a chat that *explains* these numbers and gives
  non-binding suggestions — it never changes prices, calendars, or bookings.

---

## 3. END-TO-END SCREEN MAP (design intent per screen)

| Flow | Screen | Design intent |
|------|--------|---------------|
| Entry | **Splash (StayOn Host)** | gradient + white wordmark + HOST pill + sweep bar (§0) |
| Entry | Onboarding | 3–4 host-voiced slides, gradient cards, progress dots |
| Auth | Auth / OTP / AccountCreation | reuse guest screens, role=host |
| Onboard | HostOnboarding wizard | `StepWizard`: property → photos → pricing → availability → payout |
| KYC | IdentityVerification + PayoutSetup | timeline stepper (email→phone→ID→selfie→payout) |
| Home | **Today** | dashboard cards: earnings snapshot, next check-ins, action-needed, insight + Assistant |
| Listings | ListingCard / Create / Details / Photos / Pricing | `StepWizard` + photo manager + amenity chips + rules |
| Calendar | **Calendar** | `CalendarGrid` (open/booked/blocked) + pricing rules sheet |
| Bookings | **Reservations** / ReservationDetail | list with `StatusBadge`; detail = accept/decline, guest, breakdown, actions |
| Stay | CheckInPrep / CheckOut + DamageReport | checklists, access-code card, photo upload |
| Inbox | **Inbox** / Chat | conversation list + chat bubbles + quick replies |
| Reviews | GuestReview / ReviewsInbox | star inputs + respond to guest reviews |
| Money | **Earnings/Analytics** / Payouts / PayoutHistory / TaxCenter | charts (§2), payout timeline, export |
| AI | **HostAssistant** | chat over earnings/stats — answers & suggests, never acts |
| Profile | Profile + settings cluster | `SettingsRow`/`Section`; dark mode; support; resolution |

---

## 4. Design definition-of-done (every host screen)
1. Uses `useTheme()` + `makeStyles` — looks right in **light AND dark**.
2. 4px-grid spacing + `textStyles` typography; numbers tabular-aligned.
3. Ionicons only, **no emojis**; prices via `useCurrency().format()`.
4. AA contrast; `accessibilityLabel`/`Role` on interactive + image/chart alternatives.
5. Empty + loading (`Skeleton`) states present; press feedback + haptics.
6. One `STAYON_GRADIENT` CTA max; charts use the §1.2 chart palette and animate once.
7. `npx tsc --noEmit` clean; web bundle serves 200.
