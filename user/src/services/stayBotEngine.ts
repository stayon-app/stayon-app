// StayBot local NLU engine — analyzes the user's message, tracks conversation
// state (slot filling), recommends real bookable stays, and replies in a warm,
// service-oriented "cabin crew" tone with graceful apologies on missteps.
// No external API or key required. (An optional Claude adapter lives in aiProvider.ts.)

import { BOT_STAYS, BotStay } from '../data/stays';

export interface BotContext {
  destination?: string;     // matched city or country
  maxPrice?: number;
  minPrice?: number;
  guests?: number;
  nights?: number;          // trip duration in nights
  month?: string;           // target month, e.g. "July"
  whenText?: string;        // human travel phrase, e.g. "next weekend", "July"
  vibes: string[];
  amenities: string[];
  lastSuggestions: BotStay[];
  turns: number;
  // Booking flow flags
  awaitingDates?: boolean;  // we asked for dates before confirming a booking
  awaitingConfirm?: boolean;// we showed a summary and await a yes/no
  pendingStay?: BotStay;    // the stay being booked through the confirm flow
  openDestination?: boolean;// user said "surprise me / anywhere" — skip the place question
}

export interface BotReply {
  text: string;
  suggestions?: BotStay[];
  quickReplies?: string[];
  action?: { type: 'book' | 'view'; stay: BotStay };
  // Short, transparent "why these" explanation of the match, so the UI can show
  // a subtle "Why am I seeing this?" line under recommendations.
  rationale?: string;
}

export type Intent =
  | 'greeting' | 'thanks' | 'affirm' | 'deny' | 'book' | 'help'
  | 'complaint' | 'reset' | 'search' | 'smalltalk' | 'wants_stay'
  | 'app_info' | 'capability'
  | 'faq_cancel' | 'faq_payment' | 'faq_fees' | 'faq_checkin' | 'faq_pets' | 'faq_howbot';

export function createContext(): BotContext {
  return { vibes: [], amenities: [], lastSuggestions: [], turns: 0 };
}

// Programmatic reset the screen can call to clear all learned preferences.
// Returns a fresh context (same as createContext) so callers can swap it in.
export function resetContext(): BotContext {
  return createContext();
}

// ── lexicons ────────────────────────────────────────────────────────────────
const VIBE_WORDS: Record<string, string[]> = {
  romantic: ['romantic', 'couple', 'couples', 'honeymoon', 'anniversary', 'for two', 'getaway'],
  beach: ['beach', 'beachfront', 'ocean', 'sea', 'coast', 'coastal', 'seaside', 'surf'],
  city: ['city', 'downtown', 'urban', 'nightlife', 'central'],
  mountain: ['mountain', 'mountains', 'alpine', 'hiking', 'hike', 'cabin'],
  ski: ['ski', 'skiing', 'snow', 'slopes', 'snowboard'],
  lake: ['lake', 'lakeside', 'lakefront'],
  luxury: ['luxury', 'luxurious', 'premium', 'high end', 'high-end', 'upscale', 'fancy', 'exclusive', 'five star', '5 star'],
  budget: ['budget', 'cheap', 'affordable', 'inexpensive', 'economical', 'low cost', 'save money'],
  family: ['family', 'kids', 'children', 'child', 'family-friendly', 'family friendly'],
  pet: ['pet', 'pets', 'dog', 'dogs', 'cat', 'pet-friendly', 'pet friendly'],
  wellness: ['wellness', 'spa', 'relax', 'relaxing', 'retreat', 'peaceful', 'quiet', 'yoga'],
  adventure: ['adventure', 'adventurous', 'explore', 'outdoor', 'outdoors', 'nature'],
  work: ['work', 'remote', 'workation', 'business', 'nomad', 'wifi', 'desk', 'office'],
  nature: ['nature', 'forest', 'countryside', 'scenic', 'green'],
};

const AMENITY_WORDS: Record<string, string[]> = {
  pool: ['pool', 'swimming', 'private pool'],
  hottub: ['hot tub', 'hottub', 'hot-tub', 'jacuzzi'],
  wifi: ['wifi', 'wi-fi', 'internet', 'fast wifi', 'broadband', 'high speed internet'],
  kitchen: ['kitchen', 'cook', 'cooking', 'kitchenette'],
  parking: ['parking', 'garage', 'free parking', 'park my car', 'car space'],
  gym: ['gym', 'fitness', 'workout'],
  beachfront: ['beachfront', 'beach front', 'on the beach', 'beach access'],
  ac: ['ac', 'a/c', 'air conditioning', 'air-con', 'aircon'],
  fireplace: ['fireplace', 'fire place', 'log fire'],
  pet: ['pet friendly', 'pet-friendly', 'dog friendly', 'pets allowed', 'bring my dog'],
  workspace: ['workspace', 'work space', 'desk', 'office', 'work from home'],
  ev: ['ev charger', 'ev charging', 'electric car', 'charging point', 'car charger'],
  // "Universal" amenities — recognised from words but offered across StayOn, so
  // they don't narrow the list (see recommend()). Self check-in & instant book.
  selfcheckin: ['self check-in', 'self check in', 'self checkin', 'self-check', 'keyless', 'smart lock', 'lockbox'],
  instant: ['instant book', 'instant booking', 'book instantly', 'instant'],
};

// ── front-desk knowledge base ────────────────────────────────────────────────
// Broad "concierge knows everything" answers for common guest questions that
// aren't part of the core search/booking flow. Scanned only when the message
// isn't actively trying to search for a stay (see respond()).
interface KbEntry {
  id: string;
  test: RegExp;
  answers: string[];
  quickReplies?: string[];
  keywords?: string[];   // plain words used by the fuzzy scorer (bestKbMatch) so
                         // free-form questions still land on the right topic.
}

