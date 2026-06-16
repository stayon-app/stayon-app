# StayOn — Complete Product Vision & Implementation Plan

> "Not just where you stay. How you stay."

---

## 1. Brand Identity

**StayOn** is a premium travel & staycation platform for the discerning explorer.
Where Airbnb is a marketplace, StayOn is an **experience curator**.

- **Colors**: Tropical Teal `#0D9488` + Coral `#FB7185` + Gold `#F59E0B`
- **Mood**: Premium, warm, explorative, personal
- **Tagline**: *Stay More. Explore More. Live More.*
- **Audience**: Premium millennials + Gen-Z who want curated, unique stays and experiences

---

## 2. The Three Pillars

```
        ╔══════════╗    ╔══════════╗    ╔══════════╗
        ║  STAYS   ║    ║ EXPLORE  ║    ║ STORIES  ║
        ║          ║    ║          ║    ║          ║
        ║ Premium  ║    ║  Globe,  ║    ║ Travel   ║
        ║ homes,   ║    ║  Vibes,  ║    ║ content, ║
        ║ villas,  ║    ║  AI Bot, ║    ║ StayReels║
        ║ cabins   ║    ║  Map     ║    ║ Blogs    ║
        ╚══════════╝    ╚══════════╝    ╚══════════╝
```

---

## 3. What We Have vs What We're Building

### Currently Exists (Keep & Enhance)
- Home Feed with category pills
- Property Details screen (1973 lines - needs upgrades)
- Explore/Search screen
- Map screens (MapExplore + MapSearch)
- Booking/Checkout screen
- Trips, Messages, Profile screens
- Auth flow (Login, OTP, Account Creation)
- Splash screen
- Blog, Activity, Destination, Place detail screens

### New Screens to Build
1. **Globe Explorer** — 3D-style satellite map destination browser
2. **Vibe Search** — Mood-based property discovery
3. **StayBot** — AI travel planning assistant
4. **StayCoins** — Loyalty rewards dashboard
5. **Group Trip Planner** — Collaborative trip planning
6. **StayServices** — In-app extras catalog (transfers, chef, tours)
7. **Neighborhood Intel** — Hyperlocal destination scores
8. **Onboarding** — 3-slide feature intro for new users

### Existing Screens to Significantly Upgrade
- HomeScreen — Vibe pills, Swipe mode, Globe button, enhanced sections
- PropertyDetailsScreen — StayReels, live viewers, weather, neighborhood score
- MapScreen — Clustering, "search this area", swipeable bottom cards
- ProfileScreen — StayCoins balance, travel stats, badges, tier system
- BookingScreen — Add-ons (StayServices), promo codes, better breakdown

---

## 4. Screen Wireframes & Sketches

---

### 4.1 HOME SCREEN (Redesigned)

```
┌─────────────────────────────────────────┐
│  StayOn          📍 Mumbai   🔔  👤     │  ← Top bar
├─────────────────────────────────────────┤
│  ┌───────────────────────────────────┐  │
│  │  🔍  Where do you want to stay?  │  │  ← Morphing search pill
│  │  📅 Anytime  ·  👥 Guests        │  │    Tap → full modal
│  └───────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  ✨ Match your Vibe →                   │  ← NEW: Vibe pills
│  [💑 Romantic] [🏄 Adventure] [🧘 Wellness]  │
│  [👨‍👩‍👧 Family] [💻 Nomad] [🎉 Party]          │
├─────────────────────────────────────────┤
│  🏖Beach  🏔Mountain  🏙City  🛖Cabin  │  ← Category pills (Reanimated underline)
│  🏊Pool   🌴Tropical  🏰Luxury  🌾Farm │
├─────────────────────────────────────────┤
│  ◀ Swipe Cards / List View ▶  [🌍 Globe]│  ← View toggle + Globe button
├─────────────────────────────────────────┤
│  ⚡ Tonight's Deals                     │  ← NEW: Last-minute deals
│  ┌──────────┐ ┌──────────┐            │
│  │[img] 40% │ │[img] 25% │            │  ← Countdown timers
│  │ OFF      │ │ OFF      │            │
│  │ $75/nt   │ │ $120/nt  │            │
│  └──────────┘ └──────────┘            │
├─────────────────────────────────────────┤
│  📍 Near You                            │
│  ┌────────────────────────────────────┐ │
│  │ [Image carousel]              ♡   │ │  ← FlashList of PropertyCards
│  │ ⭐ Guest Favorite               │ │
│  │                                    │ │
│  └────────────────────────────────────┘ │
│  Bali, Indonesia · 5 guests max        │
│  ★ 4.95 · (248)  •  ₹9,100 / night   │
├─────────────────────────────────────────┤
│  🎬 StayReels                          │  ← NEW: Video property tours
│  [▶ reel] [▶ reel] [▶ reel] →        │
├─────────────────────────────────────────┤
│  ✈️ Trending Destinations              │
│  [Dubai] [Bali] [Maldives] [Tuscany] → │
├─────────────────────────────────────────┤
│  🧩 Curated Collections                │  ← NEW: Editorial collections
│  ┌──────────────────────────────────┐  │
│  │ 🏊 "World's Most Epic Pools"    │  │
│  │ 24 properties · Updated today   │  │
│  └──────────────────────────────────┘  │
│  ┌──────────────────────────────────┐  │
│  │ 🌙 "Hidden Gems Under $100"     │  │
│  └──────────────────────────────────┘  │
├─────────────────────────────────────────┤
│  🌿 Eco Stays                          │  ← NEW: Sustainability filter
│  [Cards with green badge]             │
├─────────────────────────────────────────┤
│         ╔════════════════╗             │
│         ║  🗺  Show map  ║             │  ← Floating button
│         ╚════════════════╝             │
└─────────────────────────────────────────┘
```

