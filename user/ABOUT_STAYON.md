# StayOn — What It Is, Why It's Different, and How It Works

> **StayOn is a smarter, friendlier way to find and book unique places to stay.**
> It adapts to *where you are* and *what you want*, has an AI travel concierge that
> actually books for you, and prices honestly — no surprise service fees.

This is the **product guide**: what the app is, what you can do, how every part works,
and answers to the questions a first-time user naturally asks. (For the
engineering/architecture doc, see `USER_APP_GUIDE.md`.)

---

## 1. In one minute

You open StayOn and it already knows the vibe — the home screen shows **stays near
you**, **things to do around you**, and inspiration for **places worth visiting next**.
You can search any city on Earth, filter by what matters, and book a stay in a few
taps. Stuck on where to go? Just **chat with StayBot**, our AI concierge — tell it
"romantic beachfront for 2 next weekend under ₹20,000" and it finds real, bookable
homes, confirms your dates, and takes you to checkout.

And when you pay, **the price you see is the price you pay** — only a cleaning fee
and taxes, never a hidden platform/service fee.

---

## 2. Who it's for

- **Travellers** who want a beautiful, fast way to discover stays — by map, by vibe,
  or just "near me".
- **Planners** who like everything in one place: trips, wishlists, itineraries, a
  trip wallet.
- **People who hate surprises** — transparent pricing, clear cancellation, verified
  hosts.
- **Anyone who'd rather *talk* than fill forms** — StayBot does the searching for you.

---

## 3. What you can do (the essentials)

| Do this | Where |
|---------|-------|
| See stays **near your current location** | Home → "Nearby You" |
| Find **things to do** around you | Home → "Things to Do" |
| Discover **other destinations & travel stories** | Home (Popular Destinations, Curated, Reels) |
| **Search any city worldwide** + filter | Explore / Search |
| **Chat to book** with the AI concierge | StayBot tab |
| **Save** stays you love | Heart → Wishlists tab |
| **Book** a stay and pick payment | Property → Booking |
| **Manage trips** & itineraries | Trips tab |
| **Review** a stay after you visit | Property → Write a review |
| **See where a stay is** on a map | Property → "Where you'll be" |

---

## 4. What makes StayOn different (the standout features)

### 4.1 It's *dynamic* — the app reorganises around you
Most apps show everyone the same homepage. StayOn uses your **live location** to
tailor Home and Explore:
- **Nearby You** lists real stays **sorted by distance** from you ("4.3 km away").
- **Things to Do** suggests experiences in **your** city — then a few from around the
  world to spark your next trip.
- **Explore** auto-centres on your **city → state → country** ("Stay near Charminar",
  "Hyderabad homes…") — until you search somewhere else.
Travel to another country and the whole app re-centres on *that* place automatically.

### 4.2 StayBot — an AI concierge that actually books
Not a dumb chatbot. StayBot understands plain English — destination, budget, guests,
**dates/month**, and vibe — fills in what's missing by asking one friendly question at
a time, recommends **real, bookable** stays, shows you a **booking summary to
confirm**, and sends you to checkout with the right dates already set. It also answers
"how do I cancel?", "what are the fees?", "is it safe?" like a 24/7 front desk.

### 4.3 Honest pricing — no service fee
StayOn charges **no platform or service fee**. You pay the nightly rate, the host's
cleaning fee, and taxes — and you see the **full total before you pay**. No extra fee
is added on top of your booking.

### 4.4 Search the way *you* think
- **By place** — live worldwide search (any city, street, landmark).
- **By category** — Beaches, Mountains, Cities, Luxury… with **live counts**.
- **By vibe** — Romantic, Adventure, Wellness, Family, Nomad…
- **Quick filters** — Top Rated, Instant Book, Best Value, Luxury — that actually
  narrow the results.

### 4.5 Maps that make sense
- In **search**, the map shows **price bubbles** so you can compare listings at a glance.
- On a **single stay**, the map shows a **location pin** pointing to where it is (no
  price clutter). On iPhone it's **Apple Maps**.

### 4.6 It remembers, so you don't lose your place
- **Recently viewed** — the stays you opened are one tap away on Home.
- **Finish your booking** — if you stop at payment, Home reminds you with the stay's
  photo so you can pick up where you left off.
- **Wishlists** — heart anything; it's saved to your Wishlists across the app.

### 4.7 Built for everyone
- **Dark mode** throughout.
- **Your currency** — prices auto-convert (₹ for India, otherwise US$), switchable in
  Settings.
- Accessibility options, haptic feedback, smooth motion, premium visuals.

---

## 5. The "models" — the intelligence inside

StayOn is designed around helpful intelligence rather than gimmicks:

1. **StayBot NLU engine** *(working today, on-device)* — understands free-text travel
   requests: intent, destination, budget, guests, dates/month, vibe and amenities,
   then matches them to real listings and replies in a warm concierge tone.
2. **Recommendation scoring** *(working today)* — ranks stays by a blend of rating,
   location match, price fit, guest capacity, vibe and amenity overlap, and shows a
   transparent "why these" explanation.
3. **Distance ranking** — "near me" results are sorted by true great-circle distance
   from your live coordinates.
4. **Smart AI mode (optional)** — paste an Anthropic API key and StayBot upgrades to a
   true LLM agent that reasons over the catalogue (the local engine still guarantees
   the stays are real and bookable). *Optional — set it up in StayBot's settings.*
5. **Planned models** *(roadmap)* — personalised ranking from your behaviour, dynamic
   pricing insights, demand/availability prediction, and smarter itinerary building.

