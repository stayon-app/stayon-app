// Host Assistant — ADVISORY ONLY. Answers questions about the host's earnings,
// stats and outcomes from their own reservation data, AND explains how every
// part of hosting on StayOn works (listing, payouts, pricing, calendar, rules,
// reviews, reels, safety…). It explains and suggests; it NEVER acts (no
// accepting bookings, changing prices, messaging guests, or moving payouts).
//
// Mirrors the guest StayBot approach: live-data intents first, then a broad
// knowledge base matched with a fuzzy keyword/regex scorer so free-form
// questions still land on a real, specific answer.

import type { HostReservation } from '../data/reservations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface AssistantReply {
  text: string;
  quickReplies?: string[];
  route?: string;        // host screen to open (so the assistant helps DO the task)
  routeLabel?: string;   // button label, e.g. "Open Payouts"
}

interface Stats {
  total: number;
  pendingPayout: number;
  bookings: number;
  nights: number;
  avgRate: number;
  occupancy: number;
  pending: number;
  cancelled: number;
  completed: number;
  confirmed: number;
  bestMonth?: { label: string; value: number };
  cancelRate: number;
}

function computeStats(res: HostReservation[]): Stats {
  const earning = res.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const total = earning.reduce((s, r) => s + r.payout, 0);
  const pendingPayout = res.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.payout, 0);
  const nights = earning.reduce((s, r) => s + r.nights, 0);
  const avgRate = earning.length ? Math.round(earning.reduce((s, r) => s + r.subtotal / r.nights, 0) / earning.length) : 0;
  const confirmed = res.filter((r) => r.status === 'confirmed').length;
  const buckets: Record<string, number> = {};
  earning.forEach((r) => { const m = MONTHS.find((x) => r.checkIn.startsWith(x)); if (m) buckets[m] = (buckets[m] || 0) + r.payout; });
  const best = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  const cancelled = res.filter((r) => r.status === 'cancelled').length;
  return {
    total, pendingPayout, bookings: earning.length, nights, avgRate,
    occupancy: Math.min(99, 40 + confirmed * 12),
    pending: res.filter((r) => r.status === 'pending').length,
    cancelled, completed: res.filter((r) => r.status === 'completed').length, confirmed,
    bestMonth: best ? { label: best[0], value: best[1] } : undefined,
    cancelRate: res.length ? Math.round((cancelled / res.length) * 100) : 0,
  };
}

const QUICK = ['Earnings so far', 'Next payout', 'Occupancy', 'Best month', 'Booking stats'];

const norm = (t: string) => t.toLowerCase().trim().replace(/(.)\1{2,}/g, '$1');

// ── Host knowledge base — "how does X work" hosting questions ─────────────────
interface KbEntry { id: string; test: RegExp; keywords: string[]; answers: string[]; quick?: string[]; route?: string; routeLabel?: string; }