---

### 4.2 GLOBE EXPLORER (New Screen)

```
┌─────────────────────────────────────────┐
│  ←     Explore the World          🔍   │
├─────────────────────────────────────────┤
│                                         │
│     ╭──────────────────────────╮       │
│    /   🌍 SATELLITE MAP VIEW    \      │
│   /  (react-native-maps          \     │
│  │    mapType="satellite"          │    │
│  │    with zoom control)           │    │
│  │   ╔════╗                        │    │
│  │   ║$125║  ╔════╗               │    │
│  │   ╚════╝  ║$89 ║               │    │
│  │           ╚════╝               │    │
│  │  ╔══════╗         ╔═══╗        │    │
│  │  ║ $350 ║         ║$62║        │    │
│  │  ╚══════╝         ╚═══╝        │    │
│   \                              /     │
│    ╰──────────────────────────╯       │
│                                         │
├─────────────────────────────────────────┤
│  Popular Regions                        │
│  [🌴 SE Asia] [🏔 Alps] [🇺🇸 Americas]  │
│  [🏖 Caribbean] [🗼 Europe] [🏜 Middle East]│
├─────────────────────────────────────────┤
│  Showing 1,284 stays worldwide         │
│  ┌────────────────────────────────────┐ │
│  │ [img]  Santorini Cliffside Villa  │ │  ← Swipeable bottom card
│  │        ★4.97 · Greece · $280/nt  │ │
│  └────────────────────────────────────┘ │
└─────────────────────────────────────────┘

Interactions:
- Pinch zoom: World → Continent → City → Property
- Tap price bubble: Property preview slides up
- Drag: Map pans, "Search this area" appears
- Tap region pill: Flies to that region (animated)
```

---

### 4.3 VIBE / MOOD SEARCH (New Screen)

```
┌─────────────────────────────────────────┐
│  ←        Match Your Vibe              │
│  What kind of stay are you looking for? │
├─────────────────────────────────────────┤
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │  💑        │  │  🏄‍♂️       │        │
│  │ ROMANTIC   │  │ ADVENTURE  │        │
│  │ Couples    │  │ Thrillseek │        │
│  │ escapes,   │  │ Surf, hike │        │
│  │ sunsets    │  │ climb      │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │  🧘        │  │  👨‍👩‍👧‍👦       │        │
│  │ WELLNESS   │  │  FAMILY    │        │
│  │ Spa, yoga  │  │ Kid-safe   │        │
│  │ detox      │  │ Big spaces │        │
│  └────────────┘  └────────────┘        │
│                                         │
│  ┌────────────┐  ┌────────────┐        │
│  │  💻        │  │  🎉        │        │
│  │  NOMAD     │  │   SOCIAL   │        │
│  │ Fast wifi  │  │ Groups,    │        │
│  │ Workspace  │  │ parties    │        │
│  └────────────┘  └────────────┘        │
│                                         │
├─────────────────────────────────────────┤
│  [Where?]  [When?]  [Guests?]          │
│                                         │
│        [ Find My Perfect Stay ]        │  ← Primary CTA
└─────────────────────────────────────────┘

Result screen shows properties filtered by vibe tags,
with AI-generated "Why this is perfect for you" blurb
```

