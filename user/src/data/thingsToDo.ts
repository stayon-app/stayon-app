// "Things to Do" — purely informational travel inspiration. NOT hosted, no
// contact, no booking, no payment. Each item describes what to do at a place:
// what you'll see/do, best time to visit, what to carry, tips, and traveller
// reviews. Local items are templated to the user's city; world items are fixed.

const img = (id: string) => `https://images.unsplash.com/${id}?w=1000&q=80&auto=format&fit=crop`;
const av = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0D9488&color=fff`;

export interface TodoReview {
  name: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
}

export interface ThingToDo {
  id: string;
  title: string;
  category: string;
  city: string;
  country: string;
  location: string;     // "City, Country"
  area: string;         // neighbourhood / where it is
  address: string;      // approximate start/meeting area (not a booking address)
  bestTime: string;     // best time to visit
  duration: string;
  image: string;
  gallery: string[];
  summary: string;
  description: string;
  highlights: string[]; // what you'll do / see
  whatToCarry: string[];
  tips: string[];
  rating: number;
  reviewCount: number;
  reviews: TodoReview[];
}

const REVIEWS_A: TodoReview[] = [
  { name: 'Aarav Mehta', avatar: av('Aarav Mehta'), rating: 5, date: 'May 2026', text: 'Did this on a free morning and loved it. Easy to do on your own — just wandered and soaked it in.' },
  { name: 'Sophie Turner', avatar: av('Sophie Turner'), rating: 4, date: 'Apr 2026', text: 'Lovely experience. Go a bit earlier to beat the crowds and the heat.' },
  { name: 'Diego Ramos', avatar: av('Diego Ramos'), rating: 5, date: 'Mar 2026', text: 'A highlight of our trip. Bring a camera — so many photo spots!' },
];
const REVIEWS_B: TodoReview[] = [
  { name: 'Mia Chen', avatar: av('Mia Chen'), rating: 5, date: 'May 2026', text: 'Absolutely magical. Worth staying out late for. Dress warm!' },
  { name: 'Liam O’Brien', avatar: av('Liam OBrien'), rating: 4, date: 'Feb 2026', text: 'Great vibe. We just turned up and figured it out — no booking needed.' },
];

type LocalKind = 'walking' | 'food' | 'hike' | 'markets' | 'wellness' | 'nightlife';

function localItem(id: string, kind: LocalKind, city: string, country: string): ThingToDo {
  const location = [city, country].filter(Boolean).join(', ') || 'Nearby';
  const base = { id, city, country, location, rating: 4.7, reviewCount: 128, reviews: REVIEWS_A };
  if (kind === 'walking') return {
    ...base, title: `${city} Old Town Walking Tour`, category: 'Culture', area: `Old Town, ${city}`,
    address: `Historic centre, ${city}`, bestTime: 'Morning (cooler & quieter)', duration: '2–3 hours',
    image: img('photo-1511739001486-6bfe10ce785f'),
    gallery: [img('photo-1511739001486-6bfe10ce785f'), img('photo-1502602898657-3e91760cbb34'), img('photo-1480714378408-67cf0d13bc1b')],
    summary: 'Wander the historic heart of the city on foot.',
    description: `Explore the oldest part of ${city} on foot — winding lanes, centuries‑old architecture, lively squares and the little details that tell the city's story. Set your own pace, stop for coffee, and let the streets lead you. No guide or booking needed — this is a self‑guided wander you can start whenever you like.`,
    highlights: ['Cobblestone lanes & heritage architecture', 'The main old‑town square & landmarks', 'Hidden courtyards and local shops', 'Great street‑photography spots', 'Cafés and bakeries to pause at'],
    whatToCarry: ['Comfortable walking shoes', 'Water bottle', 'Hat & sunscreen', 'Camera or phone', 'A little cash for cafés'],
    tips: ['Start early to beat crowds and heat', 'Wear shoes you can walk in for hours', 'Look up — the best details are above eye level', 'Duck into side lanes off the main square'],
  };
  if (kind === 'food') return {
    ...base, title: `Street Food & Local Eats in ${city}`, category: 'Food & Drink', area: `Food lanes, ${city}`,
    address: `Main market & food street, ${city}`, bestTime: 'Evening (stalls come alive)', duration: '2 hours', reviewCount: 96,
    image: img('photo-1555396273-367ea4eb4db5'),
    gallery: [img('photo-1555396273-367ea4eb4db5'), img('photo-1504674900247-0877df9cc836'), img('photo-1517248135467-4c7edcad34c4')],
    summary: 'Taste your way through the city’s best street food.',
    description: `Eat like a local in ${city}. Follow the aromas through busy food lanes, try the signature dishes, sweets and drinks, and watch vendors cook fresh in front of you. Go where the locals queue — that's always the best sign. Purely a guide to what to try; you pay the vendors directly as you go.`,
    highlights: ['Signature local dishes & snacks', 'Bustling evening food streets', 'Fresh sweets and desserts', 'Local chai / coffee culture', 'Vendors cooking to order'],
    whatToCarry: ['Small cash & change', 'An appetite', 'Hand sanitiser & tissues', 'Water', 'A reusable bag'],
    tips: ['Go hungry — pace yourself across stalls', 'Eat where there’s a local crowd', 'Evenings have the most variety', 'Ask for “less spicy” if you’re unsure'],
  };
  if (kind === 'wellness') return {
    ...base, title: `Spa & Wellness Afternoon in ${city}`, category: 'Wellness', area: `Wellness district, ${city}`,
    address: `Spa quarter, ${city}`, bestTime: 'Afternoon (wind down)', duration: '2–3 hours', rating: 4.8, reviewCount: 84,
    image: img('photo-1540555700478-4be289fbecef'),
    gallery: [img('photo-1540555700478-4be289fbecef'), img('photo-1544161515-4ab6ce6db874'), img('photo-1571902943202-507ec2618e8f')],
    summary: 'Relax with a spa, sauna or gentle yoga session.',
    description: `Slow the day right down in ${city}. Treat yourself to a massage, a steam or sauna, or a gentle yoga or meditation session at a local wellness spot. It's the perfect reset between sightseeing days. We just point you to the idea — book directly with the spa or studio you choose.`,
    highlights: ['Massage, sauna or steam', 'Calming yoga or meditation', 'Herbal teas & quiet lounges', 'A proper mid‑trip reset'],
    whatToCarry: ['Comfortable, loose clothing', 'A change of clothes', 'Water to rehydrate', 'Booking confirmation if you reserve'],
    tips: ['Book ahead on weekends', 'Arrive early to use the facilities', 'Hydrate well afterwards', 'Go phone‑free for the full reset'],
  };
  if (kind === 'nightlife') return {
    ...base, title: `${city} After Dark: Bars & Live Music`, category: 'Entertainment', area: `Nightlife quarter, ${city}`,
    address: `Bar & music district, ${city}`, bestTime: 'Evening into night', duration: '3–4 hours', rating: 4.7, reviewCount: 102, reviews: REVIEWS_B,
    image: img('photo-1514525253161-7a46d19cd819'),
    gallery: [img('photo-1514525253161-7a46d19cd819'), img('photo-1470229722913-7c0e2dbbafd3'), img('photo-1516450360452-9312f5e86fc7')],
    summary: 'Experience the city after dark — bars, music & rooftops.',
    description: `See how ${city} comes alive at night. Hop between characterful bars, catch live music, or take in the skyline from a rooftop. Go where the locals go for the real vibe. Purely a guide to the scene — you order and pay at each venue as you go.`,
    highlights: ['Local bars & craft cocktails', 'Live music & DJ sets', 'Rooftop & skyline views', 'Late‑night eats nearby'],
    whatToCarry: ['ID for entry', 'Cash & card', 'A light jacket for rooftops', 'Your hotel/stay address'],
    tips: ['Start later — things warm up after 9pm', 'Ask locals for the best spot tonight', 'Plan a safe ride back to your stay', 'Stay aware of your belongings'],
  };
  if (kind === 'hike') return {
    ...base, title: `${city} Sunset Viewpoint Hike`, category: 'Adventure', area: `Hills near ${city}`,
    address: `Viewpoint trailhead, ${city} outskirts`, bestTime: 'Late afternoon (for golden hour)', duration: '2–3 hours', rating: 4.8, reviewCount: 74, reviews: REVIEWS_B,
    image: img('photo-1451337516015-6b6e9a44a8a3'),
    gallery: [img('photo-1451337516015-6b6e9a44a8a3'), img('photo-1454496522488-7a8e488e8606'), img('photo-1500534314209-a25ddb2bd429')],
    summary: 'A short climb to the best sunset view in town.',
    description: `Hike up to the viewpoint above ${city} for a panoramic sunset. The trail is a moderate climb that rewards you with sweeping views over the city and hills as the light turns golden. Time it to reach the top about half an hour before sunset. Free to do — just bring water and good shoes.`,
    highlights: ['Panoramic city & valley views', 'Golden‑hour & sunset photography', 'A satisfying moderate climb', 'Quiet ridge away from the crowds'],
    whatToCarry: ['Plenty of water', 'Sturdy shoes / trainers', 'A light layer for after sunset', 'Phone torch for the way down', 'A snack'],
    tips: ['Start ~2 hours before sunset', 'Check the weather first', 'Carry a torch — it gets dark fast', 'Don’t leave litter on the trail'],
  };
  return {
    ...base, title: `Markets & Craft Trail, ${city}`, category: 'Culture', area: `Market district, ${city}`,
    address: `Central bazaar, ${city}`, bestTime: 'Daytime (mornings are freshest)', duration: '2 hours', reviewCount: 110,
    image: img('photo-1504609813442-a8924e83f76e'),
    gallery: [img('photo-1504609813442-a8924e83f76e'), img('photo-1488459716781-31db52582fe9'), img('photo-1519415943484-9fa1873496d4')],
    summary: 'Browse local crafts, textiles and colourful stalls.',
    description: `Get lost in the markets of ${city}. Browse handmade crafts, textiles, spices and souvenirs, soak up the colour and noise, and pick up something handmade to remember the trip. A self‑guided stroll — buy directly from the makers and sellers.`,
    highlights: ['Handicrafts & local textiles', 'Spices, teas and souvenirs', 'Colourful, lively stalls', 'Occasional street performers', 'Great people‑watching'],
    whatToCarry: ['Cash for small purchases', 'A foldable tote bag', 'A friendly bargaining smile', 'Water'],
    tips: ['Bargain politely — it’s expected', 'Mornings have the freshest goods', 'Weekends are liveliest', 'Keep valuables secure in crowds'],
  };
}