---

## 6. Why StayOn — at a glance

Everything StayOn gives you, in one place:

| What you get | How it helps |
|---|---|
| **No service or platform fee** | You pay only the rate, cleaning fee and taxes — the full total is shown up front. |
| **A homepage that adapts to you** | Stays and things to do reorganise around your live location. |
| **An AI concierge that books for you** | Just chat — StayBot searches, confirms your dates, and checks you out. |
| **Search by place, category & vibe** | Plus quick filters (Top Rated, Instant Book, Best Value, Luxury) that really narrow results. |
| **"Near me" done right** | Real stays sorted by true distance from you. |
| **Never lose your place** | "Finish your booking" + Recently viewed bring you back instantly. |
| **Your currency, your theme** | Auto currency conversion and full dark mode. |

**The pitch:** great stays, a **lower total cost**, a homepage that works *for you*,
and a concierge that does the searching — less effort, fewer surprises.

---

## 7. How it works — every option explained

### Home tab
- **Search bar** → opens the full search (place, dates, guests, category, filters).
- **Categories / Match Your Vibe** → quick ways to browse; tap → curated results.
- **Nearby You** → real stays near your GPS location, distance-labelled. "See all" →
  the full nearby list.
- **Recently viewed** → stays you opened recently; tap to reopen.
- **Finish your booking** (appears only if you left checkout) → resumes that booking.
- **Things to Do** → experiences in your city + a few worldwide (inspiration, no price).
- **Popular Destinations / Curated / StayReels / Travel Stories** → discover new places.

### Explore tab
- Auto-loads stays/experiences/blogs for **wherever you are**. Browse, then **search**
  to switch to any other city/country. Open the **map** to see listings as price pins.

### Search
- Type a destination (live worldwide suggestions), choose **dates** and **guests**,
  optionally a **category** and **quick filters**, then **Search** → results on a map +
  list. Filters and category carry through to the results.

### StayBot tab (AI concierge)
- Type naturally: *"family cabin with a pool in Aspen for 6, next month."*
- It asks for anything missing (e.g. dates), recommends real stays, shows a **summary**
  ("Stay / Location / When · nights / Guests / Price"), and on **confirm** opens
  checkout with those details.

### Property detail
- Photo gallery, host info, amenities, **map with a location pin**, reviews (including
  ones guests wrote in-app), honest **price breakdown**, and **Reserve**.
- **Heart** → saves to Wishlists. **Share** → send the stay to a friend.

### Booking (checkout)
- Review → Message host → **Pay**. Pick a payment method; "Credit or debit card"
  expands to choose a saved card. See the full total (nights + cleaning + taxes), agree
  to house rules, and confirm. You get a confirmation with your dates and code.

### Trips / Wishlists / Profile
- **Trips** — upcoming & past stays, itineraries, manage/cancel.
- **Wishlists** — everything you hearted, grouped into collections (incl. "Saved").
- **Profile** — personal info, payment methods, language & currency, notifications,
  privacy, accessibility, support.

---

## 8. Frequently asked questions

**Is it free to use?** Yes — browsing, searching and StayBot are free. You only pay
when you book a stay.

**Are there hidden fees?** No. There's **no service or platform fee** — only the
nightly rate, the host's cleaning fee, and taxes, all shown **before** you pay.

**How does it know where I am?** With your permission, it uses your device location to
show nearby stays and local things to do. You can deny it — the app still works, and
you can search any place manually. Your exact location is only used to sort results,
not shared.

**Do I have to use the AI to book?** No. You can browse and book normally. StayBot is
there if you'd rather chat than search.

**Is StayBot a real person?** It's an AI concierge — available 24/7. It finds real,
bookable stays and can answer questions about fees, cancellation, check-in and more.

**Will it show the exact address?** The general area is shown before booking (for host
privacy); the **exact address and directions** appear in your trip once the booking is
confirmed.

**What currency are prices in?** Your local currency automatically — ₹ (INR) for
India, US$ otherwise. Change it anytime in **Profile → Language & currency**.

**Can I cancel?** Yes. Most stays include a free-cancellation window for a full refund;
the exact policy is shown on every listing before you book, and you cancel from Trips.

**How do I pay?** Major cards, plus Apple Pay / Google Pay / PayPal. You can save a card
and pick it at checkout.

**What if I close the app mid-booking?** Next time you open Home, a **"Finish your
booking"** card brings you right back to where you left off.

**Is my data safe?** Hosts are verified, payments are encrypted, and your preferences
stay on your device. You control location and privacy settings.

**Does dark mode work?** Yes — the whole app supports light and dark themes.

---

## 9. Why a person should choose StayOn

1. **You pay less** — no service fee on top of every booking.
2. **You do less** — the app organises itself around your location, and the concierge
   does the searching.
3. **No surprises** — honest totals, clear cancellation, verified hosts, exact location
   after booking.
4. **It fits you** — your currency, your vibe, dark mode, accessibility.
5. **It's a joy to use** — fast, premium, and genuinely helpful.

Where other booking apps feel like a search engine, **StayOn feels like a travel
friend** — one who knows where you are, what you like, and how to get you booked
without the fees.

---

## 10. What's next

StayOn keeps getting better. The experience, search, location intelligence, StayBot
concierge, wishlists, reviews, trips and checkout are all here today.

**Coming next:** personalised recommendations from your activity, real-time pricing &
availability, richer itineraries, group trip planning, and deeper StayBot booking
automation.