---

### 4.4 PROPERTY DETAILS (Massively Enhanced)

```
┌─────────────────────────────────────────┐
│  ←                          Share  ♡   │  ← Transparent over image
│                                         │
│  ╔═════════════════════════════════╗   │
│  ║                                 ║   │
│  ║   FULL SCREEN IMAGE CAROUSEL   ║   │  ← expo-image + image-viewing
│  ║   (swipeable, pinch to zoom)   ║   │
│  ║                                 ║   │
│  ║  ● ○ ○ ○        1/19   ⊞ All  ║   │
│  ║  [▶ Watch StayReel]             ║   │  ← NEW: Video tour button
│  ╚═════════════════════════════════╝   │
│                                         │
│  Metro & Nr DWTC                       │
│  Entire rental · Dubai, UAE            │
│  ⭐ Guest Favorite  🌿 Eco Certified   │  ← NEW: Eco badge
│  ★ 4.81 · 48 reviews · 🏆 Superhost  │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  🔴 3 people viewing right now  │   │  ← NEW: Live activity
│  │  ⚡ Booked 2x this week         │   │
│  └─────────────────────────────────┘   │
│                                         │
│  📍 Business Bay · Dubai               │
│  🌤 28°C Sunny · Forecast: ☀️☀️⛅☀️☀️  │  ← NEW: Weather (5-day)
│                                         │
│  ── NEIGHBORHOOD INTEL ─────────────   │  ← NEW: Hyperlocal scores
│  🚶 Walk Score: 91 · Excellent         │
│  🍽 Restaurants: 47 within 500m       │
│  🌙 Nightlife: Moderate                │
│  🚇 Transport: 3 min to metro          │
│  [View full neighborhood map →]        │
│                                         │
│  ── ABOUT THIS SPACE ───────────────   │
│  Welcome to your stylish retreat...    │
│  [Show more ↓]                         │
│                                         │
│  ── WHAT THIS PLACE OFFERS ─────────   │
│  ✅ Wifi  ✅ Pool  ✅ Kitchen  ✅ Gym  │
│  [Show all 30 amenities →]             │  ← Opens @gorhom/bottom-sheet
│                                         │
│  ── STAYREEL TOUR ──────────────────   │  ← NEW
│  ┌─────────────────────────────────┐   │
│  │  [▶  30-second video tour  ]   │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ── AVAILABILITY ───────────────────   │
│  [Calendar - react-native-calendars]   │
│                                         │
│  ── REVIEWS ────────────────────────   │
│  ★ 4.81 overall · 48 reviews          │
│  [Category breakdowns with bars]       │
│  [Review cards]                        │
│  [Show all 48 reviews →]              │
│                                         │
│  ── ADD EXPERIENCES ────────────────   │  ← NEW: StayServices upsell
│  ┌──────────┐ ┌──────────┐           │
│  │🚗 Airport│ │👨‍🍳 Private│           │
│  │ Transfer │ │  Chef    │           │
│  │  +$35    │ │  +$150   │           │
│  └──────────┘ └──────────┘           │
│                                         │
│  ── HOST ───────────────────────────   │
│  👤 Ikigai Stays                       │
│  [📹 Request Video Call]               │  ← NEW: Superhost video call
│                                         │
├─────────────────────────────────────────┤
│  ₹3,730/nt  ★4.81 · 48    [Reserve →] │  ← Sticky bottom bar
└─────────────────────────────────────────┘
```

---

### 4.5 STAYBOT AI ASSISTANT (New Screen)