const KNOWLEDGE_BASE: KbEntry[] = [
  {
    id: 'wifi',
    test: /(wi-?fi|internet|broadband|work from|workation|fast connection)/i,
    answers: [
      "Nearly every StayOn home comes with fast, reliable Wi-Fi — perfect whether you're streaming or working remotely. Look for the Wi-Fi amenity on a listing, or tell me you need a good workspace and I'll find homes with strong internet and a desk.",
      "Yes! Most of our stays include high-speed Wi-Fi, and many have a dedicated workspace too. Just say “somewhere good to work from” and I'll match you to the best ones.",
    ],
    quickReplies: ['Stays good for working', 'Find a stay', 'What about parking?'],
  },
  {
    id: 'parking',
    test: /(parking|park my car|garage|where (?:do|can) i park|car space)/i,
    answers: [
      "Plenty of StayOn homes include free parking or a private garage — it's listed in the amenities on each stay. Want me to find places with parking in your destination?",
      "Good question! Many stays offer on-site or free street parking; you'll see it in the amenities. Tell me where you're headed and I'll find ones with parking.",
    ],
    quickReplies: ['Find stays with parking', 'Do they have Wi-Fi?', 'Find a stay'],
  },
  {
    id: 'checkout',
    test: /(check[\s-]?out time|late check[\s-]?out|what time.*(?:leave|check ?out)|when (?:do|should) i leave)/i,
    answers: [
      "Check-out is usually 11:00 AM, though it varies by home — the exact time is shown in your booking. Need a later check-out? Message your host from your trip; many are happy to accommodate when the calendar allows.",
      "Standard check-out is around 11 AM (each listing shows its own). For a late check-out, just message your host through your trip — it's often possible for a small fee or free if the place is open.",
    ],
    quickReplies: ['How do I check in?', 'Message my host', 'View my trips'],
  },
  {
    id: 'rules',
    test: /(house rules|smoking|can i smoke|parties|party|events|noise|quiet hours|rules)/i,
    answers: [
      "Every home lists its house rules up front — things like smoking, parties/events, quiet hours and max guests. You'll see them before you book and again in your trip details, so there are never any surprises. Most homes are non-smoking and ask for no parties, but it's always shown per stay.",
      "Each host sets their own house rules (smoking, parties, quiet hours, pets, extra guests) and they're shown clearly on the listing and in your booking. If anything's unclear, you can message the host before you book.",
    ],
    quickReplies: ['Pet-friendly stays', 'How do I cancel?', 'Find a stay'],
  },
  {
    id: 'safety',
    test: /(safe|safety|secure|scam|legit|trust|verified|fake|is this real|protected)/i,
    answers: [
      "Your safety comes first. Every host is verified, listings are reviewed, and all payments are encrypted — and StayOn holds your money securely until check-in, so it's only released once you've arrived. You'll also see real guest reviews on every stay.",
      "Great to ask! StayOn verifies hosts, secures every payment, and holds your funds until check-in for your protection. Genuine guest reviews and ratings on each listing help you book with confidence.",
    ],
    quickReplies: ['How do I pay?', 'How do I cancel?', 'Find a stay'],
  },
  {
    id: 'directions',
    test: /(directions|how (?:do|to) (?:i )?get there|exact address|where is it|navigate|find the (?:place|stay)|map to)/i,
    answers: [
      "Once your booking is confirmed, the stay's exact address appears in your trip, and you'll find the location on a map inside the stay details with a “Get directions” button that opens turn-by-turn navigation. Before booking, listings show the general area for privacy.",
      "After you confirm a booking, open it from your Trips — the precise address is revealed, and the stay details show a map pinpointing the location with one-tap directions. (Before confirmation, only the approximate area is shown.)",
    ],
    quickReplies: ['View my trips', 'How do I check in?', 'Find a stay'],
  },
  {
    id: 'currency',
    test: /(currency|rupees?|inr|₹|dollars?|usd|\$|exchange rate|which money|change currency|local currency)/i,
    answers: [
      "Prices are shown in your local currency automatically — ₹ (INR) if you signed in with an Indian number, and US$ otherwise. You can switch currency anytime in Profile → Settings → Language & currency.",
      "We show prices in your currency based on your country: Indian rupees for India, US dollars elsewhere. Want a different one? Change it under Language & currency in Settings.",
    ],
    quickReplies: ['Find a stay', 'What are the fees?', 'How do I pay?'],
  },
  {
    id: 'account',
    test: /(sign ?up|sign ?in|log ?in|register|create (?:an )?account|my account|verify my number|otp|country code)/i,
    answers: [
      "Signing in is quick: pick your country code, enter your phone number, and we'll text a one-time code — or continue with Google or Apple. No passwords to remember, and it keeps your account secure.",
      "You can join in seconds — choose your country (with the flag picker), pop in your phone number for a one-time code, or use Google/Apple. That's it!",
    ],
    quickReplies: ['Find a stay', 'Is it secure?', 'How do I pay?'],
  },
  {
    id: 'wishlist',
    test: /(wishlist|wish list|save (?:a |this )?stay|favourite|favorite|bookmark|save for later)/i,
    answers: [
      "Tap the heart on any stay to save it to a wishlist — great for comparing options or planning a trip with others. You'll find all your saved homes in the Wishlists tab, organised into collections you can name.",
      "Love a place? Tap its heart to add it to a wishlist. Open the Wishlists tab anytime to see everything you've saved, grouped into your own collections.",
    ],
    quickReplies: ['Find a stay', 'View my trips', 'How do I book?'],
  },
  {
    id: 'trips',
    test: /(my (?:trips?|bookings?|reservations?)|where (?:are|is) my (?:booking|trip|reservation)|upcoming trip|trip wallet|receipt|itinerary)/i,
    answers: [
      "Everything you've booked lives in the Trips tab — upcoming and past stays, with confirmation codes, receipts, the exact address (once confirmed) and your itinerary. You can also message your host or cancel from there.",
      "Head to the Trips tab to see all your bookings — upcoming and completed — along with receipts, directions, and options to message the host or cancel.",
    ],
    quickReplies: ['How do I cancel?', 'How do I check in?', 'Find a stay'],
  },
  {
    id: 'contact_host',
    test: /(contact (?:the )?host|message (?:the )?host|talk to (?:the )?host|reach the host|ask the host|host (?:phone|number|contact))/i,
    answers: [
      "You can message your host anytime — open your booking in the Trips tab and tap Message. They're your go-to for check-in details, local tips, or any special requests.",
      "Just open the booking in Trips and tap Message to chat with your host directly — perfect for questions about arrival, parking or anything about the home.",
    ],
    quickReplies: ['View my trips', 'How do I check in?', 'Find a stay'],
  },
  {
    id: 'long_stay',
    test: /(monthly|weekly|long[\s-]?term|long stay|month-long|extended stay|discount for (?:a )?(?:week|month)|stay for a month)/i,
    answers: [
      "For longer trips, many hosts offer weekly and monthly discounts that apply automatically as you add nights — so the longer you stay, the better the nightly rate. Tell me your dates and I'll find great long-stay value.",
      "Planning a longer escape? Lots of stays include weekly or monthly discounts that kick in automatically. Share your destination and dates and I'll find the best long-term value.",
    ],
    quickReplies: ['Find a monthly stay', 'Budget city break', 'Find a stay'],
  },
  {
    id: 'deposit',
    test: /(security deposit|damage deposit|deposit|hold on my card|refundable deposit)/i,
    answers: [
      "Some homes ask for a refundable security deposit — if so, it's shown clearly before you book and is released back to you shortly after check-out, provided there's no damage. Many stays don't require one at all.",
      "A few hosts request a refundable security deposit (always disclosed up front). It's returned after check-out assuming everything's in order — and plenty of homes have no deposit at all.",
    ],
    quickReplies: ['What are the fees?', 'How do I pay?', 'Find a stay'],
  },
  {
    id: 'become_host',
    test: /(become (?:a )?host|list my (?:place|home|property|apartment)|rent out|start hosting|host my|earn (?:money|income) (?:by|from|hosting|renting)|put my (?:place|home) on|how (?:do|can) i host)/i,
    keywords: ['host', 'hosting', 'list', 'rent out', 'become a host', 'earn', 'landlord', 'put my place'],
    answers: [
      "You can absolutely host on StayOn! Tap your profile and choose “Switch to hosting”, then create a listing with a quick step-by-step wizard — photos, amenities, the vibe it matches, house rules and your price. The best part: StayOn takes 0% commission, so you keep 100% of what you earn. Want me to walk you through it?",
      "Hosting is easy and fee-free! Switch to hosting from your profile, add your place through the guided wizard, and you're live. We charge hosts no commission at all — you keep every cent of your nightly rate plus cleaning. Shall I point you to the listing steps?",
    ],
    quickReplies: ['How do payouts work?', 'Is hosting really free?', 'Find a stay'],
  },
  {
    id: 'host_payout',
    test: /(get paid|host payout|when (?:do|will) i (?:get|receive) (?:paid|money|payout)|payout schedule|my earnings|host earnings|bank (?:account|details) for payout)/i,
    keywords: ['payout', 'get paid', 'earnings', 'how much do i earn', 'bank', 'when do i get paid', 'income'],
    answers: [
      "As a host, your payout is released about 24 hours after each guest checks in, straight to your bank, UPI or PayPal. Since StayOn charges hosts 0% commission, you receive the full nightly rate plus your cleaning fee — only taxes pass through. You can track every payout, day-wise and month-wise, in the host Payouts screen.",
      "Hosts get paid ~24h after check-in to their chosen method, and with our 0% commission you keep 100% of the rate + cleaning. The host app shows your earnings broken down by day and month, plus your next scheduled payout.",
    ],
    quickReplies: ['Become a host', 'Is hosting free?', 'Find a stay'],
  },
  {
    id: 'reels',
    test: /(stay ?reels?|\breels?\b|\bvlog\b|post a (?:video|reel|vlog)|share a (?:video|reel)|video tour)/i,
    keywords: ['reel', 'reels', 'stayreels', 'vlog', 'video', 'post a video', 'short video', 'tour video'],
    answers: [
      "StayReels are short vertical videos of stays and places — like a travel feed you can swipe through on the Home screen. Both guests and hosts can post them: tap “Post a reel”, pick a video from your gallery, add a title and caption, and submit. Our team reviews each one before it goes live, then you can tap “View this stay” inside a reel to jump straight to booking.",
      "Reels are StayOn's video feed — swipe through real clips of homes and destinations on Home. Anyone can post: choose a video from your phone, fill in a couple of details, and it goes live after a quick review. Tapping a reel lets you open and book the stay it shows.",
    ],
    quickReplies: ['How do I post a reel?', 'Find a stay', 'How do I book?'],
  },
  {
    id: 'offers',
    test: /(offers?|discount|promo(?:tion)?|coupon|voucher|deal|first (?:booking|time) (?:discount|offer)|referr?al|invite (?:a )?friend|15 ?%|10 ?%)/i,
    keywords: ['offer', 'offers', 'discount', 'promo', 'coupon', 'deal', 'referral', 'first booking', 'invite', 'voucher'],
    answers: [
      "StayOn is premium, so we don't run constant sales — but there are two real savings: 15% off your very first booking, and 10% off when you book through a friend's referral. Beyond those, any other discounts (like weekly or last-minute rates) come straight from the host on each listing. Want me to find stays with host discounts?",
      "Two StayOn offers always apply: 15% off your first-ever booking and 10% on a referral booking. We don't do flash sales — everything else is set by hosts per stay (weekly/monthly or last-minute deals). Shall I look for great-value stays for you?",
    ],
    quickReplies: ['Find a stay', 'What are the fees?', 'Long-stay discounts'],
  },
  {
    id: 'things_to_do',
    test: /(things? to do|what to do|activities|attractions|sightseeing|places to (?:visit|see)|explore the area|local experiences?)/i,
    keywords: ['things to do', 'activities', 'attractions', 'sightseeing', 'what to do', 'places to visit', 'explore'],
    answers: [
      "For each destination you'll find a “Things to Do” section — curated activities and places with photos, what to do, the best time to visit, what to carry and traveller reviews. It's purely for inspiration (no bookings or fees), so you can plan your days around your stay. Tell me a city and I'll point you there!",
      "StayOn's Things to Do gives you ideas for every destination — local sights, activities, best seasons and tips, with real traveller reviews. It's informational only, to help you plan. Where are you headed?",
    ],
    quickReplies: ['Find a stay', 'Best time to visit', 'Explore destinations'],
  },
  {
    id: 'guidebook',
    test: /(local guide|guidebook|host recommendations?|where to eat|best (?:restaurants?|cafes?|spots?)|local tips|neighbou?rhood guide|recommend.*(?:nearby|local))/i,
    keywords: ['local guide', 'guidebook', 'recommendations', 'where to eat', 'local tips', 'neighbourhood', 'nearby spots'],
    answers: [
      "Many stays include a “Local guide” from the host right on the listing — their favourite places to eat, see and do nearby, plus how to get around. It's the inside scoop from someone who knows the area. Open any stay and scroll to “Local guide from your host”.",
      "Hosts can add a personal guidebook to their listing — top local restaurants, sights, activities and getting-around tips. You'll see it as “Local guide” on the stay page, along with a “Meet your host” section.",
    ],
    quickReplies: ['Find a stay', 'Things to do', 'Meet the host'],
  },
  {
    id: 'reviews',
    test: /(reviews?|ratings?|stars?|leave (?:a )?(?:review|feedback)|write a review|read reviews|guest reviews)/i,
    keywords: ['review', 'reviews', 'rating', 'stars', 'feedback', 'write a review', 'leave a review'],
    answers: [
      "Every stay shows real guest reviews and a star rating, so you can book with confidence. After your trip, you'll be invited to leave your own review from the Trips tab — it helps future travellers and the host. Honest reviews keep the whole community trustworthy.",
      "You'll find genuine reviews and ratings on each listing, and you can write your own after checkout from your Trips. Reviews are from verified guests who actually stayed there.",
    ],
    quickReplies: ['Find a stay', 'Is StayOn safe?', 'View my trips'],
  },
  {
    id: 'mode_switch',
    test: /(switch to (?:hosting|travel)|host mode|guest mode|travelling mode|change to host|go to host|same (?:account|login) for host)/i,
    keywords: ['switch to hosting', 'host mode', 'guest mode', 'become host', 'travelling mode', 'switch'],
    answers: [
      "StayOn is one app for both sides! Use a single login to travel and to host — just open your profile and tap “Switch to hosting” (or “Switch to travelling” to come back). No second account, no extra login. Your bookings and your listings live under the same you.",
      "One account does it all. From your profile you can flip between “Travelling” and “Hosting” anytime with the same phone login — book stays as a guest and manage your own listings as a host, seamlessly.",
    ],
    quickReplies: ['Become a host', 'How do payouts work?', 'Find a stay'],
  },
  {
    id: 'confirmation_code',
    test: /(confirmation (?:code|number)|booking (?:code|reference|id)|reference number|booking number|where(?:'?s| is) my code)/i,
    keywords: ['confirmation code', 'booking code', 'reference number', 'booking id', 'my code'],
    answers: [
      "Every confirmed booking gets a unique confirmation code (like STY-A8K2M1). You'll see it on your confirmation screen, in the Trips tab and on your receipt — and your host sees the exact same code on their side, so you're always in sync.",
      "Your confirmation code appears the moment you book — find it in Trips and on your receipt. It's the same reference your host sees, handy for any questions about the reservation.",
    ],
    quickReplies: ['View my trips', 'How do I check in?', 'Find a stay'],
  },
  {
    id: 'identity',
    test: /(verify (?:my )?(?:identity|id)|id verification|kyc|identity verification|verify (?:my )?account|get verified)/i,
    keywords: ['verify identity', 'id verification', 'kyc', 'verification', 'verify my account', 'get verified'],
    answers: [
      "Identity verification keeps StayOn trustworthy. You can verify your ID from your profile — it unlocks instant booking on some premium stays and, for hosts, it's required before any payout-detail changes are approved. Your legal details stay private; only a friendly public profile is shown to others.",
      "Verifying your identity (a quick ID check in your profile) builds trust, unlocks instant booking on certain stays, and is needed for hosts to change payout details securely. Your private info is never shown publicly.",
    ],
    quickReplies: ['Is StayOn safe?', 'How do I pay?', 'Find a stay'],
  },

  // ── Travel-concierge knowledge (broad "ask me anything about a trip") ────────
  {
    id: 'best_time',
    test: /(best time (?:to|of year)|when (?:should|to) (?:i )?(?:visit|go|travel)|peak season|off[\s-]?season|which month.*(?:visit|go)|good time to (?:visit|go))/i,
    keywords: ['best time to visit', 'when to go', 'when to visit', 'peak season', 'off season', 'which month', 'good time'],
    answers: [
      "Great question! The best time really depends on the destination — beach spots shine in their dry season, cities are lovely in spring and autumn, and ski places peak in winter. Tell me where you're headed and I'll suggest the ideal months and find stays for them.",
      "It varies by place — tell me your destination and I'll give you the best months to visit (and the prices are often better just outside peak season). Where are you thinking of going?",
    ],
    quickReplies: ['Find a stay', 'Things to do', 'Beach in winter'],
  },
  {
    id: 'weather',
    test: /(weather|climate|temperature|how (?:hot|cold|warm)|rain(?:y|fall)?|sunny|forecast|will it (?:rain|snow))/i,
    keywords: ['weather', 'climate', 'temperature', 'how hot', 'how cold', 'rain', 'forecast', 'sunny'],
    answers: [
      "I can't pull a live forecast, but I can tell you the general feel — coastal spots are warm and breezy, mountains are cooler (and snowy in winter), and cities have proper seasons. Tell me the place and month and I'll guide you, then find stays to match.",
      "For a live forecast you'll want a weather app, but I'm happy to advise on the typical climate by season for your destination — just tell me where and when, and I'll suggest the best time and stays.",
    ],
    quickReplies: ['Best time to visit', 'Find a stay', 'What to pack'],
  },
  {
    id: 'packing',
    test: /(what (?:should i|to) (?:pack|bring|carry|wear)|packing list|what do i need to bring|things to carry)/i,
    keywords: ['what to pack', 'what to bring', 'packing list', 'what to wear', 'what to carry', 'things to bring'],
    answers: [
      "Pack for the vibe! Beach trips: swimwear, sunscreen and light layers. Cities: comfy shoes and a smart outfit or two. Mountains/ski: warm layers and waterproofs. Most StayOn homes include essentials like towels, linens and a hairdryer (check the amenities). Where are you off to?",
      "Light layers work almost everywhere; add sunscreen for the beach or warm waterproofs for the mountains. Your stay's amenities list shows what's already provided so you can pack lighter. Tell me the destination and I'll tailor a quick list.",
    ],
    quickReplies: ['What does the stay provide?', 'Best time to visit', 'Find a stay'],
  },
  {
    id: 'transport',
    test: /(getting around|how (?:do|to) (?:i )?get (?:around|to|from)|airport (?:transfer|pickup|to)|public transport|metro|subway|taxi|uber|car (?:rental|hire)|rent a car|train|bus)/i,
    keywords: ['getting around', 'airport', 'transport', 'metro', 'subway', 'taxi', 'uber', 'car rental', 'rent a car', 'train', 'how to get there'],
    answers: [
      "For getting around, big cities have great metros and ride-hailing (Uber/Bolt/local apps), while smaller or rural stays are easiest with a rental car. Many hosts add a “getting around” note in their Local guide on the listing. Want me to find stays near transport or with parking?",
      "Most cities are easy by metro or rideshare; coastal and countryside stays usually suit a hire car. Check the host's Local guide on each stay for specifics, and I can find places close to transit or with parking. Where are you headed?",
    ],
    quickReplies: ['Stays with parking', 'Local guide', 'Find a stay'],
  },
  {
    id: 'food',
    test: /(where to eat|good (?:food|restaurants?|cafes?)|local (?:food|cuisine|dishes?)|what to eat|best restaurants?|breakfast|dinner spots?)/i,
    keywords: ['where to eat', 'food', 'restaurants', 'local cuisine', 'what to eat', 'best restaurants', 'cafes', 'dinner'],
    answers: [
      "Foodie at heart? Many hosts list their favourite local restaurants and cafés in the “Local guide” on their stay, and a kitchen amenity means you can cook too. Tell me the city and I'll find stays near the best eats (or with a great kitchen).",
      "The tastiest tips usually come from the host's Local guide on each listing — real neighbourhood spots, not tourist traps. Want stays with a full kitchen, or near a buzzing food scene? Just tell me where.",
    ],
    quickReplies: ['Stays with a kitchen', 'Local guide', 'Find a stay'],
  },
  {
    id: 'modify_booking',
    test: /(change (?:my )?(?:booking|dates|reservation)|modify (?:my )?(?:booking|reservation)|reschedule|move my (?:dates|booking)|add (?:more )?nights|extend (?:my )?(?:stay|booking)|shorten my stay)/i,
    keywords: ['change my booking', 'change dates', 'modify booking', 'reschedule', 'extend my stay', 'add nights', 'move my dates'],
    answers: [
      "Need to change a trip? Open the booking in your Trips tab — from there you can request new dates or extend your stay, subject to the host's calendar and policy. If the host approves, any price difference is adjusted automatically. Want me to take you to your trips?",
      "You can request changes (new dates or extra nights) right from the booking in your Trips tab. It depends on availability and the host's policy, but most are flexible. Shall I help you find a stay with flexible changes?",
    ],
    quickReplies: ['View my trips', 'How do I cancel?', 'Flexible stays'],
  },
  {
    id: 'support',
    test: /(customer (?:service|support|care)|talk to (?:a )?(?:human|person|agent)|contact (?:stayon|support|you)|help ?line|complaint|report (?:a )?(?:problem|issue)|raise (?:a )?(?:ticket|complaint))/i,
    keywords: ['customer service', 'support', 'talk to a human', 'contact stayon', 'help line', 'report a problem', 'agent', 'complaint'],
    answers: [
      "I'm here 24/7 and can sort most things on the spot, but if you'd like a human, head to Profile → Help / Customer support and our team will jump in. For anything about a specific booking, opening it in Trips gets help fastest. What's troubling you — maybe I can fix it now?",
      "Happy to help right here! For a human agent, go to Profile → Get help / Support. If it's about a booking, open it in Trips and tap Support. Tell me what's wrong and I'll do my best first.",
    ],
    quickReplies: ['It\'s about a booking', 'A payment issue', 'Find a stay'],
  },
  {
    id: 'lost_item',
    test: /(left (?:my |something|behind)|lost (?:my |property|item)|forgot (?:my )?(?:something|charger|phone|keys)|found my)/i,
    keywords: ['left something', 'lost item', 'forgot', 'lost property', 'left behind', 'i lost'],
    answers: [
      "Oh no — left something behind? Message the host straight from that booking in your Trips tab; they're usually happy to post it on to you or hold it for collection. The sooner you reach out, the better. Want me to open your trips?",
      "Don't worry — open the stay in your Trips and message the host; most will return a forgotten item by post or keep it safe for you. Shall I take you there?",
    ],
    quickReplies: ['View my trips', 'Message my host', 'Customer support'],
  },
  {
    id: 'accessibility',
    test: /(wheelchair|accessible|accessibility|step[\s-]?free|disabled access|mobility|elevator|lift access|ground floor)/i,
    keywords: ['wheelchair', 'accessible', 'accessibility', 'step free', 'disabled access', 'mobility', 'elevator', 'ground floor'],
    answers: [
      "Accessibility matters. Listings note features like step-free entry, lifts and ground-floor rooms in their details, and you can message a host to confirm specifics before booking. Tell me your destination and needs, and I'll look for suitable stays.",
      "Many stays list accessibility features (step-free access, elevators, ground-floor bedrooms). It's always worth messaging the host to be sure. Where are you headed — I'll find accessible options.",
    ],
    quickReplies: ['Find a stay', 'Message a host', 'Is StayOn safe?'],
  },
  {
    id: 'group_event',
    test: /(big group|large group|group (?:trip|booking|of)|bachelor(?:ette)?|stag|hen (?:do|party)|wedding|reunion|event|how many (?:people|guests) (?:can|max)|sleeps how many)/i,
    keywords: ['big group', 'large group', 'group trip', 'bachelor', 'stag', 'hen', 'wedding', 'reunion', 'event', 'how many guests'],
    answers: [
      "Travelling as a group? Tell me how many of you there are and I'll find homes that sleep everyone comfortably. A quick heads-up: most stays don't allow parties or events (it's in the house rules), but plenty are perfect for groups who just want space together. How many guests?",
      "I can find places that sleep your whole group — just tell me the headcount. Note that events/parties usually aren't permitted (check each listing's house rules), but there are great large homes for group getaways. How many people?",
    ],
    quickReplies: ['Family of 4', '6 guests', 'Find a stay'],
  },
  {
    id: 'tipping_etiquette',
    test: /(do i tip|tipping|gratuity|should i tip|customs?|etiquette|local (?:customs|rules))/i,
    keywords: ['tipping', 'do i tip', 'gratuity', 'etiquette', 'local customs'],
    answers: [
      "On StayOn there's no tipping needed for hosts — your payment is the full price, and hosts keep 100% (we charge 0% fee). For local services (restaurants, taxis) tipping customs vary by country; the host's Local guide often mentions them. Where are you visiting?",
      "No tips required on StayOn — the price you see is it. Out and about, tipping norms differ by country, and your host's Local guide can clue you in. Want me to find you a stay?",
    ],
    quickReplies: ['What are the fees?', 'Local guide', 'Find a stay'],
  },
  {
    id: 'languages_bot',
    test: /(what languages?|do you speak|can you speak|speak (?:spanish|french|hindi|german)|habla|parlez|translate)/i,
    keywords: ['what languages', 'do you speak', 'can you speak', 'translate', 'languages'],
    answers: [
      "I chat best in English for now, but I understand plenty of everyday phrasings — just talk to me naturally! Tell me where you'd like to go and what you're after, and I'll find your stay.",
      "English is my main language at the moment, though I try to follow casual wording too. Where would you like to travel? I'll take it from there.",
    ],
    quickReplies: ['Find a stay', 'What can you do?', 'Things to do'],
  },
  {
    id: 'who_made_you',
    test: /(who (?:made|built|created) you|are you (?:chatgpt|gemini|gpt|claude)|which (?:ai|model)|powered by|who are you really)/i,
    keywords: ['who made you', 'who built you', 'are you chatgpt', 'are you gemini', 'which ai', 'what model', 'powered by'],
    answers: [
      "I'm StayBot — StayOn's own travel concierge, built right into the app to understand what you need and match you to real, bookable stays. I'm focused entirely on helping you travel well. Where shall we start?",
      "I'm StayBot, StayOn's in-app assistant — made to plan and book your perfect stay. Less small talk, more great trips! Tell me where you'd like to go.",
    ],
    quickReplies: ['What can you do?', 'Find a stay', 'How does StayOn work?'],
  },
  {
    id: 'fun',
    test: /(tell me a joke|make me laugh|are you bored|do you (?:sleep|eat|dream)|favou?rite (?:place|destination|stay)|recommend (?:somewhere|a place) (?:nice|cool|fun))/i,
    keywords: ['joke', 'make me laugh', 'favourite place', 'favorite destination', 'recommend somewhere', 'fun'],
    answers: [
      "Here's one: I tried to organise a trip to the Himalayas… but it was all downhill from there. 😄 Now, shall we plan a real escape? Tell me a vibe — beach, city or mountains?",
      "My favourite destinations are wherever you're headed next! Give me a vibe — beachfront, buzzing city, or a cosy cabin — and I'll find somewhere wonderful.",
    ],
    quickReplies: ['Beachfront getaway', 'A city break', 'A cosy cabin'],
  },
  {
    id: 'invoice_tax',
    test: /(invoice|gst|tax (?:receipt|invoice|document)|business (?:trip|receipt)|expense|vat|receipt for work)/i,
    keywords: ['invoice', 'gst', 'tax receipt', 'business trip', 'expense', 'vat', 'receipt for work'],
    answers: [
      "For business or expenses, every booking has a receipt with the full breakdown (stay, cleaning, taxes — and a clear 0% platform fee) in your Trips and on the Receipts screen. You can share it for your records anytime. Need help finding a past one?",
      "You'll find an itemised receipt for each booking under Trips / Receipts — handy for expenses, with taxes shown separately. Want me to point you there?",
    ],
    quickReplies: ['View my receipts', 'What are the fees?', 'Find a stay'],
  },
];

// Fuzzy knowledge matcher — scores every KB entry against the message using both
// its precise regex and plain keyword overlap, so questions phrased in any way
// still find the right StayOn answer. Used as a smart catch before the generic
// fallback so the bot rarely says "I didn't get that".
function bestKbMatch(text: string): KbEntry | undefined {
  const n = normalize(text);
  let best: KbEntry | undefined;
  let bestScore = 0;
  for (const kb of KNOWLEDGE_BASE) {
    let score = 0;
    if (kb.test.test(text)) score += 3;
    if (kb.keywords) for (const k of kb.keywords) if (n.includes(k)) score += 2;
    if (score > bestScore) { bestScore = score; best = kb; }
  }
  return bestScore >= 2 ? best : undefined;
}

// ── analysis ────────────────────────────────────────────────────────────────
interface Analysis {
  intents: Intent[];
  destination?: string;
  maxPrice?: number;
  minPrice?: number;
  guests?: number;
  nights?: number;
  month?: string;
  whenText?: string;
  vibes: string[];
  amenities: string[];
}

// collapse 3+ repeated letters: "hyyy"->"hy", "heyyy"->"hey", "hellooo"->"hello"
function normalize(t: string): string {
  return t.toLowerCase().trim().replace(/(.)\1{2,}/g, '$1');
}

function detectIntents(raw: string): Intent[] {
  const out: Intent[] = [];
  const t = raw;
  const n = normalize(raw);
  const has = (...w: string[]) => w.some((x) => new RegExp(`(^|\\b)${x}(\\b|$)`, 'i').test(t));

  // Greeting — fuzzy, handles typos/elongation via normalized text.
  if (/^(h+i+|h+y+|h+e+y+|hello|heya|hiya|yo|sup|wassup|whatsup|howdy|hola|namaste|greetings|gm|good (morning|afternoon|evening|day))\b/i.test(n)) out.push('greeting');

  if (has('thanks', 'thank you', 'thankyou', 'appreciate', 'cheers', 'thx', 'ty')) out.push('thanks');
  if (/(start over|reset|new search|clear|start again|forget (it|that)|never mind)/i.test(t)) out.push('reset');
  if (/(problem|issue|wrong|not working|doesn'?t work|disappointed|terrible|awful|bad experience|refund|complaint|angry|frustrat|unhappy|cancel my|messed up|error|horrible|worst)/i.test(t)) out.push('complaint');
  if (/(book it|reserve it|i'?ll take (it|this)|let'?s book|i want this one|take it|book the|reserve the|confirm (it|booking)|proceed)/i.test(t)) out.push('book');
  if (/(help|how do|how does|what can you|what do you do|how can you|how it works|how this works)/i.test(t)) out.push('help');
  if (/^(yes|yeah|yep|yup|sure|ok|okay|sounds good|perfect|great|please do|go ahead|absolutely|yess|definitely|that works)\b/i.test(n)) out.push('affirm');
  if (/^(no|nope|nah|not really|not now|maybe later)\b/i.test(n)) out.push('deny');
  if (/(how are you|how'?s it going|what'?s your name)/i.test(t)) out.push('smalltalk');

  // App info — "what is this app", "what's special", "what do you offer", etc.
  if (/(what(?:'?s| is)? (?:this app|stayon|the app)|what(?:'?s| is)? (?:so )?special|what(?:'?s| is)? (?:your |the )?special(?:ty|ity|isation|ization)|special(?:ty|ity)|what (?:do|can) (?:you|this app|stayon) (?:offer|do)|what(?:'?s| is) different|tell me about (?:this app|stayon|yourself|the app|it)|about (?:the app|stayon)|why (?:use|choose|pick) (?:stayon|this app)|why stayon|what makes (?:this|stayon|it) (?:special|different|unique)|how is (?:this|stayon) different)/i.test(t)) out.push('app_info');

  // FAQ — cancellation / refund
  if (/(how (?:do|can) i cancel|cancel(?:lation| my booking| a booking| my reservation)?|cancellation policy|refund|get my money back|money back)/i.test(t)) out.push('faq_cancel');
  // FAQ — payment methods
  if (/(payment method|how (?:do|can) i pay|how do i pay|ways? to pay|which cards?|what cards?|accept(?:ed)? cards?|credit card|debit card|apple pay|google pay|paypal|do you (?:take|accept))/i.test(t)) out.push('faq_payment');
  // FAQ — fees / hidden charges
  if (/(fees?|service fee|platform fee|booking fee|extra charges?|hidden (?:fees?|charges?|costs?)|hidden|surcharge|how much (?:extra|more)|additional (?:cost|charge|fee)|what (?:are|is) the (?:fees?|charges?))/i.test(t)) out.push('faq_fees');
  // FAQ — check-in
  if (/(check[\s-]?in|self check|check out|keys?|key pickup|key collection|when can i (?:arrive|get in)|how do i get in)/i.test(t)) out.push('faq_checkin');
  // FAQ — pets
  if (/(\bpets?\b|\bdogs?\b|pet[\s-]?friendly|bring my (?:dog|cat|pet)|travel with (?:my )?(?:dog|pet))/i.test(t)) out.push('faq_pets');
  // FAQ — how the bot works / is it AI / real
  if (/(how (?:do|does) (?:you|this|it) work|are you (?:a |an )?(?:bot|robot|human|ai|real)|who are you|what are you|real person|actual (?:person|human))/i.test(t)) out.push('faq_howbot');

  // Capability / can-you — "can I find...", "do you book...", etc.
  if (/(?:can i|can you|could you|do you|are you able(?: to)?|is it possible(?: to)?|will you|would you|able to)\b.{0,40}\b(find|book|help|cancel|pay|search|recommend|plan|suggest|show|get|locate|reserve|arrange|sort)/i.test(t)) out.push('capability');

  // Wants to find a stay but hasn't given details — a search *initiation*.
  if (/(look(ing)?|search(ing)?|find|want|need|after|get me|show me|help me)\b.{0,30}\b(stay|place|home|house|villa|apartment|flat|room|accommodation|somewhere|spot|trip|vacation|holiday|getaway|rental|booking|airbnb)/i.test(t)
      || /^(i (want|need) (a|to)|find me|show me|book a|plan (a|my)|i'?m planning)\b/i.test(t)
      || /\b(stay|place to stay|somewhere to stay|a getaway|a vacation|a holiday)\b/i.test(t)) {
    out.push('wants_stay');
  }
  return out;
}

function detectDestination(t: string): string | undefined {
  const lower = t.toLowerCase();
  // Spaceless form so "newyork", "new-york", "losangeles" still match.
  const squashed = lower.replace(/[^a-z0-9]/g, '');
  const aliases: Record<string, string> = {
    nyc: 'New York', 'new york city': 'New York', newyork: 'New York', manhattan: 'New York',
    la: 'Los Angeles', losangeles: 'Los Angeles', sf: 'San Francisco', sanfran: 'San Francisco',
    uk: 'London', 'the uk': 'London',
  };
  for (const [k, v] of Object.entries(aliases)) {
    if (new RegExp(`\\b${k}\\b`, 'i').test(lower) || squashed.includes(k.replace(/[^a-z0-9]/g, ''))) return v;
  }
  for (const s of BOT_STAYS) {
    const city = s.city.toLowerCase();
    const citySquashed = city.replace(/[^a-z0-9]/g, '');
    if (lower.includes(city) || (citySquashed.length >= 5 && squashed.includes(citySquashed))) return s.city;
  }
  const countries = ['usa', 'united states', 'america', 'uk', 'united kingdom', 'england', 'scotland', 'france', 'italy', 'spain', 'netherlands', 'europe'];
  for (const c of countries) {
    if (lower.includes(c)) return c === 'usa' || c === 'america' || c === 'united states' ? 'USA'
      : c === 'uk' || c === 'england' || c === 'united kingdom' ? 'United Kingdom'
      : c.charAt(0).toUpperCase() + c.slice(1);
  }
  return undefined;
}

function detectBudget(t: string): { maxPrice?: number; minPrice?: number } {
  const between = t.match(/between\s*\$?(\d{2,4})\s*(?:and|-|to)\s*\$?(\d{2,4})/i);
  if (between) return { minPrice: +between[1], maxPrice: +between[2] };
  const range = t.match(/\$?(\d{2,4})\s*-\s*\$?(\d{2,4})/);
  if (range) return { minPrice: +range[1], maxPrice: +range[2] };
  const under = t.match(/(?:under|below|less than|max|up to|no more than)\s*\$?(\d{2,4})/i);
  if (under) return { maxPrice: +under[1] };
  const over = t.match(/(?:over|above|more than|at least|minimum)\s*\$?(\d{2,4})/i);
  if (over) return { minPrice: +over[1] };
  const around = t.match(/(?:around|about|near|~)\s*\$?(\d{2,4})/i);
  if (around) return { maxPrice: Math.round(+around[1] * 1.2), minPrice: Math.round(+around[1] * 0.8) };
  const bare = t.match(/\$(\d{2,4})/);
  if (bare) return { maxPrice: +bare[1] };
  return {};
}

function detectGuests(t: string): number | undefined {
  const m = t.match(/(\d{1,2})\s*(people|guests|adults|persons|pax|of us|travelers|travellers)/i);
  if (m) return Math.min(16, +m[1]);
  // "for 2" — but NOT "for 2 days/nights/weeks/months" (that's a duration).
  const f = t.match(/\b(?:for|party of|group of|sleeps)\s+(\d{1,2})\b(?!\s*(?:days?|nights?|weeks?|months?))/i);
  if (f) return Math.min(16, +f[1]);
  if (/\b(just me|solo|myself|alone)\b/i.test(t)) return 1;
  if (/\b(couple|for two|the two of us|me and my (partner|wife|husband|girlfriend|boyfriend))\b/i.test(t)) return 2;
  if (/\bfamily\b/i.test(t)) return 4;
  return undefined;
}

const MONTH_NAMES = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
const MONTH_ABBR = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'sept', 'oct', 'nov', 'dec'];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

// Extract trip duration (nights), a target month, and a human "when" phrase.
function detectDates(t: string): { nights?: number; month?: string; whenText?: string } {
  const lower = t.toLowerCase();
  let nights: number | undefined;
  let month: string | undefined;
  let whenText: string | undefined;

  // Duration
  const dur = lower.match(/(\d{1,2})\s*(nights?|days?)\b/);
  if (dur) nights = Math.min(60, Math.max(1, +dur[1]));
  else if (/\b(a|one)\s+weeks?\b/.test(lower)) nights = 7;
  else if (/\bfortnight\b/.test(lower)) nights = 14;
  else if (/\bweekend\b/.test(lower)) nights = 2;

  // Month (full names + abbreviations). 'may' is guarded — only as a real month.
  for (let i = 0; i < MONTH_NAMES.length; i++) {
    const full = MONTH_NAMES[i];
    const abbr = MONTH_ABBR[i];
    if (full === 'may') {
      if (/\b(in|during|by|for|around|this|next|early|late|mid|over)\s+may\b/.test(lower) || /\bmay\s+\d/.test(lower) || /\d\s+may\b/.test(lower)) {
        month = 'May';
        break;
      }
      continue;
    }
    if (new RegExp(`\\b${full}\\b`).test(lower) || new RegExp(`\\b${abbr}\\b`).test(lower)) {
      month = cap(full);
      break;
    }
  }

  // Relative phrases
  if (/\bnext month\b/.test(lower)) whenText = 'next month';
  else if (/\bthis month\b/.test(lower)) whenText = 'this month';
  else if (/\bnext weekend\b/.test(lower)) { whenText = 'next weekend'; nights = nights ?? 2; }
  else if (/\bthis weekend\b/.test(lower)) { whenText = 'this weekend'; nights = nights ?? 2; }
  else if (/\bnext week\b/.test(lower)) whenText = 'next week';
  else if (/\btomorrow\b/.test(lower)) whenText = 'tomorrow';
  else if (/\btonight\b/.test(lower)) whenText = 'tonight';
  else if (month) whenText = month;

  return { nights, month, whenText };
}

function detectTags(t: string, dict: Record<string, string[]>): string[] {
  const lower = ` ${t.toLowerCase()} `;
  const found: string[] = [];
  for (const [tag, words] of Object.entries(dict)) {
    if (words.some((w) => lower.includes(w))) found.push(tag);
  }
  return found;
}

export function analyze(text: string): Analysis {
  const t = text.trim();
  const { maxPrice, minPrice } = detectBudget(t);
  const vibes = detectTags(t, VIBE_WORDS);
  if (vibes.includes('luxury') && minPrice === undefined) { /* luxury implies higher floor */ }
  const intents = detectIntents(t);
  const destination = detectDestination(t);
  const guests = detectGuests(t);
  const { nights, month, whenText } = detectDates(t);
  const amenities = detectTags(t, AMENITY_WORDS);
  // If the message clearly carries travel signal, mark it a search.
  if (destination || maxPrice || minPrice || guests || nights || month || whenText || vibes.length || amenities.length) intents.push('search');
  return { intents, destination, maxPrice, minPrice, guests, nights, month, whenText, vibes, amenities };
}

// Concrete amenities that actually exist on stays (so we can hard-filter by
// them). Requested amenities NOT in here (e.g. self check-in, instant book) are
// "universal" — offered broadly — so they refine wording but never exclude.
const AVAILABLE_AMENITIES = new Set<string>(BOT_STAYS.flatMap((s) => s.amenities));

// ── LIVE recommendation from the real backend ───────────────────────────────
// Maps a backend listing → BotStay so the bot recommends REAL bookable stays
// (the host's own + the live catalogue), not just demo data.
function beToBotStay(l: any): BotStay {
  const imgs: string[] = (l.images || [])
    .map((i: any) => (typeof i === 'string' ? i : (i?.url || i?.uri)))
    .filter(Boolean);
  const first = imgs[0] || 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&h=400&fit=crop';
  return {
    id: `be_${l.id}`, hostListingId: l.id,
    title: l.title || 'Stay', city: l.city || '', country: l.country || '', city_: l.city,
    location: [l.city, l.country].filter(Boolean).join(', '),
    price: l.priceUSD || 0, rating: l.ratingAvg || 0, reviews: l.ratingCount || 0,
    image: first, images: imgs.length ? imgs : [first],
    type: l.type || 'Stay', maxGuests: l.guests || 2, beds: l.beds || 1, baths: l.bathrooms || 1,
    vibes: l.vibes || [], amenities: l.amenities || [],
    latitude: l.lat || 0, longitude: l.lng || 0, instantBook: !!l.instantBook,
  };
}

// Query the backend with the slots the bot has filled. Returns [] on any error
// so the bot always falls back to its demo recommendations.
export async function recommendLive(ctx: BotContext): Promise<BotStay[]> {
  const sp: Record<string, string | number> = {};
  if (ctx.destination) sp.q = ctx.destination;
  if (ctx.guests) sp.guests = ctx.guests;
  if (ctx.maxPrice) sp.maxPrice = ctx.maxPrice;
  if (ctx.minPrice) sp.minPrice = ctx.minPrice;
  if (ctx.amenities?.length) sp.amenities = ctx.amenities.join(',');
  try {
    const { Api } = await import('../api');
    await Api.auth.ensureSession();
    const r: any = await Api.search(sp);
    return (r.results || []).map(beToBotStay);
  } catch { return []; }
}

// ── recommendation ──────────────────────────────────────────────────────────
export function recommend(ctx: BotContext): BotStay[] {
  const minP = ctx.minPrice ?? (ctx.vibes.includes('luxury') ? 300 : undefined);
  const maxP = ctx.maxPrice ?? (ctx.vibes.includes('budget') ? 120 : undefined);

  const scored = BOT_STAYS.map((s) => {
    let score = s.rating * 0.6;
    let hardFail = false;

    if (ctx.destination) {
      const d = ctx.destination.toLowerCase();
      if (s.city.toLowerCase().includes(d) || s.country.toLowerCase().includes(d) ||
          (d === 'usa' && s.country.includes('USA'))) score += 6;
      else hardFail = true; // strict: only show stays in the requested place
    }
    if (maxP !== undefined) {
      if (s.price <= maxP * 1.05) score += 3; else hardFail = true;
    }
    if (minP !== undefined && s.price >= minP) score += 2;
    if (ctx.guests !== undefined) {
      if (s.maxGuests >= ctx.guests) score += 1.5; else hardFail = true;
    }
    for (const v of ctx.vibes) if (s.vibes.includes(v)) score += 2.2;
    // Amenities the user explicitly asked for: a real (in-inventory) amenity is a
    // hard requirement; "universal" ones (self check-in, instant) never exclude.
    for (const a of ctx.amenities) {
      if (AVAILABLE_AMENITIES.has(a)) {
        if (s.amenities.includes(a)) score += 1.6; else hardFail = true;
      }
    }

    return { s, score, hardFail };
  });

  let pool = scored.filter((x) => !x.hardFail);
  if (pool.length === 0) pool = scored; // relax if everything filtered
  return pool.sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.s);
}

// ── response generation (warm, cabin-crew tone) ─────────────────────────────
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

function describeMatch(ctx: BotContext): string {
  const bits: string[] = [];
  if (ctx.destination) bits.push(`in ${ctx.destination}`);
  if (ctx.vibes.length) bits.push(ctx.vibes.slice(0, 2).join(' & '));
  if (ctx.maxPrice) bits.push(`under $${ctx.maxPrice}/night`);
  else if (ctx.minPrice) bits.push(`from $${ctx.minPrice}/night`);
  if (ctx.guests) bits.push(`for ${ctx.guests} ${ctx.guests === 1 ? 'guest' : 'guests'}`);
  if (ctx.amenities.length) bits.push(`with ${ctx.amenities.slice(0, 2).join(' & ')}`);
  return bits.join(', ');
}

function hasWhen(ctx: BotContext): boolean {
  return !!(ctx.nights || ctx.month || ctx.whenText);
}

function missingSlotQuestion(ctx: BotContext): string | undefined {
  if (!ctx.destination && ctx.vibes.length) return "Do you have a particular city in mind, or shall I surprise you with the best spots?";
  if (ctx.destination && !ctx.guests) return "How many guests will be travelling, so I can size it just right?";
  if (ctx.destination && ctx.guests && !hasWhen(ctx)) return "When are you thinking of travelling — any particular dates or month?";
  if (ctx.destination && ctx.guests && !ctx.maxPrice && !ctx.minPrice && !ctx.vibes.length)
    return "And what's your nightly budget, so I can tailor these perfectly?";
  return undefined;
}

// A plain-text booking summary the user confirms before checkout (no emojis).
function buildBookingSummary(ctx: BotContext, stay: BotStay): string {
  const nights = ctx.nights ?? 3;
  const guests = ctx.guests ?? stay.maxGuests ?? 2;
  const when = ctx.whenText ?? ctx.month ?? 'your chosen dates';
  const total = stay.price * nights;
  return [
    "Here's your booking summary — please take a quick look:",
    '',
    `Stay:  ${stay.title}`,
    `Location:  ${stay.location}`,
    `When:  ${when} · ${nights} ${nights === 1 ? 'night' : 'nights'}`,
    `Guests:  ${guests}`,
    `Price:  $${stay.price}/night × ${nights} = $${total} (before taxes & fees)`,
    '',
    'Shall I confirm and take you to secure checkout?',
  ].join('\n');
}

// Transparent "why these" rationale for the recommendation path — lists the
// concrete criteria that drove the matches so the user understands the picks.
function buildRationale(ctx: BotContext): string | undefined {
  const bits: string[] = [];
  if (ctx.destination) bits.push(ctx.destination);
  if (ctx.vibes.length) bits.push(ctx.vibes.slice(0, 2).join(' & '));
  if (ctx.maxPrice) bits.push(`under $${ctx.maxPrice}/night`);
  else if (ctx.minPrice) bits.push(`from $${ctx.minPrice}/night`);
  if (ctx.guests) bits.push(`sleeps ${ctx.guests}`);
  for (const am of ctx.amenities.slice(0, 2)) bits.push(am);
  if (!bits.length) return 'top-rated, guest-favourite stays';
  return bits.join(', ');
}

// Decide whether the request is too vague to recommend yet. Returns ONE focused
// clarifying question when a KEY slot is missing, otherwise undefined (proceed).
// Counts how many meaningful slots we know across the message + accumulated ctx.
function clarifyingQuestion(ctx: BotContext, a: Analysis): string | undefined {
  const hasDestination = !!ctx.destination;
  const hasVibe = ctx.vibes.length > 0;
  const hasBudget = ctx.maxPrice !== undefined || ctx.minPrice !== undefined;
  const hasGuests = ctx.guests !== undefined;
  const hasAmenity = ctx.amenities.length > 0;
  const knownSlots = [hasDestination, hasVibe, hasBudget, hasGuests, hasAmenity].filter(Boolean).length;

  // Only consider clarifying when the user is clearly trying to find a stay.
  const wantsStay = a.intents.includes('wants_stay') || a.intents.includes('search');
  if (!wantsStay) return undefined;

  // Enough to give a genuinely tailored result — don't interrogate, recommend.
  if (knownSlots >= 2) return undefined;
  // A concrete destination alone is plenty to start with real picks.
  if (hasDestination) return undefined;

  // Vibe but no destination — pin down the place.
  if (hasVibe || hasAmenity) {
    return pick([
      "Lovely! Which city are you thinking — or shall I suggest some?",
      "Sounds wonderful! Do you have a destination in mind, or would you like me to suggest a few?",
      "Great vibe! Which city or country shall I search — or shall I surprise you?",
    ]);
  }

  // Totally open ("find me a place", "somewhere nice") — offer a vibe to anchor.
  return pick([
    "Lovely! Are you after beachfront, city buzz, or a cosy escape?",
    "I'd love to! What sort of stay calls to you — beachfront, vibrant city, or a cosy retreat?",
    "Happy to! What's the vibe — beach, buzzing city, or a cosy hideaway? And any city in mind?",
  ]);
}

export function respond(ctx: BotContext, userText: string): { ctx: BotContext; reply: BotReply } {
  const a = analyze(userText);
  ctx = { ...ctx, turns: ctx.turns + 1 };

  // merge slots
  if (a.destination) ctx.destination = a.destination;
  if (a.maxPrice !== undefined) ctx.maxPrice = a.maxPrice;
  if (a.minPrice !== undefined) ctx.minPrice = a.minPrice;
  if (a.guests !== undefined) ctx.guests = a.guests;
  if (a.nights !== undefined) ctx.nights = a.nights;
  if (a.month !== undefined) ctx.month = a.month;
  if (a.whenText !== undefined) ctx.whenText = a.whenText;
  if (a.vibes.length) ctx.vibes = Array.from(new Set([...ctx.vibes, ...a.vibes]));
  if (a.amenities.length) ctx.amenities = Array.from(new Set([...ctx.amenities, ...a.amenities]));
  // "Surprise me / anywhere" — the traveller is open on location, so we won't
  // keep asking for a city; remember it for the rest of the conversation.
  if (/\b(surprise me|anywhere|any\s?where|you (?:choose|decide|pick)|no preference|doesn'?t matter|wherever)\b/i.test(userText)) ctx.openDestination = true;

  const I = (x: Intent) => a.intents.includes(x);
  const gaveWhen = a.nights !== undefined || a.month !== undefined || a.whenText !== undefined;

  // 0) Booking flow gate — runs before everything else so a "yes"/date reply
  //    during confirmation isn't misrouted to FAQ/search.
  // 0a) We asked for travel dates before confirming → once given, show summary.
  if (ctx.awaitingDates && gaveWhen) {
    ctx.awaitingDates = false;
    const stay = ctx.pendingStay ?? ctx.lastSuggestions[0];
    if (stay) {
      ctx.awaitingConfirm = true;
      ctx.pendingStay = stay;
      return { ctx, reply: { text: buildBookingSummary(ctx, stay), quickReplies: ['Yes, confirm', 'Change dates', 'Change guests'] } };
    }
  }
  // 0b) We showed a summary and are waiting on the user's yes / change / no.
  if (ctx.awaitingConfirm) {
    const lower = userText.toLowerCase();
    if (/\bchange dates?\b|\bdifferent dates?\b|change.*(when|month)/.test(lower)) {
      ctx.awaitingConfirm = false; ctx.awaitingDates = true;
      return { ctx, reply: { text: "Of course — when would you like to stay? Tell me the dates, number of nights, or a month.", quickReplies: ['This weekend', 'Next month', 'In July'] } };
    }
    if (/\bchange guests?\b|\bdifferent guests?\b|more guests|fewer guests/.test(lower)) {
      ctx.awaitingConfirm = false;
      return { ctx, reply: { text: "Sure — how many guests will be travelling?", quickReplies: ['Just me', '2 guests', 'Family of 4'] } };
    }
    if (I('affirm') || I('book') || /\b(confirm|yes|correct|looks good|that'?s right|perfect|go ahead|do it)\b/i.test(userText)) {
      const stay = ctx.pendingStay ?? ctx.lastSuggestions[0];
      ctx.awaitingConfirm = false;
      if (stay) {
        return { ctx, reply: {
          text: `Wonderful — confirming ${stay.title} in ${stay.location} for ${ctx.nights ?? 3} ${(ctx.nights ?? 3) === 1 ? 'night' : 'nights'}. Taking you to secure checkout to finish up!`,
          action: { type: 'book', stay },
          suggestions: [stay],
        } };
      }
    }
    if (I('deny')) {
      ctx.awaitingConfirm = false;
      return { ctx, reply: { text: "No problem — nothing's booked. Want to tweak the dates, guests, or look at other stays?", quickReplies: ['Change dates', 'More like these', 'Different city'] } };
    }
    // Anything else with new travel info falls through to be merged below; if the
    // user just typed something unrelated, re-show the summary so they're not lost.
    if (!gaveWhen && a.guests === undefined && !a.destination) {
      const stay = ctx.pendingStay ?? ctx.lastSuggestions[0];
      if (stay) return { ctx, reply: { text: `Just to confirm —\n\n${buildBookingSummary(ctx, stay)}`, quickReplies: ['Yes, confirm', 'Change dates', 'Change guests'] } };
    }
  }

  // 1) Complaint / problem → empathetic apology + recovery (customer-support tone)
  //    Defer to the cancellation FAQ when it's clearly a how-to question, not a grievance.
  const isCancelHowTo = I('faq_cancel') && /(how (?:do|can) i|how to|what(?:'?s| is) the|policy|\?)/i.test(userText)
    && !/(my (?:booking|reservation|trip|payment)|terrible|awful|angry|frustrat|disappointed|worst|horrible|not working|doesn'?t work|messed up)/i.test(userText);
  if (I('complaint') && !isCancelHowTo) {
    return { ctx, reply: {
      text: pick([
        "I'm truly sorry about that — that's not the experience we want you to have, and I'll do everything I can to put it right. Could you tell me a little more about what went wrong?",
        "My sincere apologies for the trouble. Your comfort matters to us, so let's fix this together — what exactly happened?",
      ]),
      quickReplies: ['It was about a booking', 'A payment issue', 'Talk to a human'],
    }};
  }

  // 2) Reset — clear all learned preference slots and confirm warmly.
  if (I('reset')) {
    const fresh = resetContext();
    return { ctx: fresh, reply: {
      text: pick([
        "Of course — I've cleared your preferences and we're back to a clean slate! Tell me where you'd love to go and the kind of stay you're dreaming of, and I'll take it from there.",
        "Done — all your preferences are wiped and we're starting fresh! Just tell me the destination and vibe, and I'll find your perfect stay.",
      ]),
      quickReplies: ['Romantic beach for 2', 'Family trip with a pool', 'Budget city break'],
    }};
  }

  // 2.5) Front-desk knowledge base — broad "how does X work" guest questions
  //      (Wi-Fi, parking, check-out, house rules, safety, directions, currency,
  //      account, wishlist, trips, host contact, long stays, deposits). Runs
  //      before the greedy `help` intent so "how do I get directions?" lands on
  //      the right answer, but is skipped when the user is searching for a stay.
  const isSearchy = /\b(find|show me|book|search|looking for|recommend|suggest|get me)\b/i.test(userText)
    || !!a.destination || a.maxPrice !== undefined || a.guests !== undefined;
  if (!isSearchy) {
    for (const kb of KNOWLEDGE_BASE) {
      if (kb.test.test(userText)) {
        return { ctx, reply: { text: pick(kb.answers), quickReplies: kb.quickReplies } };
      }
    }
  }

  // 3) Help / capabilities — but defer to the more specific app/FAQ intents below.
  const hasSpecificInfoIntent = I('app_info') || I('capability') || I('faq_cancel') ||
    I('faq_payment') || I('faq_fees') || I('faq_checkin') || I('faq_pets') || I('faq_howbot');
  if (I('help') && !hasSpecificInfoIntent && !a.destination && !a.vibes.length) {
    return { ctx, reply: {
      text: "Happily! I'm your personal travel concierge. Just tell me — in your own words — where you'd like to go, your budget, how many guests, and the vibe (romantic, beachfront, family, budget, luxury…). I'll find the best matches and you can book right here in the chat.",
      quickReplies: ['Romantic beach for 2', 'Aspen ski cabin', 'London under $200'],
    }};
  }

  // 4) Booking intent — gather dates if needed, then show a summary to confirm
  if (I('book') || (I('affirm') && ctx.lastSuggestions.length)) {
    const stay = ctx.lastSuggestions[0];
    if (stay) {
      ctx.pendingStay = stay;
      // Ask for travel dates/month before confirming, if we don't have them yet.
      if (!hasWhen(ctx)) {
        ctx.awaitingDates = true;
        return { ctx, reply: {
          text: `Excellent choice — the ${stay.title} in ${stay.location}! Before I lock it in, when would you like to stay? Tell me your dates, how many nights, or a month.`,
          quickReplies: ['This weekend', 'Next month', 'In July'],
        }};
      }
      // We have dates → present the summary for confirmation.
      ctx.awaitingConfirm = true;
      return { ctx, reply: {
        text: buildBookingSummary(ctx, stay),
        quickReplies: ['Yes, confirm', 'Change dates', 'Change guests'],
      }};
    }
    return { ctx, reply: { text: "I'd be delighted to book that for you! First, let me find the right stay — where would you like to go?" } };
  }

  // 5) Thanks
  if (I('thanks') && !a.destination && !a.vibes.length) {
    return { ctx, reply: {
      text: pick([
        "It's my absolute pleasure — that's what I'm here for! Anything else I can help you plan?",
        "You're very welcome! Safe travels, and just say the word if you'd like more options.",
      ]),
      quickReplies: ['Find another stay', 'Add a day trip', 'No, that\'s all'],
    }};
  }

  // 5b) Small talk (who are you / how are you)
  if (I('smalltalk')) {
    return { ctx, reply: {
      text: pick([
        "I'm StayBot, your personal travel concierge — doing wonderfully, thank you for asking! I'm here to find you the perfect place to stay. Where would you like to go?",
        "I'm StayBot, your AI travel planner — always happy to help! Tell me the destination and vibe and I'll find your ideal stay.",
      ]),
      quickReplies: ['Romantic beach for 2', 'Family trip with a pool', 'Budget city break'],
    }};
  }

  // 5c) App info — what is StayOn / what's special / what do you offer
  if (I('app_info')) {
    return { ctx, reply: {
      text: pick([
        "Great question! StayOn is your home for hand-picked, one-of-a-kind stays across the USA, UK and Europe — and I'm your personal AI travel concierge, here to find the perfect one for you. We believe in honest pricing too: just a cleaning fee and taxes, no sneaky platform or service fees. Where would you love to go?",
        "I'd love to tell you! What makes StayOn special is the curation — every stay is hand-selected and many are guest-favourites from verified hosts across the USA, UK and Europe. You can search by map or vibe, save favourites to wishlists, keep everything in your trip wallet, and book instantly right here with me. Shall we find your perfect stay?",
        "Happy to share! StayOn brings together unique, verified stays across the USA, UK and Europe, with an AI concierge (that's me!) to match you to the ideal one. No platform or service fees — only a cleaning fee and taxes — plus instant booking, wishlists and a handy trip wallet. Tell me your destination and I'll get started!",
      ]),
      quickReplies: ['Romantic beach for 2', 'A city break in London', 'Show me unique stays'],
    }};
  }

  // 5d) FAQ — cancellation / refund
  if (I('faq_cancel') && !a.destination && !a.vibes.length && !a.maxPrice && !I('complaint')) {
    return { ctx, reply: {
      text: pick([
        "Cancelling is easy and stress-free! Most stays offer free cancellation within the host's window (often up to 24-48 hours before check-in) for a full refund. Just open the booking in your trip wallet and tap Cancel — the refund policy is shown clearly before you book. Anything else I can help with?",
        "No worries at all — you can cancel any booking from your trip wallet, and most stays include a free-cancellation window for a full refund (the exact policy is shown on every listing before you confirm). Would you like help finding a stay with flexible cancellation?",
      ]),
      quickReplies: ['Flexible cancellation stays', 'How do I pay?', 'Find a stay'],
    }};
  }

  // 5e) FAQ — payment methods
  if (I('faq_payment') && !a.destination && !a.vibes.length && !a.maxPrice) {
    return { ctx, reply: {
      text: pick([
        "Paying is quick and secure! We accept all major cards — Visa, Mastercard and Amex — plus Apple Pay, Google Pay and PayPal. Every payment is encrypted and protected, so you can book with total peace of mind. Ready to find your stay?",
        "Great question! You can pay with Visa, Mastercard or Amex, or use Apple Pay, Google Pay or PayPal — whatever's easiest for you. It's all fully secure and encrypted. Shall I help you find somewhere to book?",
      ]),
      quickReplies: ['Find a stay', 'What are the fees?', 'How do I cancel?'],
    }};
  }

  // 5f) FAQ — fees / hidden charges
  if (I('faq_fees') && !a.destination && !a.vibes.length && !a.maxPrice) {
    return { ctx, reply: {
      text: pick([
        "Love that you asked — we're proud of our honest pricing! There's NO platform fee and NO service fee on StayOn. The only extras are a cleaning fee (set by the host) and applicable taxes, and you'll see the full total before you ever pay. No surprises, ever. Want me to find you a great-value stay?",
        "Happy to clear that up! Unlike most platforms, StayOn charges no service or platform fee at all. You'll only pay the nightly rate, a cleaning fee and taxes — and the complete price is shown up front before checkout. Shall I pull up some options?",
      ]),
      quickReplies: ['Budget city break', 'Find a stay', 'How do I pay?'],
    }};
  }

  // 5g) FAQ — check-in
  if (I('faq_checkin') && !a.destination && !a.vibes.length && !a.maxPrice) {
    return { ctx, reply: {
      text: pick([
        "Check-in varies by stay — some offer easy self check-in with a smart lock or lockbox, others have key pickup, a warm host greeting, or a staffed reception. The exact method is shown on every listing, and you can even filter for self check-in if that's your preference. Want me to find stays with self check-in?",
        "Good to plan ahead! Depending on the home, you'll either let yourself in with self check-in, collect keys nearby, be greeted by your host, or check in at reception — it's listed clearly on each stay and is filterable. Shall I find you one with the check-in style you like?",
      ]),
      quickReplies: ['Self check-in stays', 'Find a stay', 'What are the fees?'],
    }};
  }

  // 5h) FAQ — pets. Answer the FAQ when it's a question ("are pets allowed?",
  //     "can I bring my dog?"), but let the search path handle "find a pet-friendly cabin".
  const isPetQuestion = I('faq_pets') && !a.destination && !a.maxPrice && !a.guests
    && /(allowed|allow|can i|do you|are pets|is it|policy|welcome|okay|ok\b|fine|bring|\?)/i.test(userText)
    && !/(find|show|book|search|looking|want|need|get me)/i.test(userText);
  if (isPetQuestion) {
    return { ctx, reply: {
      text: pick([
        "Absolutely — many of our stays are pet-friendly, so your furry companion is welcome to come along! Just use the pet-friendly filter (or tell me) and I'll show you homes that happily welcome pets. Where are you headed?",
        "Good news — plenty of StayOn homes are pet-friendly! You can filter for it, or just say the word and I'll find lovely stays that welcome your dog or cat. Which destination did you have in mind?",
      ]),
      quickReplies: ['Pet-friendly beach stay', 'Pet-friendly cabin', 'Find a stay'],
    }};
  }

  // 5i) FAQ — how the bot works / is it AI / real
  if (I('faq_howbot')) {
    return { ctx, reply: {
      text: pick([
        "Fair question! I'm StayBot, StayOn's AI travel concierge — so yes, I'm a friendly bot, here around the clock to understand what you're after and match you to real, bookable stays in seconds. Just chat to me naturally, like you would a helpful travel agent. Where shall we begin?",
        "I'm StayBot, your AI concierge here at StayOn — a smart assistant rather than a human, but always happy and ready to help! Tell me your destination, budget, guests and vibe in plain English, and I'll find your ideal stay and book it right here. Want to give it a try?",
      ]),
      quickReplies: ['Romantic beach for 2', 'Family trip with a pool', 'Budget city break'],
    }};
  }

  // 5j) Capability / can-you — answer "yes!" warmly, then ask to proceed.
  //     Only when no concrete travel entities were given (otherwise let search run).
  if (I('capability') && !a.destination && !a.vibes.length && !a.maxPrice && !a.guests) {
    return { ctx, reply: {
      text: pick([
        "Absolutely, yes! Finding you the best stay is exactly what I'm here for — just tell me your destination and the vibe you're after (and a budget if you have one), and I'll pull up the top matches you can book right away.",
        "Yes, of course — I'd be delighted to! I can search hand-picked stays, recommend the best ones, and book them for you on the spot. Where would you like to go, and what kind of place are you dreaming of?",
        "Absolutely! That's my specialty. Tell me the city or country, how many guests, and the vibe — beachfront, cosy cabin, city centre? — and I'll find and book your perfect stay right here.",
      ]),
      quickReplies: ['Beachfront in Miami', 'A city break in London', 'A cabin in the mountains'],
    }};
  }

  // 6) Greeting with no travel detail yet
  if (I('greeting') && !a.destination && !a.vibes.length && !a.maxPrice && !a.guests) {
    return { ctx, reply: {
      text: pick([
        "Hello, and welcome aboard! I'm StayBot, your personal travel concierge. Where are you dreaming of going — and what kind of stay would make it perfect?",
        "Hi there! Lovely to meet you. I'm StayBot — tell me where you'd like to go and the vibe you're after, and I'll find you something wonderful.",
        "Hey! Welcome to StayOn. I'd love to help plan your stay. Which city are you thinking of, and what's the occasion?",
      ]),
      quickReplies: ['Romantic beach for 2', 'Family trip with a pool', 'Budget city break'],
    }};
  }

  // 6b) Wants a stay but hasn't given details yet — engage and ask for the first slot
  if (I('wants_stay') && !a.destination && !a.vibes.length && !a.maxPrice && !a.guests && !ctx.destination && !ctx.vibes.length) {
    return { ctx, reply: {
      text: pick([
        "Absolutely — I'd be delighted to help you find the perfect stay! To get started, where would you like to go?",
        "Of course! Finding great stays is exactly what I do. Which city or country are you headed to?",
        "Happy to help with that! Tell me your destination and the kind of vibe you want — beachfront, city, cosy cabin? — and I'll pull up the best options.",
      ]),
      quickReplies: ['Beachfront in Miami', 'A city break in London', 'A cabin in the mountains'],
    }};
  }

  // 7) Search / recommendation path
  if (I('search') || ctx.destination || ctx.vibes.length || ctx.maxPrice || ctx.guests || ctx.amenities.length || ctx.openDestination) {
    // 7a-0) Gather the three essentials IN ORDER — place → guests → dates —
    //       before showing any results, so the list is filtered to exactly what
    //       the traveller needs (acts like a real booking assistant).

    // (1) Place — unless they said "surprise me".
    if (!ctx.destination && !ctx.openDestination) {
      const vibeBit = ctx.vibes.length ? ` for your ${ctx.vibes.slice(0, 2).join(' & ')} trip` : '';
      return { ctx, reply: {
        text: pick([
          `Happy to help${vibeBit}! Which city or area would you like to stay in? (or say “surprise me”)`,
          `Lovely${vibeBit}! Where are you headed — a city or country? You can also say “surprise me”.`,
        ]),
        quickReplies: ['New York', 'Miami', 'London', 'Surprise me'],
      }};
    }
    // (2) Guests.
    if (ctx.guests === undefined) {
      const place = ctx.destination ?? 'your trip';
      return { ctx, reply: {
        text: pick([
          `Great — ${place}! How many people will be travelling?`,
          `${ctx.destination ? `${ctx.destination}, lovely choice! ` : ''}How many guests will be staying?`,
        ]),
        quickReplies: ['Just me', '2 guests', 'Family of 4'],
      }};
    }
    // (3) Dates.
    if (!hasWhen(ctx)) {
      const g = ctx.guests === 1 ? 'guest' : 'guests';
      return { ctx, reply: {
        text: pick([
          `Perfect — ${ctx.guests} ${g}. Which dates are you thinking? Tell me check‑in to check‑out, how many nights, or a month.`,
          `Got it, ${ctx.guests} ${g}. When would you like to stay — your dates, number of nights, or a month?`,
        ]),
        quickReplies: ['This weekend', 'Next month', '3 nights'],
      }};
    }

    const recs = recommend(ctx);
    ctx.lastSuggestions = recs;
    const summary = describeMatch(ctx);

    if (recs.length === 0) {
      return { ctx, reply: {
        text: `I'm so sorry — I couldn't find a perfect match ${summary ? `for ${summary}` : 'just yet'}. If you can stretch the budget a touch or open up the dates, I'll find you something lovely. Want me to show the closest options?`,
        quickReplies: ['Show closest options', 'Increase budget', 'Different city'],
      }};
    }

    const opener = summary
      ? pick([`Lovely — here are my top picks ${summary}:`, `Wonderful, I've found some gems ${summary}:`, `Great brief! These match ${summary} beautifully:`])
      : pick(['Here are a few hand-picked stays I think you\'ll love:', 'I\'ve pulled together some favourites for you:']);

    const followUp = missingSlotQuestion(ctx);
    const text = followUp ? `${opener}\n\n${followUp}` : `${opener}\n\nTap any one to see more, or just say “book it” and I'll take you to checkout.`;

    return { ctx, reply: {
      text,
      suggestions: recs,
      quickReplies: ['Book the first one', 'Show cheaper', 'More like these'],
      rationale: buildRationale(ctx),
    } };
  }

  // 8) Affirm / deny without context → gentle guidance
  if (I('affirm')) {
    return { ctx, reply: {
      text: "Great! To point you to the right places, tell me your destination and the vibe — for example, “Paris, romantic, under $300”.",
      quickReplies: ['Paris for 2', 'A beach trip', 'Somewhere budget-friendly'],
    }};
  }
  if (I('deny')) {
    return { ctx, reply: { text: "No problem at all. Whenever you're ready, just tell me the destination and vibe and I'll find your perfect stay." } };
  }

  // 8.5) Fuzzy knowledge catch — before the generic fallback, try to understand
  //      the question by scoring it against the whole StayOn knowledge base. This
  //      lets free-form English questions ("do you guys take paypal?", "can I
  //      rent my flat out", "what's a reel") still get a real, specific answer.
  const kbHit = bestKbMatch(userText);
  if (kbHit) {
    return { ctx, reply: { text: pick(kbHit.answers), quickReplies: kbHit.quickReplies } };
  }

  // 9) Fallback — warm, human and varied so it never feels like a stuck robot.
  //    Acknowledges the message positively, then gently offers to help.
  const fallbackText = pick([
    "I'm always happy to help! I'm best at finding you wonderful places to stay and answering any questions about StayOn — booking, pricing, check-in, cancellations and more. What can I help you with — or shall we start planning a trip?",
    "Thanks for that! I may be a travel concierge at heart, but I'm here to help however I can. Want me to find you a great stay, or answer a question about how StayOn works?",
    "I love a good chat! To make myself most useful, I can find and book hand-picked stays for you, or help with anything like fees, payments or cancellations. Where would you like to begin?",
    "Got it — and I'm glad you reached out! Just point me in a direction: tell me where you'd like to travel (a city, budget and vibe is perfect), or ask me anything about StayOn and I'll happily explain.",
    "Happy to help with that! I'm your StayOn concierge, so I can find your ideal stay or answer questions about pricing, payments, check-in and cancellations. What would you like to do first?",
  ]);
  return { ctx, reply: {
    text: fallbackText,
    quickReplies: ['Romantic beach for 2', 'Family trip with a pool', 'Budget city break'],
  }};
}