const HOST_KB: KbEntry[] = [
  {
    id: 'create_listing',
    test: /(list (?:my |a )?(?:place|home|property|apartment)|create (?:a )?listing|add (?:a |my )?(?:place|property|listing)|put my (?:place|home) (?:up|on)|how (?:do|to) (?:i )?(?:list|host)|start hosting)/i,
    keywords: ['list my place', 'create a listing', 'add a property', 'how to list', 'start hosting', 'put my place up', 'new listing'],
    answers: [
      "Listing is quick and guided! Go to Listings → Create, and a step-by-step wizard walks you through it: place type, location (search it on Google Maps so the pin is exact), the vibe it matches, photos, amenities, house rules, then your price. Publish and you're live — with 0% commission, so you keep everything you earn.",
      "From the Listings tab tap Create — the wizard covers type, location, guests, the vibe/setting, 6+ photos, a title, booking settings and pricing. It only takes a few minutes, and StayOn charges you no fee at all.",
    ],
    quick: ['How do payouts work?', 'What vibe should I pick?', 'Smart Pricing'],
  },
  {
    id: 'change_payout',
    test: /(change (?:my )?(?:bank|payout|account) (?:details|method|account)|update (?:my )?(?:bank|payout)|new bank account|edit payout|payout method)/i,
    keywords: ['change bank', 'update payout', 'bank details', 'payout method', 'change my account', 'new bank account'],
    answers: [
      "For your security, changing payout/bank details isn't instant — go to Profile → Payout method → “Request change”, enter the new details, and the StayOn operations team verifies your identity matches before approving. Your current method keeps working until it's approved, then it updates everywhere. You'll need a verified identity to submit.",
      "Bank/payout changes go through a quick verification: Profile → Payout method → Request change. Ops checks the new account against your verified identity, then applies it. The old method stays active until then.",
    ],
    quick: ['Verify identity', 'How do payouts work?', 'Next payout'],
  },
  {
    id: 'smart_pricing',
    test: /(smart pricing|auto[\s-]?price|dynamic pricing|price automatically|suggest(?:ed)? price|optimi[sz]e (?:my )?(?:price|rates?))/i,
    keywords: ['smart pricing', 'auto price', 'dynamic pricing', 'suggested price', 'optimize rates', 'pricing tool'],
    answers: [
      "Smart Pricing suggests a nightly rate based on demand, season and weekends, in your own currency. Open a listing → Manage → Smart Pricing to see the suggestion, set min/max guardrails, and turn on keep-optimised if you want it to adjust automatically. You approve the range — it never goes outside it.",
      "Find it on a listing under Manage → Smart Pricing: it recommends rates from occupancy + seasonal trends, with min/max limits you control. Apply it once, or let it keep your prices optimised within your guardrails.",
    ],
    quick: ['Best month', 'Average rate', 'Get more bookings'],
  },
  {
    id: 'calendar',
    test: /(calendar|availability|block (?:dates|days)|open (?:dates|days)|minimum (?:nights|stay)|min nights|set dates|prep time|notice period)/i,
    keywords: ['calendar', 'availability', 'block dates', 'min nights', 'set dates', 'open dates', 'prep time', 'notice'],
    answers: [
      "Manage your dates in the Calendar tab — block or open nights, and in a listing's Booking & availability you can set minimum nights, advance notice, prep time between stays, and how far ahead guests can book. Keeping the calendar open and fresh helps you rank and fill more nights.",
      "The Calendar tab controls open/blocked nights; per-listing Booking settings handle min stay, notice, prep time and booking window. Want tips to fill more of your calendar?",
    ],
    quick: ['Get more bookings', 'Booking settings', 'Occupancy'],
  },
  {
    id: 'house_rules',
    test: /(house rules|smoking|parties|pets allowed|quiet hours|extra guests|set rules|guest rules)/i,
    keywords: ['house rules', 'smoking', 'parties', 'pets allowed', 'quiet hours', 'extra guests', 'set rules'],
    answers: [
      "You set house rules when creating or editing a listing — smoking, parties/events, quiet hours, pets and extra guests. They're shown to guests before they book and again in their trip, so expectations are clear and you're protected. Edit them anytime from the listing.",
      "House rules (smoking, parties, quiet hours, pets, extra guests) live in your listing's settings and appear up front to guests. Clear rules mean fewer surprises and smoother stays.",
    ],
    quick: ['Safety center', 'Edit a listing', 'Cancellation policy'],
  },
  {
    id: 'cancellation',
    test: /(cancellation policy|cancel|flexible|moderate|strict|refund policy|guest cancels)/i,
    keywords: ['cancellation policy', 'flexible', 'moderate', 'strict', 'refund policy', 'guest cancels'],
    answers: [
      "Pick a cancellation policy per listing — Flexible, Moderate or Strict. Flexible wins more bookings (guests love the safety net); Strict protects your calendar but can deter some. You can change it anytime in the listing's settings. Taxes are never refundable as they're remitted onward.",
      "Each listing has a Flexible / Moderate / Strict policy you choose. Flexible tends to convert best; Strict guards against last-minute drops. It's shown to guests before they book.",
    ],
    quick: ['Get more bookings', 'Edit a listing', 'Booking settings'],
  },
  {
    id: 'reviews',
    test: /(review|rating|respond to (?:a )?review|reply to (?:a )?review|guest feedback|stars?)/i,
    keywords: ['review', 'rating', 'respond to review', 'reply to review', 'guest feedback', 'stars'],
    answers: [
      "Your reviews live in the Reviews tab — it highlights what guests love and what needs attention, and you can publicly reply to each one. A warm reply shows future guests how you host. There's also a Smart suggestions card that turns review themes into concrete fixes.",
      "Open Reviews to read ratings, reply publicly, and see “what guests love / needs attention”. Responding (especially to anything critical) builds trust and lifts future bookings.",
    ],
    quick: ['Smart suggestions', 'Get more bookings', 'Occupancy'],
  },
  {
    id: 'reels',
    test: /(post a (?:reel|vlog|video)|stay ?reel|vlog|video tour|share a video)/i,
    keywords: ['post a reel', 'vlog', 'stayreel', 'video tour', 'share a video', 'reel'],
    answers: [
      "Vlogs/reels get far more views — and bookings — than photos alone. Go to Profile → Your content → Post a vlog: pick a video from your phone (a tour or the view), add a title and caption, and submit. The StayOn team reviews it, then it goes live in the StayReels feed where guests can tap through to book your place.",
      "From Profile → Your content → Post a vlog, upload a short vertical video of your place. After a quick review it appears in StayReels, and viewers can open and book the stay right from the reel.",
    ],
    quick: ['Listing guidebook', 'Public profile', 'Get more bookings'],
  },
  {
    id: 'guidebook',
    test: /(guidebook|local guide|recommend(?:ations)? (?:for|to) guests|things to do nearby|local tips for guests)/i,
    keywords: ['guidebook', 'local guide', 'recommendations for guests', 'local tips', 'things to do nearby'],
    answers: [
      "A Local guidebook makes guests love your place even more. Open a listing → Manage → Listing guidebook and add your favourite spots by category (eat, see, do, getting around). Guests see it on your listing as “Local guide from your host”. Great guidebooks earn great reviews.",
      "Add a guidebook from a listing's Manage → Listing guidebook — your top local eats, sights and tips. Guests see it on the stay page, and it's a lovely trust-builder.",
    ],
    quick: ['Post a vlog', 'Public profile', 'Reviews'],
  },
  {
    id: 'public_profile',
    test: /(public profile|about me|what guests see|my profile|host profile|bio)/i,
    keywords: ['public profile', 'about me', 'what guests see', 'host profile', 'bio', 'languages'],
    answers: [
      "Your public profile is what guests see on your listing. Edit it at Profile → Your content → Public profile — add a photo, an about-you, languages, work and a fun fact. A warm, real profile builds trust and books more stays. Your verified legal identity always stays private.",
      "Set up your guest-facing profile under Profile → Your content → Public profile (photo, about, languages, fun fact). It powers the “Meet your host” section guests see.",
    ],
    quick: ['Listing guidebook', 'Post a vlog', 'Verify identity'],
  },
  {
    id: 'taxes',
    test: /(tax(?:es)?|gst|vat|tax document|do i (?:pay|charge) tax|tax on (?:earnings|payout))/i,
    keywords: ['taxes', 'gst', 'vat', 'tax document', 'pay tax', 'charge tax', 'tax on earnings'],
    answers: [
      "On StayOn you keep 100% of your nightly rate plus the cleaning fee — there's no platform commission. Taxes shown to guests are remitted onward and aren't part of your payout. For your own income-tax reporting, your Earnings and Payouts screens give a full breakdown you can use. (I can't give tax advice — check a local professional for specifics.)",
      "StayOn takes 0% commission, so your payout is the full rate + cleaning. Guest-facing taxes pass through and aren't yours to keep. Use the Earnings/Payouts breakdown for your records; a tax professional can advise on your obligations.",
    ],
    quick: ['Earnings so far', 'Next payout', 'View payouts'],
  },
  {
    id: 'safety',
    test: /(safety|security|smart lock|cameras?|emergency|verified guests?|safety device|smoke (?:alarm|detector))/i,
    keywords: ['safety', 'security', 'smart lock', 'camera', 'emergency', 'verified guests', 'safety device'],
    answers: [
      "The Safety center (Profile → Insights & operations → Safety) lets you set a smart-lock/access code, list safety devices (smoke & CO alarms, extinguisher), disclose any exterior cameras, require verified guests, and store an emergency contact. Verified-guest-only is a great way to feel secure about who books.",
      "Open Safety & security to manage access codes, safety devices, camera disclosure, verified-guest requirements and an emergency contact. Want me to explain requiring verified guests?",
    ],
    quick: ['House rules', 'Maintenance & damages', 'Get more bookings'],
  },
  {
    id: 'messaging',
    test: /(message (?:a )?guest|saved (?:messages?|replies)|scheduled messages?|auto (?:message|reply)|canned (?:reply|response)|quick replies)/i,
    keywords: ['message a guest', 'saved messages', 'scheduled messages', 'auto message', 'canned reply', 'inbox'],
    answers: [
      "In the Inbox you can chat with guests, use Saved replies for common answers, and set Scheduled messages that send automatically — a welcome on confirmation, check-in details the day before, a mid-stay note, a checkout reminder and a thank-you. Fast, friendly replies protect your response rate and rank you higher.",
      "Your Inbox has Saved replies and Scheduled (automated) messages — welcome, check-in, mid-stay, checkout and thanks — so guests always feel looked after with little effort. Replying within 24h keeps your response rate strong.",
    ],
    quick: ['Get more bookings', 'Reviews', 'Booking settings'],
  },
  {
    id: 'instant_book',
    test: /(instant book|auto[\s-]?accept|approve (?:bookings?|guests?) automatically|booking approval)/i,
    keywords: ['instant book', 'auto accept', 'booking approval', 'approve automatically'],
    answers: [
      "You choose how bookings come in per listing: Instant Book (guests book straight away) or Approve requests (you review each one first) in Booking settings. Instant Book usually wins more reservations and improves ranking; request-approval gives you more control. You can switch anytime.",
      "In a listing's Booking settings, pick Instant Book for more reservations and better ranking, or Approve-first for control. Your call, changeable whenever.",
    ],
    quick: ['Get more bookings', 'Calendar', 'Respond to requests'],
  },
  {
    id: 'more_bookings',
    test: /(more (?:bookings?|reservations?|guests?)|get booked|increase (?:bookings?|occupancy)|rank (?:higher|better)|search (?:rank|ranking)|why (?:am i|aren't i) (?:not )?(?:getting|booked)|grow|first booking)/i,
    keywords: ['more bookings', 'get booked', 'increase bookings', 'rank higher', 'search ranking', 'grow', 'first booking', 'not getting booked'],
    answers: [
      "To win more bookings: add 12+ bright photos, turn on Instant Book, keep your calendar open, reply within 24 hours, add a weekly/first-booking discount, and set the right vibe tags so guests find you. New hosts also get a first-booking boost. Check the Smart suggestions screen — it turns your own data into a prioritised to-do list.",
      "Biggest levers: great photos, Instant Book, fast replies, a competitive/Smart price, an open calendar, and the correct vibe/setting tags. Your Smart suggestions screen ranks exactly what to do next for your listing.",
    ],
    quick: ['Smart suggestions', 'Smart Pricing', 'Post a vlog'],
  },
  {
    id: 'identity',
    test: /(verify (?:my )?(?:identity|id)|id verification|kyc|get verified|verification)/i,
    keywords: ['verify identity', 'id verification', 'kyc', 'get verified', 'verification'],
    answers: [
      "Verify your identity at Profile → Identity & verification. It builds guest trust, can unlock instant booking, and is required before the ops team will approve any payout-detail change. Your legal documents stay private — only your friendly public profile is shown.",
      "A quick ID check (Profile → Identity & verification) verifies you as a host, boosts trust, and is needed to change payout details securely. Private info is never shown to guests.",
    ],
    quick: ['Change payout details', 'Public profile', 'Is my data safe?'],
  },
  {
    id: 'damages',
    test: /(damage|broke|broken|maintenance|repair|guest (?:damaged|broke)|report damage|cleaning issue)/i,
    keywords: ['damage', 'broken', 'maintenance', 'repair', 'report damage', 'guest damaged', 'cleaning issue'],
    answers: [
      "Track upkeep in Maintenance & damages (Profile → Insights & operations). Log tasks and move them open → in-progress → fixed, and record any damage reports (with notes and photos) — including at checkout. Keeping on top of maintenance protects your ratings and your place.",
      "Use the Maintenance screen for repair tasks and damage reports (notes + photos, also fileable at checkout). Staying ahead of issues keeps reviews high.",
    ],
    quick: ['Safety center', 'Reviews', 'Checkout'],
  },
];

// Where each topic lets the host actually DO the task (deep-link to the screen).
const KB_ROUTE: Record<string, { route: string; label: string }> = {
  create_listing: { route: 'ListingCreate', label: 'Create a listing' },
  change_payout: { route: 'PayoutSetup', label: 'Open Payout method' },
  smart_pricing: { route: 'Listings', label: 'Open Listings' },
  calendar: { route: 'CalendarTab', label: 'Open Calendar' },
  house_rules: { route: 'Listings', label: 'Open Listings' },
  cancellation: { route: 'Listings', label: 'Open Listings' },
  reviews: { route: 'Reviews', label: 'Open Reviews' },
  reels: { route: 'HostReel', label: 'Post a vlog' },
  guidebook: { route: 'Guidebook', label: 'Open Guidebook' },
  public_profile: { route: 'PublicProfile', label: 'Edit public profile' },
  taxes: { route: 'Earnings', label: 'Open Earnings' },
  safety: { route: 'Safety', label: 'Open Safety center' },
  messaging: { route: 'InboxTab', label: 'Open Inbox' },
  instant_book: { route: 'Listings', label: 'Open Listings' },
  more_bookings: { route: 'SmartSuggestions', label: 'Smart suggestions' },
  identity: { route: 'IdentityVerification', label: 'Verify identity' },
  damages: { route: 'Maintenance', label: 'Open Maintenance' },
};

/** One-line summary of the host's numbers — context for the optional LLM mode. */
export function hostStatsSummary(res: HostReservation[], money: (n: number) => string): string {
  const s = computeStats(res);
  return `earned ${money(s.total)} over ${s.bookings} bookings (${s.nights} nights); pending payout ${money(s.pendingPayout)}; occupancy ~${s.occupancy}%; avg nightly rate ${money(s.avgRate)}; ${s.pending} pending request(s); ${s.confirmed} confirmed, ${s.completed} completed, ${s.cancelled} cancelled; best month ${s.bestMonth ? `${s.bestMonth.label} (${money(s.bestMonth.value)})` : 'n/a'}.`;
}

// Fuzzy matcher — regex + keyword overlap, same idea as the guest StayBot.
function bestKbMatch(text: string): KbEntry | undefined {
  const n = norm(text);
  let best: KbEntry | undefined;
  let score = 0;
  for (const kb of HOST_KB) {
    let s = 0;
    if (kb.test.test(text)) s += 3;
    for (const k of kb.keywords) if (n.includes(k)) s += 2;
    if (s > score) { score = s; best = kb; }
  }
  return score >= 2 ? best : undefined;
}

const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

export function respondHostAssistant(res: HostReservation[], question: string, money: (n: number) => string): AssistantReply {
  const s = computeStats(res);
  const q = question.toLowerCase();
  const n = norm(question);
  const has = (...w: string[]) => w.some((x) => q.includes(x));

  // Greetings / who-are-you / capabilities.
  if (/^(h+i+|h+e+y+|h+ello|hiya|yo|namaste|good (morning|afternoon|evening)|greetings)\b/i.test(n)) {
    return { text: "Hi! I'm your hosting assistant. Ask me about your earnings, payouts, occupancy and booking stats — or how anything works: listing, pricing, calendar, reviews, reels, payouts, safety and more. I explain and suggest; you stay in control of every change. What would you like to know?", quickReplies: QUICK };
  }
  if (has('thank', 'thanks', 'cheers', 'appreciate')) {
    return { text: "Anytime — happy hosting! Ask me whenever you want to check a number or figure out how something works.", quickReplies: QUICK };
  }
  if (/(who are you|are you (?:an? )?(?:ai|bot|human|chatgpt|gemini)|what can you do|how can you help)/i.test(q)) {
    return { text: "I'm StayOn's hosting assistant — built into the app to explain your numbers and how hosting works. I read your own reservation data for earnings/occupancy answers, and I can walk you through listing, pricing, payouts, reviews, reels, safety and more. I only advise; I never change anything for you.", quickReplies: QUICK };
  }

  // ── Live-data intents (use the host's real reservation numbers) ─────────────
  // "How do I change my bank details" must NOT be caught here — that's a KB how-to.
  if (has('payout', 'get paid', 'when do i get', 'pending pay') && !/(change|update|new|edit|method|bank)/i.test(q)) {
    return { text: `You have ${money(s.pendingPayout)} in pending payouts from ${s.confirmed} confirmed ${s.confirmed === 1 ? 'stay' : 'stays'}. Each releases about 24 hours after the guest checks in. StayOn charges no host fee — you keep your full rate plus the cleaning fee (taxes pass through).`, quickReplies: QUICK, route: 'Payouts', routeLabel: 'Open Payouts' };
  }
  if (has('earn', 'made', 'revenue', 'income', 'how much money', 'total earn')) {
    return { text: `So far you've earned ${money(s.total)} across ${s.bookings} ${s.bookings === 1 ? 'booking' : 'bookings'} (${s.nights} nights). StayOn takes no platform fee — that's 100% of your rate plus cleaning. ${s.bestMonth ? `Your best month is ${s.bestMonth.label} at ${money(s.bestMonth.value)}.` : ''}`, quickReplies: QUICK, route: 'Earnings', routeLabel: 'Open Earnings' };
  }
  if (has('occupan', 'how full', 'how booked')) {
    return { text: `Your occupancy is about ${s.occupancy}%. ${s.occupancy < 60 ? 'There’s room to fill — you could open more dates or tune weekend pricing. Ask me “how do I get more bookings?”' : 'Nicely booked!'}`, quickReplies: QUICK, route: 'Trends', routeLabel: 'Open Trends' };
  }
  if (has('best month', 'peak month', 'highest earning', 'top month')) {
    return { text: s.bestMonth ? `Your best month is ${s.bestMonth.label}, bringing in ${money(s.bestMonth.value)}. You could add a small weekend premium in peak months.` : 'Not enough data yet to spot a peak month.', quickReplies: QUICK, route: 'Payouts', routeLabel: 'Open Payouts' };
  }
  if (has('average rate', 'avg rate', 'nightly rate', 'my rate', 'adr')) {
    return { text: `Your average realised nightly rate is ${money(s.avgRate)}. Weekends often support more — try a modest weekend uplift, or use Smart Pricing.`, quickReplies: QUICK, route: 'Trends', routeLabel: 'Open Trends' };
  }
  if (has('cancellation rate', 'how many cancel', 'cancelled bookings', 'cancellations')) {
    return { text: `You've had ${s.cancelled} cancellation${s.cancelled === 1 ? '' : 's'} (${s.cancelRate}% of bookings). A clear cancellation policy helps keep this low.`, quickReplies: QUICK, route: 'ReservationsTab', routeLabel: 'Open Reservations' };
  }
  if (has('pending request', 'requests', 'awaiting', 'to respond', 'reply to guest')) {
    return { text: `You have ${s.pending} request${s.pending === 1 ? '' : 's'} awaiting your reply. Responding within 24 hours protects your response rate. I can't accept them for you — open Reservations → Requests to decide.`, quickReplies: QUICK, route: 'ReservationsTab', routeLabel: 'Open Reservations' };
  }
  if (has('booking stats', 'how many booking', 'reservation', 'my stats', 'how many night')) {
    return { text: `Bookings: ${s.confirmed} confirmed, ${s.completed} completed, ${s.pending} pending, ${s.cancelled} cancelled — ${s.nights} nights earned so far.`, quickReplies: QUICK, route: 'ReservationsTab', routeLabel: 'Open Reservations' };
  }

  // ── Knowledge base (how hosting works) ──────────────────────────────────────
  const kb = bestKbMatch(question);
  if (kb) {
    const r = KB_ROUTE[kb.id];
    return { text: pick(kb.answers), quickReplies: kb.quick ?? QUICK, route: r?.route, routeLabel: r?.label };
  }

  // Generic "suggest / improve" → data-aware ideas.
  if (has('suggest', 'tip', 'advice', 'improve', 'idea', 'optimi', 'what to do', 'what should i', 'what needs', 'help me manage', 'manage my')) {
    return { text: `A few ideas (yours to apply): ${s.occupancy < 60 ? 'open more dates and consider lower mid‑week rates; ' : ''}add a small weekend premium, reply to requests fast, keep 12+ bright photos, and try Smart Pricing. For a prioritised list from your own data, open Smart suggestions. I only suggest — you make the changes.`, quickReplies: ['Get more bookings', 'Smart Pricing', 'Smart suggestions'], route: 'SmartSuggestions', routeLabel: 'Open Smart suggestions' };
  }

  // Warm, helpful fallback (never a dead end).
  return { text: pick([
    "Happy to help! I can explain your earnings, payouts, occupancy, best month, rate and booking stats — or how anything hosting works: listing, pricing, calendar, house rules, reviews, reels, payouts, safety and more. What would you like to know?",
    "I'm your hosting assistant — ask me about your numbers (earnings, payouts, occupancy) or how to do things (list a place, change payout details, get more bookings, post a vlog, set up safety). What can I help with?",
  ]), quickReplies: QUICK };
}

export const ASSISTANT_PROMPTS = QUICK;