```
┌─────────────────────────────────────────┐
│  ←      StayBot  ✨ AI Travel Planner  │
│  Powered by AI · Always available      │
├─────────────────────────────────────────┤
│                                         │
│  ┌─────────────────────────────────┐   │
│  │  👋 Hi! I'm StayBot.            │   │
│  │                                  │   │
│  │  Tell me what you're dreaming   │   │
│  │  of and I'll find the perfect   │   │
│  │  stay for you.                  │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Quick prompts:                        │
│  ["Romantic beach getaway for 2"]      │
│  ["Budget trip under $100/night"]      │
│  ["Family trip with kids & pool"]      │
│  ["Best rooftop villa in Bali"]        │
│                                         │
│  ─────────────────────────────────     │
│                                         │
│                  [ User message ]       │
│                  "I want a romantic    │
│                   beach getaway for    │
│                   2 people in Bali"    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ 🤖 Perfect! Here are 3 dreamy  │   │
│  │ options in Bali for couples:    │   │
│  │                                  │   │
│  │ 1. 🏖 Seminyak Cliffside Villa  │   │
│  │    ★4.97 · $180/nt · Pool + view│   │
│  │    [View →]                      │   │  ← Tappable property cards inline
│  │                                  │   │
│  │ 2. 🌊 Ubud Jungle Retreat       │   │
│  │    ★4.92 · $120/nt · Private    │   │
│  │    [View →]                      │   │
│  └─────────────────────────────────┘   │
│                                         │
├─────────────────────────────────────────┤
│  [📎]  [ Ask StayBot anything... ] [➤]│
└─────────────────────────────────────────┘
```

---

### 4.6 STAYCOINS / REWARDS (New Screen, inside Profile)

```
┌─────────────────────────────────────────┐
│  ←           StayCoins                 │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  [Lottie coin animation]        │   │
│  │                                  │   │
│  │           1,247  🪙              │   │  ← Big coin balance
│  │         StayCoins               │   │
│  │                                  │   │
│  │  Gold Member  ████████░░  80%   │   │  ← Tier progress bar
│  │  320 more to reach Platinum     │   │
│  └─────────────────────────────────┘   │
│                                         │
│  Tier Benefits                         │
│  🥉 Explorer   — 5% earn rate          │
│  🥈 Wanderer   — 7% earn rate + early access
│  🥇 Gold  ◄ YOU — 10% + priority support
│  💎 Platinum   — 15% + free upgrades   │
│                                         │
│  How to Earn                           │
│  ┌──────────┐ ┌──────────┐            │
│  │🏠 Book   │ │⭐ Review │            │
│  │+100 coins│ │ +25 coins│            │
│  └──────────┘ └──────────┘            │
│  ┌──────────┐ ┌──────────┐            │
│  │👥 Refer  │ │📸 Share  │            │
│  │+200 coins│ │ +10 coins│            │
│  └──────────┘ └──────────┘            │
│                                         │
│  Redeem                                │
│  🎟 100 coins = ₹50 off booking        │
│  🎟 500 coins = Free night (select)    │
│  🎟 1000 coins = Premium upgrade       │
│                                         │
│  Your History                          │
│  ✅ Booked Dubai villa     +100 🪙     │
│  ✅ Left a review          +25  🪙     │
│  ✅ Referred Arjun         +200 🪙     │
└─────────────────────────────────────────┘
```

---

### 4.7 GROUP TRIP PLANNER (New Screen)

```
┌─────────────────────────────────────────┐
│  ←        Group Trip Planner           │
├─────────────────────────────────────────┤
│  Goa Trip 2026  ✏                      │
│  📅 Jun 12–17  ·  👥 6 people          │
├─────────────────────────────────────────┤
│  Travelers                             │
│  👤 You (host)          Confirmed ✅   │
│  👤 Arjun               Confirmed ✅   │
│  👤 Priya               Pending  ⏳   │
│  [+ Invite more]                       │
├─────────────────────────────────────────┤
│  Vote on Properties                    │
│  Everyone votes · Most votes wins      │
│                                         │
│  ┌────────────────────────────────┐    │
│  │ [img] Beachside Villa · $200   │    │
│  │ 👍 You, Arjun  👎 Priya       │    │
│  │ ████████░░░░  2/3 votes       │    │
│  └────────────────────────────────┘    │
│  ┌────────────────────────────────┐    │
│  │ [img] Clifftop Retreat · $180  │    │
│  │ 👍 Priya    👎 You             │    │
│  └────────────────────────────────┘    │
│  [+ Add property to vote on]           │
├─────────────────────────────────────────┤
│  Cost Split                            │
│  Total estimate: ₹54,000              │
│  Per person (6):  ₹9,000              │
│                                         │
│  You       [Paid ✅]                   │
│  Arjun     [Paid ✅]                   │
│  Priya     [Pending 💸]               │
│  [Request payment from Priya]          │
├─────────────────────────────────────────┤
│  Group Chat                            │
│  [mini chat preview]                   │
│  [Open group chat →]                   │
└─────────────────────────────────────────┘
```