const WORLD: ThingToDo[] = [
  {
    id: 'td-world-1', title: 'Santorini Sunset Sail', category: 'Water Sports', city: 'Santorini', country: 'Greece',
    location: 'Santorini, Greece', area: 'Caldera coast, Santorini', address: 'Ammoudi / Oia waterfront, Santorini',
    bestTime: 'Late afternoon into evening', duration: '4–5 hours', rating: 4.9, reviewCount: 540,
    image: img('photo-1544551763-46a013bb70d5'),
    gallery: [img('photo-1544551763-46a013bb70d5'), img('photo-1570077188670-e3a8d69ac5ff'), img('photo-1613395877344-13d4a8e0d49e')],
    summary: 'Sail the caldera as the famous Santorini sun goes down.',
    description: 'Drift along Santorini’s volcanic caldera and watch one of the world’s most famous sunsets from the water. Swim in the hot springs, pass the red and white beaches, and end with the sky on fire behind the cliffs of Oia. A bucket‑list evening on the Aegean.',
    highlights: ['Sunset over the caldera from the water', 'Swim at the volcanic hot springs', 'Red Beach & White Beach views', 'The cliffs of Oia aglow'],
    whatToCarry: ['Swimwear & a towel', 'Light jacket for the evening breeze', 'Sunglasses & sunscreen', 'Camera', 'Motion‑sickness tablets if you’re prone'],
    tips: ['Evenings are cooler and the light is best', 'Bring a layer — it’s breezy at sea', 'Charge your camera fully'],
    reviews: REVIEWS_B,
  },
  {
    id: 'td-world-2', title: 'Northern Lights Chase', category: 'Adventure', city: 'Reykjavík', country: 'Iceland',
    location: 'Reykjavík, Iceland', area: 'Countryside outside Reykjavík', address: 'Dark‑sky spots beyond the city lights',
    bestTime: 'Night (Sep–Mar), clear skies', duration: '3–4 hours', rating: 4.7, reviewCount: 410,
    image: img('photo-1531366936337-7c912a4589a7'),
    gallery: [img('photo-1531366936337-7c912a4589a7'), img('photo-1483347756197-71ef80e95f73'), img('photo-1418985991508-e47386d96a71')],
    summary: 'Head into the dark to chase the aurora borealis.',
    description: 'Escape the city lights and scan the Icelandic night for the aurora borealis — curtains of green and violet dancing across the sky. Bring patience and warm clothes; when the lights appear, it’s unforgettable. Best on clear, dark winter nights.',
    highlights: ['The aurora borealis overhead', 'Vast, dark Icelandic skies', 'Long‑exposure night photography', 'Stargazing while you wait'],
    whatToCarry: ['Very warm layers, hat & gloves', 'A flask of something hot', 'Tripod for photos', 'Hand warmers', 'Patience'],
    tips: ['Check the aurora forecast & cloud cover', 'Get far from city lights', 'Let your eyes adjust to the dark', 'Dress warmer than you think'],
    reviews: REVIEWS_B,
  },
  {
    id: 'td-world-3', title: 'Flamenco Show & Tapas', category: 'Entertainment', city: 'Barcelona', country: 'Spain',
    location: 'Barcelona, Spain', area: 'Gothic Quarter, Barcelona', address: 'Old town tablaos & tapas bars',
    bestTime: 'Evening', duration: '2–3 hours', rating: 4.6, reviewCount: 322,
    image: img('photo-1551634979-2b11f8c946fe'),
    gallery: [img('photo-1551634979-2b11f8c946fe'), img('photo-1514933651103-005eec06c04b'), img('photo-1559339352-11d035aa65de')],
    summary: 'Passionate flamenco and a crawl through tapas bars.',
    description: 'Feel the rhythm of Spain with a live flamenco performance, then wander the Gothic Quarter hopping between tapas bars. Order a few small plates and a glass of local wine at each — it’s the perfect way to spend a Barcelona evening among locals.',
    highlights: ['Live flamenco — guitar, song & dance', 'A self‑guided tapas crawl', 'Atmospheric Gothic Quarter lanes', 'Local wines & vermouth'],
    whatToCarry: ['Cash for tapas bars', 'Comfortable shoes', 'An appetite', 'A light jacket'],
    tips: ['Eat late, like the locals (after 8pm)', 'Order one or two tapas per bar, then move on', 'Stand at the bar for the best buzz'],
    reviews: REVIEWS_A,
  },
];

const LOCAL_KINDS: Record<string, LocalKind> = {
  'td-local-1': 'walking', 'td-local-2': 'food', 'td-local-3': 'hike', 'td-local-4': 'markets',
  'td-local-5': 'wellness', 'td-local-6': 'nightlife',
};

/** Build the location-aware list for the home screen. */
export function buildThingsToDo(city: string, country: string): ThingToDo[] {
  const c = city || 'your area';
  const local = (Object.keys(LOCAL_KINDS) as string[]).map((id) => localItem(id, LOCAL_KINDS[id], c, country));
  return [...local, ...WORLD];
}

/** Look up one item by id (used by the detail screen as a fallback). */
export function getThingToDo(id: string, city = 'your area', country = ''): ThingToDo | null {
  if (id in LOCAL_KINDS) return localItem(id, LOCAL_KINDS[id], city, country);
  return WORLD.find((w) => w.id === id) ?? null;
}