---

### 4.8 PROFILE (Redesigned)

```
┌─────────────────────────────────────────┐
│  ←              Profile                │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────┐   │
│  │  [Avatar with teal ring]        │   │
│  │  Mahindra Bommu                 │   │
│  │  📍 Mumbai  ·  ⭐ Verified      │   │
│  │  🥇 Gold Member                 │   │
│  └─────────────────────────────────┘   │
│                                         │
│  ┌──────┐  ┌──────┐  ┌──────┐  ┌──────┐│
│  │  12  │  │ 4.9  │  │1,247 │  │  8   ││
│  │Trips │  │ Avg  │  │Coins │  │Wishlst││
│  │      │  │Rating│  │  🪙  │  │      ││
│  └──────┘  └──────┘  └──────┘  └──────┘│
│                                         │
│  [View StayCoins & Rewards →]          │
├─────────────────────────────────────────┤
│  🌍 Travel Map                         │  ← NEW: Map showing visited places
│  ┌───────────────────────────────────┐ │
│  │  [World map with visited pins]    │ │
│  │  5 countries · 12 cities visited  │ │
│  └───────────────────────────────────┘ │
├─────────────────────────────────────────┤
│  Settings & More                       │
│  👤 Account details                   │
│  🔔 Notifications                     │
│  🌙 Dark mode                  [⚫●]   │  ← NEW: Dark mode toggle
│  🌿 Carbon offset settings           │
│  💳 Payments & payouts               │
│  👥 Refer & Earn (+200 🪙)           │
│  🛡 Privacy & sharing                │
│  📞 Help Center                      │
│  🏠 List your property               │
│  🚪 Log out                          │
└─────────────────────────────────────────┘
```

---

### 4.9 BOTTOM NAVIGATION (Redesigned)

```
┌─────────────────────────────────────────┐
│                                         │
│         [Screen content here]          │
│                                         │
├─────────────────────────────────────────┤
│                                         │
│   🏠      🌍       ✨       🗓️      👤   │
│  Home   Explore  StayBot  Trips  Profile│
│  ────                                  │  ← Animated underline (Reanimated)
│                                         │
└─────────────────────────────────────────┘

Tab Details:
- 🏠 Home     → Property feed + categories
- 🌍 Explore  → Globe + Vibe + Search + Destinations
- ✨ StayBot  → AI travel planning (CENTER, special treatment)
- 🗓️ Trips    → Bookings + Wishlist + Messages merged
- 👤 Profile  → Profile + StayCoins + Settings

StayBot center tab:
- Slightly raised (translateY: -8)
- Teal circle background
- White sparkle icon
- Glows softly
```

---

### 4.10 DARK MODE

```
LIGHT MODE                    DARK MODE
─────────────────────         ─────────────────────
Background: #FFFFFF           Background: #0A0F0D
Surface:    #F8FAFB           Surface:    #141A17
Card:       #FFFFFF           Card:       #1A2420
Primary:    #0D9488           Primary:    #14B8A6  (slightly brighter)
Text:       #0F172A           Text:       #F1F5F9
Border:     #D1FAE5           Border:     #1F2E29
```

---

## 5. Packages Required

### Install via `npx expo install` (Expo-managed)
```bash
npx expo install \
  react-native-reanimated \
  react-native-gesture-handler \
  expo-blur \
  expo-haptics \
  expo-location \
  expo-image \
  expo-secure-store \
  expo-av
```

### Install via `npm install`
```bash
npm install \
  @gorhom/bottom-sheet \
  @shopify/flash-list \
  react-native-image-viewing \
  lottie-react-native \
  dayjs \
  @react-native-community/netinfo
```

### Already Installed ✅
- react-native-maps
- react-native-calendars
- expo-linear-gradient
- @expo/vector-icons
- react-native-svg

---

## 6. Feature Comparison: Airbnb vs StayOn

| Feature | Airbnb | StayOn |
|---|---|---|
| Property Search | ✅ Basic | ✅ + Vibe/Mood Search |
| Maps | ✅ 2D markers | ✅ + Globe Explorer + Satellite |
| Property Details | ✅ Full | ✅ + Video Tour, Weather, Live Views, Neighborhood Intel |
| Filters | ✅ Standard | ✅ + Vibe filter, Eco filter |
| Booking | ✅ Standard | ✅ + StayServices add-ons, promo codes |
| Wishlists | ✅ Basic folders | ✅ + Mood board, Group voting |
| Reviews | ✅ Standard | ✅ + Verified photos tag |
| Auth | ✅ Social login | ✅ OTP + social |
| Trips | ✅ Upcoming/Past | ✅ + Trip timeline, weather preview |
| Messages | ✅ Basic chat | ✅ + Video call request, translation |
| Profile | ✅ Basic | ✅ + Travel map, StayCoins, badges, tier |
| AI | ❌ | ✅ StayBot AI travel planner |
| Loyalty | ❌ | ✅ StayCoins with tier system |
| Video Tours | ❌ | ✅ StayReels (30-sec property videos) |
| Group Planning | ❌ | ✅ Vote, split costs, group chat |
| Eco Certification | ❌ | ✅ Eco badge + carbon offset |
| Live Activity | ❌ | ✅ "3 people viewing right now" |
| Neighborhood Intel | ❌ | ✅ Walk score, safety, restaurants, transit |
| Weather | ❌ | ✅ 5-day forecast on property page |
| Tonight's Deals | ❌ | ✅ Last-minute discounts with countdown |
| Dark Mode | ❌ | ✅ Full dark mode support |
| Price Intelligence | ❌ | ✅ "Best time to book" AI prediction |
| StayServices | ❌ | ✅ Transfer, chef, tours in-app |
| Curated Collections | Partial | ✅ Editorial "World's Best Pools" etc |

---

## 7. Implementation Phases

### Phase 1 — Foundation (Packages + Config)
- Install all packages
- Configure Reanimated (babel.config.js)
- Configure GestureHandler (App.tsx wrapper)
- Theme system (light + dark mode context)
- Typography system

### Phase 2 — Core Screens (Parity with Airbnb)
- HomeScreen redesign (Vibe pills, enhanced sections)
- PropertyDetails upgrade (all new sections)
- MapScreen upgrade (clustering, search-this-area)
- Booking upgrade (add-ons, breakdown)
- Bottom nav redesign (animated, StayBot center)

### Phase 3 — Unique Features
- Globe Explorer screen
- Vibe Search screen
- StayBot AI screen
- StayCoins system
- Group Trip Planner

### Phase 4 — Polish
- Dark mode throughout
- Haptic feedback system
- Loading skeletons everywhere
- Onboarding slides
- Lottie micro-animations
- expo-image with blurhash placeholders

### Phase 5 — Backend Integration
- Wire up real API (stayon.com)
- Replace all mock data
- Real auth (rotate the exposed API key)
- expo-secure-store for tokens

---

## 8. File Structure (New Files to Create)

```
mobile/src/
├── screens/
│   ├── GlobeExplorerScreen.tsx    ← NEW
│   ├── VibeSearchScreen.tsx       ← NEW
│   ├── StayBotScreen.tsx          ← NEW
│   ├── StayCoinsScreen.tsx        ← NEW
│   ├── GroupTripScreen.tsx        ← NEW
│   ├── StayServicesScreen.tsx     ← NEW
│   └── OnboardingScreen.tsx       ← NEW
├── contexts/
│   └── ThemeContext.tsx           ← NEW (dark/light mode)
├── hooks/
│   ├── useHaptics.ts              ← NEW
│   ├── useTheme.ts                ← NEW
│   └── useStayCoins.ts            ← NEW
├── components/
│   ├── VibeCard.tsx               ← NEW
│   ├── StayReelCard.tsx           ← NEW
│   ├── CuratedCollection.tsx      ← NEW
│   ├── WeatherBadge.tsx           ← NEW
│   ├── NeighborhoodCard.tsx       ← NEW
│   ├── LiveActivityBadge.tsx      ← NEW
│   ├── StayCoinsBadge.tsx         ← NEW
│   ├── EcoBadge.tsx               ← NEW
│   └── TonightsDeals.tsx          ← NEW
└── theme/
    ├── colors.ts                  ← UPDATE (add dark colors)
    ├── typography.ts              ← NEW
    └── spacing.ts                 ← NEW
```

---

*StayOn — Built to be the travel app people LOVE, not just use.*
