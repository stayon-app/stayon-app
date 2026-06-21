// StayOn website content — mirrors the user app's real data (src/data/*).
// Stays use USD ($), matching the app. Images are high-quality Unsplash crops.

const u = (id: string, w = 2000) =>
  `https://images.unsplash.com/${id}?w=${w}&q=85&auto=format&fit=crop`;

// Re-request an existing Unsplash URL at a higher width — used for full-screen
// galleries / hero / lightbox so they stay razor-sharp on 4K/5K/8K displays.
// (auto=format serves WebP/AVIF, so even 4K frames stay reasonably light.)
export const hiRes = (url: string, w = 3840) =>
  url.replace(/([?&])w=\d+/, `$1w=${w}`).replace(/([?&])q=\d+/, `$1q=90`);

const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`;

// Real Unsplash face photos for hosts & guests (matches the user app's host pool)
const face = (id: string) =>
  `https://images.unsplash.com/${id}?w=400&q=80&crop=faces&auto=format&fit=crop`;

export type Review = {
  name: string;
  avatar: string;
  location: string;
  date: string;
  rating: number;
  text: string;
};

export type Host = {
  name: string;
  avatar: string;
  since: number;
  superhost: boolean;
  verified: boolean;
  responseRate: number;
  responseTime: string;
  languages: string[];
  work: string;
  bio: string;
};

export type Stay = {
  id: string;
  title: string;
  type: string;
  city: string;
  country: string;
  location: string;
  price: number; // per night, USD
  rating: number;
  reviews: number;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  baths: number;
  images: string[];
  amenities: string[];
  vibes: string[];
  lat: number;
  lng: number;
  instantBook: boolean;
  guestFavourite?: boolean;
  badge?: string; // NEW / FEATURED
  description: string;
  highlights: { icon: string; title: string; desc: string }[];
  host: Host;
  reviewList: Review[];
};

const REVIEW_POOL: Omit<Review, 'rating'>[] = [
  { name: 'Sarah Chen', avatar: face('photo-1494790108377-be9c29b29330'), location: 'San Francisco, US', date: 'May 2026', text: 'Absolutely stunning — the photos do not do it justice. Spotless, and the host thought of every little detail. We did not want to leave.' },
  { name: 'James Okoro', avatar: face('photo-1507003211169-0a1dd7228f2d'), location: 'London, UK', date: 'April 2026', text: 'Incredible location and the views at sunset were unreal. Check-in was seamless with the smart lock. Would book again in a heartbeat.' },
  { name: 'Priya Nair', avatar: face('photo-1531123897727-8f129e1688ce'), location: 'Mumbai, IN', date: 'March 2026', text: 'Perfect for our family trip. Super comfortable beds, a great kitchen, and the host responded within minutes whenever we asked anything.' },
  { name: 'Lucas Müller', avatar: face('photo-1463453091185-61582044d556'), location: 'Berlin, DE', date: 'February 2026', text: 'A real gem. Quiet, beautifully designed, and walking distance to everything we wanted to see. Highly recommend.' },
  { name: 'Emma Wilson', avatar: face('photo-1517841905240-472988babdf9'), location: 'Sydney, AU', date: 'January 2026', text: 'One of the best stays we have ever had. The space is even more gorgeous in person and the little welcome gift was a lovely touch.' },
  { name: 'Diego Torres', avatar: face('photo-1492562080023-ab3db95bfbce'), location: 'Madrid, ES', date: 'December 2025', text: 'Great value for such a premium place. Everything worked, everything was clean, and the host gave brilliant local tips.' },
];

const reviewsFor = (seed: number, count: number): Review[] =>
  Array.from({ length: Math.min(count, REVIEW_POOL.length) }, (_, i) => {
    const r = REVIEW_POOL[(seed + i) % REVIEW_POOL.length];
    return { ...r, rating: 5 - ((seed + i) % 2 === 0 ? 0 : 0) };
  });

const HOSTS: Host[] = [
  { name: 'Olivia Rossi', avatar: face('photo-1544005313-94ddf0286df2'), since: 2017, superhost: true, verified: true, responseRate: 100, responseTime: 'within an hour', languages: ['English', 'Italian', 'Spanish'], work: 'Interior designer', bio: 'Designer turned host. I love creating calm, beautiful spaces and sharing my favourite local spots with every guest.' },
  { name: 'Marcus Lee', avatar: face('photo-1500648767791-00dcc994a43e'), since: 2019, superhost: true, verified: true, responseRate: 98, responseTime: 'within a few hours', languages: ['English', 'French'], work: 'Travel photographer', bio: 'Lifelong traveller, now hosting the kind of stays I always wished I could find on the road.' },
  { name: 'Aisha Khan', avatar: face('photo-1438761681033-6461ffad8d80'), since: 2020, superhost: false, verified: true, responseRate: 95, responseTime: 'within a day', languages: ['English', 'Hindi', 'Arabic'], work: 'Architect', bio: 'I restore old homes and give them a second life. Every detail in my places is chosen with care.' },
];

const baseHighlights = [
  { icon: 'key', title: 'Self check-in', desc: 'Check yourself in with the smart lock.' },
  { icon: 'pin', title: 'Great location', desc: '95% of recent guests gave the location 5 stars.' },
  { icon: 'shield', title: 'Free cancellation', desc: 'Cancel before check-in for a full refund.' },
];

export const STAYS: Stay[] = [
  {
    id: 'malibu', title: 'Malibu Beachfront Villa', type: 'Entire villa', city: 'Malibu', country: 'CA, USA',
    location: 'Malibu, California', price: 420, rating: 4.96, reviews: 184, maxGuests: 8, bedrooms: 4, beds: 5, baths: 3,
    images: [u('photo-1520250497591-112f2f40a3f4'), u('photo-1505693416388-ac5ce068fe85'), u('photo-1582268611958-ebfd161ef9cf'), u('photo-1613490493576-7fde63acd811')],
    amenities: ['Beachfront', 'Pool', 'Wifi', 'Kitchen', 'Free parking', 'Air conditioning', 'Hot tub', 'BBQ grill'],
    vibes: ['beach', 'luxury', 'romantic'], lat: 34.0259, lng: -118.7798, instantBook: true, guestFavourite: true,
    description: 'Wake up to the sound of the Pacific in this architect-designed villa right on the sand. Floor-to-ceiling glass, an infinity pool that melts into the horizon, and a chef’s kitchen made for long dinners. This is the California dream, dialled all the way up.',
    highlights: baseHighlights, host: HOSTS[0], reviewList: reviewsFor(0, 4),
  },
  {
    id: 'manhattan', title: 'Manhattan Skyline Loft', type: 'Entire loft', city: 'New York', country: 'NY, USA',
    location: 'New York, New York', price: 350, rating: 4.92, reviews: 312, maxGuests: 4, bedrooms: 2, beds: 2, baths: 2,
    images: [u('photo-1502672260266-1c1ef2d93688'), u('photo-1493809842364-78817add7ffb'), u('photo-1545324418-cc1a3fa10c00'), u('photo-1560448204-e02f11c3d0e2')],
    amenities: ['Wifi', 'Kitchen', 'Air conditioning', 'Gym', 'Dedicated workspace', 'Elevator', 'City view'],
    vibes: ['city', 'luxury', 'work'], lat: 40.7128, lng: -74.006, instantBook: true, badge: 'FEATURED', guestFavourite: true,
    description: 'A soaring corner loft in the heart of the city, with double-height windows framing the skyline. Industrial bones, warm furnishings, and a workspace you will actually want to use. Steps from the best food, art and nightlife Manhattan has to offer.',
    highlights: baseHighlights, host: HOSTS[1], reviewList: reviewsFor(1, 5),
  },
  {
    id: 'aspen', title: 'Aspen Alpine Chalet', type: 'Entire chalet', city: 'Aspen', country: 'CO, USA',
    location: 'Aspen, Colorado', price: 540, rating: 4.98, reviews: 96, maxGuests: 10, bedrooms: 5, beds: 6, baths: 4,
    images: [u('photo-1502672260266-1c1ef2d93688'), u('photo-1449158743715-0a90ebb6d2d8'), u('photo-1518780664697-55e3ad937233'), u('photo-1551524559-8af4e6624178')],
    amenities: ['Hot tub', 'Wifi', 'Fireplace', 'Free parking', 'Kitchen', 'Ski-in/ski-out', 'Mountain view'],
    vibes: ['mountain', 'ski', 'luxury', 'family'], lat: 39.1911, lng: -106.8175, instantBook: false, guestFavourite: true,
    description: 'A timber-and-stone chalet tucked into the mountainside, minutes from the lifts. Sink into the hot tub after a day on the slopes, gather around the stone fireplace, and watch snow fall over the peaks from every window.',
    highlights: baseHighlights, host: HOSTS[2], reviewList: reviewsFor(2, 4),
  },
  {
    id: 'tahoe', title: 'Lake Tahoe Pinewood Cabin', type: 'Entire cabin', city: 'Lake Tahoe', country: 'CA, USA',
    location: 'Lake Tahoe, California', price: 185, rating: 4.89, reviews: 142, maxGuests: 6, bedrooms: 3, beds: 4, baths: 2,
    images: [u('photo-1449158743715-0a90ebb6d2d8'), u('photo-1470770841072-f978cf4d019e'), u('photo-1542718610-a1d656d1884c'), u('photo-1518780664697-55e3ad937233')],
    amenities: ['Fireplace', 'Wifi', 'Free parking', 'Kitchen', 'Pets allowed', 'Lake access', 'Deck'],
    vibes: ['lake', 'nature', 'family', 'adventure'], lat: 39.0968, lng: -120.0324, instantBook: true,
    description: 'A cosy pinewood cabin a short stroll from the shore. Spend your days on the water and your evenings by the fire. Bring the dog — the whole family is welcome here.',
    highlights: baseHighlights, host: HOSTS[1], reviewList: reviewsFor(3, 4),
  },
  {
    id: 'miami', title: 'Miami South Beach Suite', type: 'Entire apartment', city: 'Miami', country: 'FL, USA',
    location: 'Miami, Florida', price: 240, rating: 4.85, reviews: 268, maxGuests: 4, bedrooms: 2, beds: 2, baths: 2,
    images: [u('photo-1535498730771-e735b998cd64'), u('photo-1502672260266-1c1ef2d93688'), u('photo-1560185007-cde436f6a4d0'), u('photo-1564013799919-ab600027ffc6')],
    amenities: ['Pool', 'Wifi', 'Air conditioning', 'Gym', 'Beachfront', 'Balcony', 'Kitchen'],
    vibes: ['beach', 'city', 'romantic'], lat: 25.7825, lng: -80.1340, instantBook: true, guestFavourite: true,
    description: 'Art-deco glamour one block from the ocean. Pastel sunsets from the balcony, a rooftop pool, and the best of South Beach right outside your door.',
    highlights: baseHighlights, host: HOSTS[0], reviewList: reviewsFor(4, 4),
  },
  {
    id: 'austin', title: 'Austin Hill Country Bungalow', type: 'Entire bungalow', city: 'Austin', country: 'TX, USA',
    location: 'Austin, Texas', price: 95, rating: 4.87, reviews: 203, maxGuests: 4, bedrooms: 2, beds: 3, baths: 1,
    images: [u('photo-1505691938895-1758d7feb511'), u('photo-1484154218962-a197022b5858'), u('photo-1556912173-3bb406ef7e77'), u('photo-1493809842364-78817add7ffb')],
    amenities: ['Wifi', 'Kitchen', 'Free parking', 'Pets allowed', 'Dedicated workspace', 'Backyard'],
    vibes: ['budget', 'city', 'pet'], lat: 30.2672, lng: -97.7431, instantBook: true, badge: 'NEW',
    description: 'A bright bungalow in the leafy hills, minutes from the music and food of South Congress. Calm, characterful and easy on the wallet.',
    highlights: baseHighlights, host: HOSTS[2], reviewList: reviewsFor(5, 3),
  },
  {
    id: 'london', title: 'Notting Hill Garden Flat', type: 'Entire flat', city: 'London', country: 'United Kingdom',
    location: 'London, United Kingdom', price: 310, rating: 4.91, reviews: 224, maxGuests: 4, bedrooms: 2, beds: 2, baths: 2,
    images: [u('photo-1513635269975-59663e0ac1ad'), u('photo-1502672260266-1c1ef2d93688'), u('photo-1560448204-e02f11c3d0e2'), u('photo-1493809842364-78817add7ffb')],
    amenities: ['Wifi', 'Kitchen', 'Dedicated workspace', 'Fireplace', 'Garden', 'Washer'],
    vibes: ['city', 'luxury', 'romantic', 'work'], lat: 51.5074, lng: -0.1278, instantBook: false, guestFavourite: true,
    description: 'A serene garden flat on a pastel-painted Notting Hill street. Period details meet modern comfort, with a private garden made for slow mornings and a coffee.',
    highlights: baseHighlights, host: HOSTS[0], reviewList: reviewsFor(1, 4),
  },
  {
    id: 'paris', title: 'Le Marais Designer Loft', type: 'Entire loft', city: 'Paris', country: 'France',
    location: 'Paris, France', price: 290, rating: 4.94, reviews: 271, maxGuests: 3, bedrooms: 1, beds: 2, baths: 1,
    images: [u('photo-1502602898657-3e91760cbb34'), u('photo-1512917774080-9991f1c4c750'), u('photo-1493809842364-78817add7ffb'), u('photo-1560448204-e02f11c3d0e2')],
    amenities: ['Wifi', 'Kitchen', 'Air conditioning', 'Dedicated workspace', 'Balcony', 'Elevator'],
    vibes: ['romantic', 'city', 'luxury'], lat: 48.8566, lng: 2.3522, instantBook: true, guestFavourite: true,
    description: 'A light-filled loft in the beating heart of Le Marais. Exposed beams, curated art and a tiny balcony perfect for an evening glass of wine above the cobblestones.',
    highlights: baseHighlights, host: HOSTS[2], reviewList: reviewsFor(2, 5),
  },
  {
    id: 'barcelona', title: 'Barcelona Beachside Penthouse', type: 'Entire penthouse', city: 'Barcelona', country: 'Spain',
    location: 'Barcelona, Spain', price: 230, rating: 4.90, reviews: 245, maxGuests: 6, bedrooms: 3, beds: 3, baths: 2,
    images: [u('photo-1562883676-8c7feb83f09b'), u('photo-1564013799919-ab600027ffc6'), u('photo-1502672260266-1c1ef2d93688'), u('photo-1560185007-cde436f6a4d0')],
    amenities: ['Pool', 'Wifi', 'Air conditioning', 'Beachfront', 'Gym', 'Terrace', 'Kitchen'],
    vibes: ['beach', 'city', 'luxury', 'family'], lat: 41.3851, lng: 2.1734, instantBook: true,
    description: 'A sun-drenched penthouse with a wraparound terrace and the Mediterranean as your backdrop. Tapas downstairs, the beach across the road, Gaudí a short ride away.',
    highlights: baseHighlights, host: HOSTS[1], reviewList: reviewsFor(3, 4),
  },
  {
    id: 'santorini', title: 'Santorini Caldera Cave Suite', type: 'Cave suite', city: 'Santorini', country: 'Greece',
    location: 'Oia, Santorini', price: 410, rating: 4.99, reviews: 158, maxGuests: 2, bedrooms: 1, beds: 1, baths: 1,
    images: [u('photo-1570077188670-e3a8d69ac5ff'), u('photo-1571896349842-33c89424de2d'), u('photo-1613490493576-7fde63acd811'), u('photo-1582268611958-ebfd161ef9cf')],
    amenities: ['Plunge pool', 'Wifi', 'Air conditioning', 'Caldera view', 'Breakfast', 'Terrace'],
    vibes: ['romantic', 'luxury', 'beach'], lat: 36.4618, lng: 25.3753, instantBook: false, guestFavourite: true, badge: 'FEATURED',
    description: 'A whitewashed cave suite carved into the cliffs of Oia, with a private plunge pool overlooking the caldera. The most famous sunset in the world, all to yourself.',
    highlights: baseHighlights, host: HOSTS[0], reviewList: reviewsFor(4, 5),
  },
  {
    id: 'kyoto', title: 'Kyoto Garden Machiya', type: 'Entire townhouse', city: 'Kyoto', country: 'Japan',
    location: 'Kyoto, Japan', price: 260, rating: 4.94, reviews: 131, maxGuests: 4, bedrooms: 2, beds: 3, baths: 1,
    images: [u('photo-1545569341-9eb8b30979d9'), u('photo-1503899036084-c55cdd92da26'), u('photo-1490806843957-31f4c9a91c65'), u('photo-1493809842364-78817add7ffb')],
    amenities: ['Wifi', 'Kitchen', 'Garden', 'Tatami room', 'Tea set', 'Heating'],
    vibes: ['nature', 'romantic', 'city'], lat: 35.0116, lng: 135.7681, instantBook: true,
    description: 'A restored wooden machiya with a private moss garden and a cypress soaking tub. A pocket of stillness moments from the temples and lantern-lit lanes of old Kyoto.',
    highlights: baseHighlights, host: HOSTS[2], reviewList: reviewsFor(0, 4),
  },
  {
    id: 'goa', title: 'Assagao Poolside Villa', type: 'Entire villa', city: 'Goa', country: 'India',
    location: 'Assagao, North Goa', price: 175, rating: 4.88, reviews: 167, maxGuests: 8, bedrooms: 4, beds: 4, baths: 4,
    images: [u('photo-1613490493576-7fde63acd811'), u('photo-1576941089067-2de3c901e126'), u('photo-1564013799919-ab600027ffc6'), u('photo-1505693416388-ac5ce068fe85')],
    amenities: ['Pool', 'Wifi', 'Air conditioning', 'Free parking', 'Kitchen', 'Garden', 'BBQ grill'],
    vibes: ['beach', 'family', 'luxury'], lat: 15.5994, lng: 73.7625, instantBook: true, guestFavourite: true,
    description: 'A Portuguese-style villa wrapped around a palm-fringed pool in leafy Assagao. Long lazy lunches, beach clubs minutes away, and Goa’s best cafes on your doorstep.',
    highlights: baseHighlights, host: HOSTS[1], reviewList: reviewsFor(5, 4),
  },
];

export const stayById = (id: string) => STAYS.find((s) => s.id === id) || genCache.get(id);

/* ───────────────────────── Dynamic stays for ANY location (so every city/state/country returns results) ───────────────────────── */
const genCache = new Map<string, Stay>();
function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed: number) { let x = seed || 1; return () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(arr: T[], r: number) => arr[Math.floor(r * arr.length) % arr.length];

const GEN_IMAGES = ['photo-1502672260266-1c1ef2d93688', 'photo-1560448204-e02f11c3d0e2', 'photo-1505691938895-1758d7feb511', 'photo-1522708323590-d24dbb6b0267', 'photo-1493809842364-78817add7ffb', 'photo-1484154218962-a197022b5858', 'photo-1556912173-3bb406ef7e77', 'photo-1560185007-cde436f6a4d0', 'photo-1505693416388-ac5ce068fe85', 'photo-1551524559-8af4e6624178', 'photo-1564013799919-ab600027ffc6', 'photo-1512917774080-9991f1c4c750'];
const GEN_TYPES = ['Apartment', 'Villa', 'Loft', 'Cottage', 'Studio', 'Bungalow', 'Penthouse', 'Home', 'Cabin', 'Flat', 'Townhouse', 'Farmhouse'];
const GEN_AREAS = ['Downtown', 'Old Town', 'Riverside', 'Hillside', 'Central', 'Lakeview', 'Marina', 'Garden District', 'Uptown', 'Beachside', 'Heritage Quarter', 'The Heights'];
const GEN_AMEN = ['Wifi', 'Kitchen', 'Air conditioning', 'Free parking', 'Pool', 'Dedicated workspace', 'TV', 'Hot tub', 'Balcony', 'Pets allowed', 'Gym', 'Fireplace', 'Garden'];
const GEN_VIBES = ['city', 'beach', 'luxury', 'family', 'romantic', 'budget', 'nature', 'work'];
const titleCase = (s: string) => s.replace(/\b\w/g, (c) => c.toUpperCase());

export function generateStaysFor(query: string, center?: { lat: number; lng: number }, count = 18): Stay[] {
  const q = query.trim();
  if (!q) return [];
  const seed = hashStr(q.toLowerCase());
  const r = rngFrom(seed);
  const city = titleCase(q);
  const baseLat = center?.lat ?? 20.5;
  const baseLng = center?.lng ?? 78.9;
  const out: Stay[] = [];
  for (let i = 0; i < count; i++) {
    const id = `gen-${seed}-${i}`;
    const type = pick(GEN_TYPES, r());
    const area = pick(GEN_AREAS, r());
    const price = 40 + Math.floor(r() * 470);
    const beds = 1 + Math.floor(r() * 4);
    const amenities = [...new Set(Array.from({ length: 5 + Math.floor(r() * 3) }, () => pick(GEN_AMEN, r())))];
    const vibes = [...new Set(Array.from({ length: 2 + Math.floor(r() * 2) }, () => pick(GEN_VIBES, r())))];
    const imgs = [0, 1, 2, 3].map((k) => u(GEN_IMAGES[(i + k * 4) % GEN_IMAGES.length]));
    const stay: Stay = {
      id, title: `${type} in ${area}`, type: `Entire ${type.toLowerCase()}`, city, country: '',
      location: `${area}, ${city}`, price, rating: +(4.6 + r() * 0.39).toFixed(2), reviews: 6 + Math.floor(r() * 380),
      maxGuests: beds * 2, bedrooms: beds, beds: beds + Math.floor(r() * 2), baths: 1 + Math.floor(r() * 3),
      images: imgs, amenities, vibes, lat: baseLat + (r() - 0.5) * 0.16, lng: baseLng + (r() - 0.5) * 0.16,
      instantBook: r() > 0.45, guestFavourite: r() > 0.7, badge: r() > 0.85 ? 'NEW' : undefined,
      description: `A bright, beautifully kept ${type.toLowerCase()} in ${area}, ${city}. Moments from the best food, sights and nightlife the area has to offer — your perfect base for exploring.`,
      highlights: baseHighlights, host: HOSTS[i % HOSTS.length], reviewList: reviewsFor(i, 4),
    };
    genCache.set(id, stay);
    out.push(stay);
  }
  return out;
}

/* ───────────────────────── Search (city / state / country / type / vibe — space & case insensitive) ───────────────────────── */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '');
const tokenize = (s: string) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Nicknames & alternate spellings → canonical phrase present in the data.
const SEARCH_ALIASES: Record<string, string> = {
  nyc: 'new york', manhattan: 'new york', ny: 'new york', bigapple: 'new york',
  la: 'malibu', cali: 'california', sf: 'san francisco',
  uk: 'united kingdom', england: 'united kingdom', britain: 'united kingdom',
  bombay: 'mumbai', usa: 'usa', us: 'usa', states: 'usa',
  greece: 'greece', japan: 'japan', spain: 'spain', france: 'france', india: 'india',
};

export function stayMatches(s: Stay, query: string): boolean {
  if (!query.trim()) return true;
  const hay = norm([s.title, s.location, s.city, s.country, s.type, ...s.vibes, ...s.amenities].join(' '));
  const raw = query.trim().toLowerCase();
  const candidates = [raw, SEARCH_ALIASES[norm(raw)]].filter(Boolean) as string[];
  return candidates.some((q) => {
    const collapsed = norm(q);
    if (collapsed && hay.includes(collapsed)) return true; // "newyork" → matches "new york"
    const toks = tokenize(q);
    return toks.length > 0 && toks.every((t) => hay.includes(t)); // "new york" / "goa villa"
  });
}

export function searchStays(query: string): Stay[] {
  return STAYS.filter((s) => stayMatches(s, query));
}

export type Section = { id: string; title: string; subtitle?: string; icon?: string; ids: string[] };

export const SECTIONS: Section[] = [
  { id: 'fav', title: 'Guest favourites', subtitle: 'Loved by travellers worldwide', icon: 'gem', ids: ['malibu', 'manhattan', 'santorini', 'paris', 'aspen', 'goa'] },
  { id: 'beach', title: 'Beachfront escapes', subtitle: 'Wake up to the water', icon: 'umbrella', ids: ['malibu', 'miami', 'barcelona', 'goa', 'santorini'] },
  { id: 'city', title: 'City stays for explorers', subtitle: 'Right in the middle of it all', icon: 'building', ids: ['manhattan', 'london', 'paris', 'barcelona', 'kyoto'] },
  { id: 'budget', title: 'Hidden gems under $200', subtitle: 'Big on character, easy on the wallet', icon: 'tag', ids: ['austin', 'tahoe', 'goa', 'barcelona'] },
];

export const CATEGORIES = [
  { id: 'all', label: 'All', icon: 'home' },
  { id: 'beach', label: 'Beachfront', icon: 'umbrella' },
  { id: 'luxury', label: 'Luxe', icon: 'gem' },
  { id: 'mountain', label: 'Mountain', icon: 'mountain' },
  { id: 'city', label: 'City', icon: 'building' },
  { id: 'lake', label: 'Lakefront', icon: 'waves' },
  { id: 'romantic', label: 'Romantic', icon: 'sunset' },
  { id: 'ski', label: 'Ski', icon: 'snow' },
  { id: 'family', label: 'Family', icon: 'users' },
  { id: 'budget', label: 'Budget', icon: 'tag' },
];

export type Destination = { id: string; city: string; country: string; image: string; why: string; bestSeason: string; stays: number };

export const DESTINATIONS: Destination[] = [
  { id: 'la', city: 'Los Angeles', country: 'USA', image: u('photo-1444723121867-7a241cacace9', 900), why: 'Sunshine & city glamour', bestSeason: 'Mar–Jun', stays: 128 },
  { id: 'miami', city: 'Miami', country: 'USA', image: u('photo-1535498730771-e735b998cd64', 900), why: 'Beaches & art deco', bestSeason: 'Nov–Apr', stays: 96 },
  { id: 'london', city: 'London', country: 'UK', image: u('photo-1513635269975-59663e0ac1ad', 900), why: 'Timeless & elegant', bestSeason: 'May–Sep', stays: 142 },
  { id: 'paris', city: 'Paris', country: 'France', image: u('photo-1502602898657-3e91760cbb34', 900), why: 'The city of lights', bestSeason: 'Apr–Jun', stays: 110 },
  { id: 'santorini', city: 'Santorini', country: 'Greece', image: u('photo-1570077188670-e3a8d69ac5ff', 900), why: 'Sunsets & blue domes', bestSeason: 'May–Oct', stays: 64 },
  { id: 'nyc', city: 'New York', country: 'USA', image: u('photo-1496442226666-8d4d0e62e6e9', 900), why: 'The city that never sleeps', bestSeason: 'Sep–Nov', stays: 173 },
  { id: 'barcelona', city: 'Barcelona', country: 'Spain', image: u('photo-1562883676-8c7feb83f09b', 900), why: 'Art, culture & beaches', bestSeason: 'May–Jul', stays: 102 },
  { id: 'goa', city: 'Goa', country: 'India', image: u('photo-1512343879784-a960bf40e7f2', 900), why: 'Golden beaches & nightlife', bestSeason: 'Nov–Feb', stays: 84 },
];

export type Collection = { id: string; title: string; tag: string; count: number; image: string };

export const COLLECTIONS: Collection[] = [
  { id: 'pools', title: "World's most epic pools", tag: "Editor's pick", count: 24, image: u('photo-1571896349842-33c89424de2d', 900) },
  { id: 'gems', title: 'Hidden gems under $100', tag: 'Budget', count: 47, image: u('photo-1505691938895-1758d7feb511', 900) },
  { id: 'eco', title: 'Eco-certified stays', tag: 'Sustainable', count: 18, image: u('photo-1542718610-a1d656d1884c', 900) },
];

export type Reel = { id: string; title: string; location: string; caption: string; thumbnail: string; views: string; author: string };

export const REELS: Reel[] = [
  { id: 'r1', title: 'Malibu Cliff Villa', location: 'Malibu, USA', caption: 'Sunset from the infinity pool 🌅', thumbnail: u('photo-1520250497591-112f2f40a3f4', 500), views: '12K', author: 'community' },
  { id: 'r2', title: 'Miami Beach House', location: 'Miami, USA', caption: 'Morning swim & coffee', thumbnail: u('photo-1535498730771-e735b998cd64', 500), views: '8.4K', author: 'host' },
  { id: 'r3', title: 'Santorini Cave Suite', location: 'Santorini, Greece', caption: 'Blue domes & golden hour', thumbnail: u('photo-1570077188670-e3a8d69ac5ff', 500), views: '22K', author: 'community' },
  { id: 'r4', title: 'NYC Penthouse', location: 'New York, USA', caption: 'Skyline views all night', thumbnail: u('photo-1496442226666-8d4d0e62e6e9', 500), views: '31K', author: 'host' },
  { id: 'r5', title: 'Kyoto Machiya', location: 'Kyoto, Japan', caption: 'Tea in the garden 🍵', thumbnail: u('photo-1545569341-9eb8b30979d9', 500), views: '15K', author: 'community' },
];

// Things to do are pure travel inspiration — place, time, and what it is. No prices, no ratings.
export type ThingToDo = { id: string; title: string; category: string; location: string; duration: string; summary: string; image: string };

export const THINGS_TO_DO: ThingToDo[] = [
  { id: 't1', title: 'Santorini Sunset Sail', category: 'Water Sports', location: 'Santorini, Greece', duration: 'Late afternoon · 4–5 hours', summary: 'Sail the caldera as the famous Santorini sun goes down, with a swim at the volcanic hot springs along the way.', image: u('photo-1559827260-dc66d52bef19', 900) },
  { id: 't2', title: 'Northern Lights Chase', category: 'Adventure', location: 'Reykjavík, Iceland', duration: 'Night (Sep–Mar) · 3–4 hours', summary: 'Head into the dark Icelandic countryside to chase the aurora borealis under vast, starry skies.', image: u('photo-1483347756197-71ef80e95f73', 900) },
  { id: 't3', title: 'Flamenco Show & Tapas', category: 'Entertainment', location: 'Barcelona, Spain', duration: 'Evening · 2–3 hours', summary: 'Passionate live flamenco followed by a self-guided crawl through the tapas bars of the Gothic Quarter.', image: u('photo-1470229722913-7c0e2dbbafd3', 900) },
  { id: 't4', title: 'Cooking Class with a Local Chef', category: 'Food & Drink', location: 'New York, USA', duration: 'Daytime · 3 hours', summary: 'Cook a regional menu from scratch with a local chef, then sit down together to enjoy the feast.', image: u('photo-1556910103-1c02745aae4d', 900) },
];

export type Story = { id: string; category: string; title: string; excerpt: string; author: string; date: string; image: string };

export const STORIES: Story[] = [
  { id: 's1', category: 'Guides', title: '10 hidden gems on the California coast', excerpt: 'From secret coves to cliffside diners, the Pacific Coast Highway hides more than you think.', author: 'Sarah Chen', date: '2 days ago', image: u('photo-1449824913935-59a10b8d2000', 900) },
  { id: 's2', category: 'Itinerary', title: 'A perfect week in the Greek islands', excerpt: 'How to island-hop from Santorini to Naxos without ever feeling rushed.', author: 'James Okoro', date: '5 days ago', image: u('photo-1533105079780-92b9be482077', 900) },
  { id: 's3', category: 'Food', title: 'A first-timer’s food tour of Kyoto', excerpt: 'Where the locals actually eat, from morning markets to midnight ramen.', author: 'Priya Nair', date: '1 week ago', image: u('photo-1545569341-9eb8b30979d9', 900) },
];

export type Offer = { id: string; title: string; description: string; badge: string; urgency: string; image: string };

export const OFFERS: Offer[] = [
  { id: 'first15', title: '15% off your first booking', description: "New to StayOn? Take 15% off your very first stay — anywhere, any host. Applied automatically at checkout.", badge: '15% OFF', urgency: 'Welcome · first booking only', image: u('photo-1522708323590-d24dbb6b0267', 900) },
  { id: 'referral10', title: '10% off with a referral', description: "Joined through a friend's invite link? Your referral booking gets 10% off, automatically.", badge: '10% OFF', urgency: 'Referral booking only', image: u('photo-1556745757-8d76bdb6984b', 900) },
];

// Maps amenity → monochrome icon name (see Icon set in ui.tsx)
export const AMENITY_ICON: Record<string, string> = {
  Beachfront: 'umbrella', Pool: 'waves', 'Plunge pool': 'waves', Wifi: 'wifi', Kitchen: 'utensils', 'Free parking': 'parking',
  'Air conditioning': 'snow', 'Hot tub': 'bath', 'BBQ grill': 'flame', Gym: 'dumbbell', 'Dedicated workspace': 'laptop',
  Elevator: 'elevator', 'City view': 'building', Fireplace: 'flame', 'Ski-in/ski-out': 'snow', 'Mountain view': 'mountain',
  'Pets allowed': 'paw', 'Lake access': 'waves', Deck: 'tree', Balcony: 'tree', Terrace: 'sunset', Garden: 'tree',
  Washer: 'thermo', Heating: 'thermo', 'Caldera view': 'waves', Breakfast: 'coffee', 'Tatami room': 'home', 'Tea set': 'coffee',
  Backyard: 'tree', TV: 'tv',
  // additional amenities to match the user app's full filter set
  Dryer: 'thermo', 'EV charger': 'bolt', Crib: 'home', Waterfront: 'waves', 'Indoor fireplace': 'flame', 'Smoking allowed': 'flame',
  // host-wizard amenity labels
  'Wi-Fi': 'wifi', 'Patio or balcony': 'tree', 'Self check-in': 'key', 'Smart lock': 'lock',
};

/* ───────────────────────── Host data (mirrors host app seed data) ───────────────────────── */
export type HostListing = {
  id: string; title: string; type: string; city: string; country: string; status: 'Published' | 'Draft' | 'Snoozed';
  price: number; weekend: number; cleaning: number; rating: number; reviews: number;
  guests: number; bedrooms: number; beds: number; baths: number; instant: boolean; image: string; occupancy: number;
  // Wizard-captured detail (optional so existing seeds stay valid)
  placeType?: 'entire' | 'room' | 'shared';
  bathroomKind?: 'private' | 'dedicated' | 'shared';
  whoElse?: string[];
  bedroomLock?: boolean;
  address?: string; area?: string; state?: string; zipcode?: string;
  amenities?: string[];
  images?: string[];
  description?: string;
  highlights?: string[];
  discounts?: { newListing?: boolean; lastMinute?: boolean; weekly?: boolean; monthly?: boolean };
  safety?: string[];
};

/* ───────────────────────── Listing-wizard datasets (mirror the host app) ───────────────────────── */
export type WizOption = { id: string; label: string; icon: string };

// Step: "Which of these best describes your place?" — 18 property types
export const HOST_PLACE_TYPES: WizOption[] = [
  { id: 'House', label: 'House', icon: 'home' },
  { id: 'Flat', label: 'Flat / apartment', icon: 'building' },
  { id: 'Barn', label: 'Barn', icon: 'home' },
  { id: 'Bnb', label: 'Bed & breakfast', icon: 'coffee' },
  { id: 'Boat', label: 'Boat', icon: 'waves' },
  { id: 'Cabin', label: 'Cabin', icon: 'tree' },
  { id: 'Camper', label: 'Campervan', icon: 'navigation' },
  { id: 'Castle', label: 'Castle', icon: 'shield' },
  { id: 'Cave', label: 'Cave', icon: 'mountain' },
  { id: 'Container', label: 'Container', icon: 'briefcase' },
  { id: 'Dome', label: 'Dome', icon: 'globe' },
  { id: 'Farm', label: 'Farm stay', icon: 'tree' },
  { id: 'Guesthouse', label: 'Guest house', icon: 'users' },
  { id: 'Hotel', label: 'Hotel', icon: 'building' },
  { id: 'Houseboat', label: 'Houseboat', icon: 'waves' },
  { id: 'Loft', label: 'Loft', icon: 'building' },
  { id: 'Tiny', label: 'Tiny home', icon: 'home' },
  { id: 'Villa', label: 'Villa', icon: 'home' },
];
export const placeTypeLabel = (id: string) => HOST_PLACE_TYPES.find((t) => t.id === id)?.label || id || 'Home';

// Step: "What type of place will guests have?"
export const HOST_PLACE_KINDS: { id: 'entire' | 'room' | 'shared'; label: string; sub: string; icon: string }[] = [
  { id: 'entire', label: 'An entire place', sub: 'Guests have the whole place to themselves.', icon: 'home' },
  { id: 'room', label: 'A room', sub: 'Guests have their own room in a home, plus shared spaces.', icon: 'bed' },
  { id: 'shared', label: 'A shared room', sub: 'Guests sleep in a room or common area that may be shared.', icon: 'users' },
];

// Step: "Who else might be there?"
export const HOST_WHO_ELSE: WizOption[] = [
  { id: 'me', label: 'Me', icon: 'user' },
  { id: 'family', label: 'My family', icon: 'users' },
  { id: 'other_guests', label: 'Other guests', icon: 'users' },
  { id: 'flatmates', label: 'Flatmates', icon: 'home' },
];

// Step: "Tell guests what your place offers" — grouped amenities
export const HOST_AMENITY_GROUPS: { category: string; items: WizOption[] }[] = [
  { category: 'Essentials', items: [
    { id: 'wifi', label: 'Wi-Fi', icon: 'wifi' },
    { id: 'tv', label: 'TV', icon: 'tv' },
    { id: 'kitchen', label: 'Kitchen', icon: 'utensils' },
    { id: 'washer', label: 'Washer', icon: 'thermo' },
    { id: 'ac', label: 'Air conditioning', icon: 'snow' },
    { id: 'heating', label: 'Heating', icon: 'thermo' },
    { id: 'workspace', label: 'Dedicated workspace', icon: 'laptop' },
  ] },
  { category: 'Standout features', items: [
    { id: 'pool', label: 'Pool', icon: 'waves' },
    { id: 'hottub', label: 'Hot tub', icon: 'bath' },
    { id: 'gym', label: 'Gym', icon: 'dumbbell' },
    { id: 'fireplace', label: 'Fireplace', icon: 'flame' },
    { id: 'bbq', label: 'BBQ grill', icon: 'flame' },
    { id: 'balcony', label: 'Patio or balcony', icon: 'tree' },
    { id: 'garden', label: 'Garden', icon: 'tree' },
    { id: 'parking', label: 'Free parking', icon: 'parking' },
    { id: 'ev', label: 'EV charger', icon: 'bolt' },
  ] },
  { category: 'Location', items: [
    { id: 'beachfront', label: 'Beachfront', icon: 'umbrella' },
    { id: 'waterfront', label: 'Waterfront', icon: 'waves' },
    { id: 'mountain', label: 'Mountain view', icon: 'mountain' },
    { id: 'cityview', label: 'City view', icon: 'building' },
  ] },
  { category: 'Services', items: [
    { id: 'breakfast', label: 'Breakfast', icon: 'coffee' },
    { id: 'self_checkin', label: 'Self check-in', icon: 'key' },
    { id: 'smart_lock', label: 'Smart lock', icon: 'lock' },
    { id: 'pets', label: 'Pets allowed', icon: 'paw' },
    { id: 'elevator', label: 'Elevator', icon: 'elevator' },
    { id: 'crib', label: 'Crib', icon: 'home' },
  ] },
];
export const ALL_HOST_AMENITIES: WizOption[] = HOST_AMENITY_GROUPS.flatMap((g) => g.items);

// Step: "Describe your place" — up to 2 highlights
export const HOST_HIGHLIGHTS: WizOption[] = [
  { id: 'charming', label: 'Charming', icon: 'heart' },
  { id: 'hip', label: 'Hip', icon: 'camera' },
  { id: 'stylish', label: 'Stylish', icon: 'gem' },
  { id: 'upscale', label: 'Upscale', icon: 'sparkle' },
  { id: 'central', label: 'Central', icon: 'pin' },
  { id: 'unique', label: 'Unique', icon: 'star' },
];

// Step: "Add discounts"
export const HOST_DISCOUNTS: { id: 'newListing' | 'lastMinute' | 'weekly' | 'monthly'; pct: string; title: string; sub: string }[] = [
  { id: 'newListing', pct: '20%', title: 'New listing promotion', sub: 'Offer 20% off your first 3 bookings.' },
  { id: 'lastMinute', pct: '1%', title: 'Last-minute discount', sub: 'For stays booked 14 days or less before arrival.' },
  { id: 'weekly', pct: '10%', title: 'Weekly discount', sub: 'For stays of 7 nights or more.' },
  { id: 'monthly', pct: '25%', title: 'Monthly discount', sub: 'For stays of 28 nights or more.' },
];

// Step: "Share safety details"
export const HOST_SAFETY: WizOption[] = [
  { id: 'smoke_alarm', label: 'Smoke alarm', icon: 'bell' },
  { id: 'co_alarm', label: 'Carbon monoxide alarm', icon: 'shield' },
  { id: 'first_aid', label: 'First aid kit', icon: 'buoy' },
  { id: 'extinguisher', label: 'Fire extinguisher', icon: 'flame' },
  { id: 'ext_camera', label: 'Exterior security camera', icon: 'eye' },
];

// Stock property photos for the "Add photos" step (web has no device library here)
export const HOST_STOCK_PHOTOS: string[] = [
  'photo-1505693416388-ac5ce068fe85', 'photo-1502672260266-1c1ef2d93688', 'photo-1560448204-e02f11c3d0e2',
  'photo-1522708323590-d24dbb6b0267', 'photo-1556912172-45b7abe8b7e1', 'photo-1484154218962-a197022b5858',
  'photo-1513694203232-719a280e022f', 'photo-1505691938895-1758d7feb511', 'photo-1493809842364-78817add7ffb',
  'photo-1586023492125-27b2c045efd7', 'photo-1567767292278-a4f21aa2d36e', 'photo-1583847268964-b28dc8f51f92',
].map((id) => `https://images.unsplash.com/${id}?w=2000&q=85&auto=format&fit=crop`);

// Render a host's published listing as a full guest-facing Stay using its REAL
// captured data (amenities, beds, description, photos) — not derived placeholders.
export function hostListingToStay(l: HostListing): Stay {
  const amenityLabels = (l.amenities || [])
    .map((id) => ALL_HOST_AMENITIES.find((a) => a.id === id)?.label)
    .filter(Boolean) as string[];
  const images = l.images && l.images.length ? l.images : [l.image];
  const hl = (l.highlights || []).map((id) => HOST_HIGHLIGHTS.find((h) => h.id === id)).filter(Boolean) as WizOption[];
  const highlights = hl.length
    ? hl.map((h) => ({ icon: h.icon, title: h.label, desc: `This place is ${h.label.toLowerCase()}.` }))
    : baseHighlights;
  return {
    id: l.id,
    title: l.title,
    type: l.type,
    city: l.city,
    country: l.country,
    location: [l.area, l.city, l.country].filter(Boolean).join(', ') || `${l.city}, ${l.country}`,
    price: l.price,
    rating: l.rating || 0,
    reviews: l.reviews || 0,
    maxGuests: l.guests,
    bedrooms: l.bedrooms,
    beds: l.beds,
    baths: l.baths,
    images,
    amenities: amenityLabels.length ? amenityLabels : ['Wifi', 'Kitchen'],
    vibes: [],
    lat: 20.5937,
    lng: 78.9629,
    instantBook: l.instant,
    guestFavourite: false,
    description: l.description || 'A premium StayOn home, freshly listed by its host.',
    highlights,
    host: HOSTS[0],
    reviewList: [],
  };
}

export const HOST_LISTINGS: HostListing[] = [
  { id: 'hl1', title: 'Sunlit Loft in the City', type: 'Loft', city: 'Hyderabad', country: 'India', status: 'Published', price: 110, weekend: 135, cleaning: 20, rating: 4.86, reviews: 64, guests: 4, bedrooms: 2, beds: 2, baths: 2, instant: true, image: u('photo-1502672260266-1c1ef2d93688', 900), occupancy: 78 },
  { id: 'hl2', title: 'Palm Garden Villa', type: 'Villa', city: 'Goa', country: 'India', status: 'Published', price: 280, weekend: 340, cleaning: 45, rating: 4.95, reviews: 38, guests: 8, bedrooms: 4, beds: 5, baths: 3, instant: false, image: u('photo-1613490493576-7fde63acd811', 900), occupancy: 64 },
];

export type Reservation = {
  id: string; guest: string; avatar: string; listing: string; status: 'Pending' | 'Confirmed' | 'Completed' | 'Cancelled';
  checkIn: string; checkOut: string; nights: number; guests: number; rate: number; payout: number; instant: boolean; message?: string;
};

const payout = (rate: number, nights: number, cleaning: number) => rate * nights + cleaning;

export const RESERVATIONS: Reservation[] = [
  { id: 'r1', guest: 'Aarav Mehta', avatar: avatar('Aarav Mehta'), listing: 'Sunlit Loft in the City', status: 'Pending', checkIn: 'Jun 20', checkOut: 'Jun 23', nights: 3, guests: 2, rate: 110, payout: payout(110, 3, 20), instant: false, message: 'Hi! Travelling for work — is early check-in possible?' },
  { id: 'r2', guest: 'Sophie Turner', avatar: avatar('Sophie Turner'), listing: 'Palm Garden Villa', status: 'Pending', checkIn: 'Jul 2', checkOut: 'Jul 4', nights: 2, guests: 6, rate: 280, payout: payout(280, 2, 45), instant: false },
  { id: 'r3', guest: "Liam O'Brien", avatar: avatar("Liam OBrien"), listing: 'Sunlit Loft in the City', status: 'Confirmed', checkIn: 'Jun 14', checkOut: 'Jun 18', nights: 4, guests: 3, rate: 110, payout: payout(110, 4, 20), instant: true },
  { id: 'r4', guest: 'Mia Chen', avatar: avatar('Mia Chen'), listing: 'Palm Garden Villa', status: 'Confirmed', checkIn: 'Jun 28', checkOut: 'Jul 3', nights: 5, guests: 8, rate: 280, payout: payout(280, 5, 45), instant: true },
  { id: 'r5', guest: 'Noah Williams', avatar: avatar('Noah Williams'), listing: 'Sunlit Loft in the City', status: 'Completed', checkIn: 'May 10', checkOut: 'May 12', nights: 2, guests: 2, rate: 110, payout: payout(110, 2, 20), instant: true },
  { id: 'r6', guest: 'Emma Davis', avatar: avatar('Emma Davis'), listing: 'Palm Garden Villa', status: 'Completed', checkIn: 'Apr 22', checkOut: 'Apr 25', nights: 3, guests: 5, rate: 280, payout: payout(280, 3, 45), instant: false },
  { id: 'r7', guest: 'Raj Patel', avatar: avatar('Raj Patel'), listing: 'Sunlit Loft in the City', status: 'Cancelled', checkIn: 'May 30', checkOut: 'Jun 1', nights: 2, guests: 2, rate: 110, payout: 0, instant: true },
];

export const PLACE_TYPES = ['House', 'Apartment', 'Villa', 'Cabin', 'Loft', 'Cottage', 'Bungalow', 'Chalet', 'Penthouse', 'Studio', 'Farmhouse', 'Boat'];
export const HOST_AMENITIES = ['Wifi', 'Kitchen', 'Air conditioning', 'Pool', 'Free parking', 'Dedicated workspace', 'TV', 'Hot tub', 'Beachfront', 'Pets allowed', 'Gym', 'Fireplace'];

/* ───────────────────────── Geo-personalised home content (per country) ───────────────────────── */
export type GeoDest = { city: string; region: string; why: string; img: string };
export type GeoTodo = { title: string; category: string; location: string; duration: string; summary: string; img: string };
export type GeoStory = { category: string; title: string; excerpt: string; author: string; date: string; img: string };
export type CountryContent = { name: string; destinations: GeoDest[]; thingsToDo: GeoTodo[]; stories: GeoStory[] };

export const COUNTRY_CONTENT: Record<string, CountryContent> = {
  IN: {
    name: 'India',
    destinations: [
      { city: 'Agra', region: 'Uttar Pradesh', why: 'Home of the Taj Mahal', img: u('photo-1564507592333-c60657eea523', 900) },
      { city: 'Jaipur', region: 'Rajasthan', why: 'The Pink City — palaces & forts', img: u('photo-1477587458883-47145ed94245', 900) },
      { city: 'Goa', region: 'India', why: 'Golden beaches & nightlife', img: u('photo-1512343879784-a960bf40e7f2', 900) },
      { city: 'Kerala', region: 'Alleppey', why: 'Backwaters & houseboats', img: u('photo-1602216056096-3b40cc0c9944', 900) },
      { city: 'Udaipur', region: 'Rajasthan', why: 'City of lakes & palaces', img: u('photo-1609920658906-8223bd289001', 900) },
    ],
    thingsToDo: [
      { title: 'Sunrise at the Taj Mahal', category: 'Culture', location: 'Agra', duration: 'Dawn · 2–3 hours', summary: 'Watch the marble glow pink to gold as the sun rises over one of the world’s great wonders.', img: u('photo-1564507592333-c60657eea523', 900) },
      { title: 'Kerala backwater houseboat', category: 'Nature', location: 'Alleppey, Kerala', duration: 'Full day', summary: 'Drift through palm-lined canals on a traditional kettuvallam, watching village life glide by.', img: u('photo-1602216056096-3b40cc0c9944', 900) },
      { title: 'Amber Fort & Jaipur bazaars', category: 'Culture', location: 'Jaipur', duration: 'Half day', summary: 'Hilltop ramparts, mirrored halls, and the colour and chaos of the old city’s markets.', img: u('photo-1477587458883-47145ed94245', 900) },
      { title: 'Ganga aarti at the ghats', category: 'Culture', location: 'Varanasi', duration: 'Evening', summary: 'Witness the nightly river worship by lamplight on the steps of the sacred Ganges.', img: u('photo-1561361513-2d000a50f0dc', 900) },
    ],
    stories: [
      { category: 'Itinerary', title: '10 days across royal Rajasthan', excerpt: 'From Jaipur’s forts to Udaipur’s lakes — how to ride the desert state’s grandest circuit.', author: 'Priya Nair', date: '3 days ago', img: u('photo-1609920658906-8223bd289001', 900) },
      { category: 'Food', title: 'A street-food crawl through Old Delhi', excerpt: 'Chaat, parathas and jalebis in the lanes of Chandni Chowk, one bite at a time.', author: 'Arjun Rao', date: '1 week ago', img: u('photo-1556910103-1c02745aae4d', 900) },
      { category: 'Nature', title: 'Chasing the monsoon greens of Kerala', excerpt: 'Tea hills, backwaters and elephants — why the rains are the best time to go south.', author: 'Maya Iyer', date: '2 weeks ago', img: u('photo-1602216056096-3b40cc0c9944', 900) },
    ],
  },
  US: {
    name: 'the USA',
    destinations: [
      { city: 'New York', region: 'New York', why: 'The city that never sleeps', img: u('photo-1496442226666-8d4d0e62e6e9', 900) },
      { city: 'Grand Canyon', region: 'Arizona', why: 'A mile-deep natural wonder', img: u('photo-1474044159687-1ee9f3a51722', 900) },
      { city: 'San Francisco', region: 'California', why: 'Bay views & cable cars', img: u('photo-1501594907352-04cda38ebc29', 900) },
      { city: 'Miami', region: 'Florida', why: 'Beaches & art deco', img: u('photo-1535498730771-e735b998cd64', 900) },
      { city: 'Los Angeles', region: 'California', why: 'Sunshine & city glamour', img: u('photo-1444723121867-7a241cacace9', 900) },
    ],
    thingsToDo: [
      { title: 'Helicopter over the Grand Canyon', category: 'Adventure', location: 'Arizona', duration: '45 min flight', summary: 'Soar above the canyon’s rims and ridges for the view of a lifetime.', img: u('photo-1474044159687-1ee9f3a51722', 900) },
      { title: 'Walk the Golden Gate Bridge', category: 'Sightseeing', location: 'San Francisco', duration: '1–2 hours', summary: 'Cross the icon on foot, with the bay and city skyline on either side.', img: u('photo-1501594907352-04cda38ebc29', 900) },
      { title: 'Times Square & a Broadway show', category: 'Entertainment', location: 'New York', duration: 'Evening', summary: 'Neon lights, big crowds and a world-class show to cap the night.', img: u('photo-1496442226666-8d4d0e62e6e9', 900) },
      { title: 'Sunset at Santa Monica Pier', category: 'Leisure', location: 'Los Angeles', duration: 'Evening', summary: 'Ferris wheel, ocean breeze and the end of Route 66.', img: u('photo-1444723121867-7a241cacace9', 900) },
    ],
    stories: [
      { category: 'Road trip', title: 'Down the Pacific Coast Highway', excerpt: 'Big Sur cliffs, secret coves and clifftop diners on California’s greatest drive.', author: 'Sarah Chen', date: '2 days ago', img: u('photo-1449824913935-59a10b8d2000', 900) },
      { category: 'City', title: '48 hours in New York', excerpt: 'How to do the highlights — and a few hidden gems — in one perfect weekend.', author: 'James Okoro', date: '6 days ago', img: u('photo-1496442226666-8d4d0e62e6e9', 900) },
      { category: 'Nature', title: 'National parks of the American West', excerpt: 'Zion, Yosemite, the Grand Canyon — planning the ultimate parks loop.', author: 'Emma Wilson', date: '2 weeks ago', img: u('photo-1474044159687-1ee9f3a51722', 900) },
    ],
  },
  GB: {
    name: 'the UK',
    destinations: [
      { city: 'London', region: 'England', why: 'Timeless & always buzzing', img: u('photo-1513635269975-59663e0ac1ad', 900) },
      { city: 'Edinburgh', region: 'Scotland', why: 'Castles & cobbled closes', img: u('photo-1506377585622-bedcbb027afc', 900) },
      { city: 'Bath', region: 'England', why: 'Roman baths & Georgian streets', img: u('photo-1599757287374-9c3e9b5c0b0e', 900) },
      { city: 'Lake District', region: 'England', why: 'Fells, lakes & quiet villages', img: u('photo-1465056836041-7f43ac27dcb5', 900) },
      { city: 'York', region: 'England', why: 'Medieval walls & a great minster', img: u('photo-1513635269975-59663e0ac1ad', 900) },
    ],
    thingsToDo: [
      { title: 'Tower of London & Crown Jewels', category: 'Culture', location: 'London', duration: 'Half day', summary: 'A thousand years of history — and the dazzling Crown Jewels — by the Thames.', img: u('photo-1513635269975-59663e0ac1ad', 900) },
      { title: 'Edinburgh Castle & the Royal Mile', category: 'Culture', location: 'Edinburgh', duration: 'Half day', summary: 'Walk the historic spine of the old town up to the castle on its volcanic rock.', img: u('photo-1506377585622-bedcbb027afc', 900) },
      { title: 'Stonehenge day trip', category: 'Sightseeing', location: 'Wiltshire', duration: 'Full day', summary: 'Stand before the ancient stone circle that has puzzled the world for millennia.', img: u('photo-1599833975787-5c143f373c30', 900) },
      { title: 'Hike the Lake District fells', category: 'Adventure', location: 'Cumbria', duration: 'Full day', summary: 'Ridge walks and shimmering lakes in England’s most beautiful national park.', img: u('photo-1465056836041-7f43ac27dcb5', 900) },
    ],
    stories: [
      { category: 'City', title: 'A weekend in Edinburgh', excerpt: 'Closes, castles and cosy pubs — the perfect two days in Scotland’s capital.', author: 'James Okoro', date: '4 days ago', img: u('photo-1506377585622-bedcbb027afc', 900) },
      { category: 'Food', title: 'Afternoon tea, done right', excerpt: 'Where to find the best scones, sandwiches and a proper pot of tea in London.', author: 'Olivia Rossi', date: '1 week ago', img: u('photo-1556910103-1c02745aae4d', 900) },
      { category: 'Nature', title: 'Walking the Lake District', excerpt: 'A first-timer’s guide to the fells, from gentle strolls to Scafell Pike.', author: 'Lucas Müller', date: '2 weeks ago', img: u('photo-1465056836041-7f43ac27dcb5', 900) },
    ],
  },
  AE: {
    name: 'the UAE',
    destinations: [
      { city: 'Dubai', region: 'UAE', why: 'Skyline, souks & superlatives', img: u('photo-1512453979798-5ea266f8880c', 900) },
      { city: 'Abu Dhabi', region: 'UAE', why: 'Grand mosque & island culture', img: u('photo-1512632578888-169bbbc64f33', 900) },
      { city: 'Sharjah', region: 'UAE', why: 'Heritage & arts capital', img: u('photo-1518684079-3c830dcef090', 900) },
      { city: 'Ras Al Khaimah', region: 'UAE', why: 'Mountains & desert adventure', img: u('photo-1547234935-80c7145ec969', 900) },
      { city: 'Al Ain', region: 'UAE', why: 'Oases & the garden city', img: u('photo-1518684079-3c830dcef090', 900) },
    ],
    thingsToDo: [
      { title: 'Up the Burj Khalifa at sunset', category: 'Sightseeing', location: 'Dubai', duration: 'Evening', summary: 'Ride to the top of the world’s tallest building as the city lights flicker on.', img: u('photo-1512453979798-5ea266f8880c', 900) },
      { title: 'Desert safari & dune drive', category: 'Adventure', location: 'Dubai', duration: 'Afternoon–evening', summary: 'Dune-bash across the sands, then dinner under the stars at a desert camp.', img: u('photo-1547234935-80c7145ec969', 900) },
      { title: 'Sheikh Zayed Grand Mosque', category: 'Culture', location: 'Abu Dhabi', duration: '2–3 hours', summary: 'Gleaming white marble and the world’s largest hand-knotted carpet.', img: u('photo-1512632578888-169bbbc64f33', 900) },
      { title: 'Abra ride & the old souks', category: 'Culture', location: 'Dubai Creek', duration: '2 hours', summary: 'Cross the creek on a wooden abra to the spice and gold souks of old Dubai.', img: u('photo-1518684079-3c830dcef090', 900) },
    ],
    stories: [
      { category: 'City', title: 'Dubai in three days', excerpt: 'Skyline to souk — how to balance the futuristic and the traditional.', author: 'Aisha Khan', date: '3 days ago', img: u('photo-1512453979798-5ea266f8880c', 900) },
      { category: 'Culture', title: 'Beyond the skyline: Emirati heritage', excerpt: 'Wind-tower houses, pearl-diving history and the quiet side of the Emirates.', author: 'Omar Saeed', date: '1 week ago', img: u('photo-1518684079-3c830dcef090', 900) },
      { category: 'Adventure', title: 'A night in the Arabian desert', excerpt: 'Falconry, dunes and a sky full of stars an hour from the city.', author: 'Diego Torres', date: '2 weeks ago', img: u('photo-1547234935-80c7145ec969', 900) },
    ],
  },
  FR: {
    name: 'France',
    destinations: [
      { city: 'Paris', region: 'Île-de-France', why: 'The city of light', img: u('photo-1502602898657-3e91760cbb34', 900) },
      { city: 'Nice', region: 'Côte d’Azur', why: 'Riviera beaches & promenades', img: u('photo-1491166617655-0723a0999cfc', 900) },
      { city: 'Provence', region: 'France', why: 'Lavender fields & hilltop towns', img: u('photo-1499678329028-101435549a4e', 900) },
      { city: 'Bordeaux', region: 'France', why: 'World-famous vineyards', img: u('photo-1506377585622-bedcbb027afc', 900) },
      { city: 'Mont-Saint-Michel', region: 'Normandy', why: 'An abbey rising from the sea', img: u('photo-1467269204594-9661b134dd2b', 900) },
    ],
    thingsToDo: [
      { title: 'Skip-the-line up the Eiffel Tower', category: 'Sightseeing', location: 'Paris', duration: '2 hours', summary: 'Ride to the summit for the definitive view over the rooftops of Paris.', img: u('photo-1502602898657-3e91760cbb34', 900) },
      { title: 'Louvre highlights tour', category: 'Culture', location: 'Paris', duration: 'Half day', summary: 'From the Mona Lisa to the Venus de Milo, the world’s greatest museum.', img: u('photo-1567942712661-82b9b407abbf', 900) },
      { title: 'Wine tasting in Bordeaux', category: 'Food & Drink', location: 'Bordeaux', duration: 'Full day', summary: 'Tour the châteaux and taste the reds that made the region legendary.', img: u('photo-1506377585622-bedcbb027afc', 900) },
      { title: 'Lavender fields of Provence', category: 'Nature', location: 'Valensole', duration: 'Full day', summary: 'Endless purple rows and golden light — summer in the south of France.', img: u('photo-1499678329028-101435549a4e', 900) },
    ],
    stories: [
      { category: 'City', title: 'A perfect day in Paris', excerpt: 'Croissants, the Seine and a sunset from Montmartre — the essential itinerary.', author: 'Olivia Rossi', date: '2 days ago', img: u('photo-1502602898657-3e91760cbb34', 900) },
      { category: 'Itinerary', title: 'The French Riviera by train', excerpt: 'Nice to Menton, hopping the coastal towns of the Côte d’Azur.', author: 'Marcus Lee', date: '1 week ago', img: u('photo-1491166617655-0723a0999cfc', 900) },
      { category: 'Culture', title: 'Châteaux of the Loire Valley', excerpt: 'Fairy-tale castles and vineyards, a short ride from Paris.', author: 'Lucas Müller', date: '2 weeks ago', img: u('photo-1467269204594-9661b134dd2b', 900) },
    ],
  },
  JP: {
    name: 'Japan',
    destinations: [
      { city: 'Tokyo', region: 'Japan', why: 'Neon, tradition & endless food', img: u('photo-1540959733332-eab4deabeeaf', 900) },
      { city: 'Kyoto', region: 'Japan', why: 'Temples, gardens & geisha', img: u('photo-1545569341-9eb8b30979d9', 900) },
      { city: 'Mount Fuji', region: 'Hakone', why: 'Japan’s sacred peak', img: u('photo-1490806843957-31f4c9a91c65', 900) },
      { city: 'Osaka', region: 'Japan', why: 'Street food & big nights out', img: u('photo-1590559899731-a382839e5549', 900) },
      { city: 'Hiroshima', region: 'Japan', why: 'Peace, history & island shrines', img: u('photo-1493976040374-85c8e12f0c0e', 900) },
    ],
    thingsToDo: [
      { title: 'Senso-ji temple & Asakusa', category: 'Culture', location: 'Tokyo', duration: 'Half day', summary: 'Tokyo’s oldest temple, a giant lantern and the old-town lanes around it.', img: u('photo-1540959733332-eab4deabeeaf', 900) },
      { title: 'Fushimi Inari’s torii gates', category: 'Culture', location: 'Kyoto', duration: '2–3 hours', summary: 'Climb the hillside trail beneath thousands of vermilion shrine gates.', img: u('photo-1493976040374-85c8e12f0c0e', 900) },
      { title: 'Street food at Dotonbori', category: 'Food & Drink', location: 'Osaka', duration: 'Evening', summary: 'Takoyaki, okonomiyaki and neon reflections on the canal.', img: u('photo-1590559899731-a382839e5549', 900) },
      { title: 'Day trip to Mount Fuji', category: 'Nature', location: 'Hakone', duration: 'Full day', summary: 'Lake views, hot springs and the perfect cone of Japan’s most famous mountain.', img: u('photo-1490806843957-31f4c9a91c65', 900) },
    ],
    stories: [
      { category: 'Seasonal', title: 'Cherry blossoms in Kyoto', excerpt: 'Where and when to catch the sakura at their fleeting, beautiful peak.', author: 'Maya Iyer', date: '3 days ago', img: u('photo-1545569341-9eb8b30979d9', 900) },
      { category: 'City', title: 'Tokyo after dark', excerpt: 'Izakaya alleys, skyline bars and the city that truly comes alive at night.', author: 'Marcus Lee', date: '1 week ago', img: u('photo-1540959733332-eab4deabeeaf', 900) },
      { category: 'Guide', title: 'Riding the Shinkansen', excerpt: 'How to make the most of the rail pass and see Japan at 300 km/h.', author: 'Sarah Chen', date: '2 weeks ago', img: u('photo-1490806843957-31f4c9a91c65', 900) },
    ],
  },
  SG: {
    name: 'Singapore',
    destinations: [
      { city: 'Marina Bay', region: 'Singapore', why: 'Iconic skyline & light shows', img: u('photo-1525625293386-3f8f99389edd', 900) },
      { city: 'Gardens by the Bay', region: 'Singapore', why: 'Supertrees & glass domes', img: u('photo-1559681113-3a3c0b6e0f0e', 900) },
      { city: 'Sentosa', region: 'Singapore', why: 'Beaches & theme parks', img: u('photo-1565967511849-76a60a516170', 900) },
      { city: 'Chinatown', region: 'Singapore', why: 'Temples, hawkers & heritage', img: u('photo-1533628635777-112b2239b1c7', 900) },
      { city: 'Little India', region: 'Singapore', why: 'Colour, spice & street art', img: u('photo-1533628635777-112b2239b1c7', 900) },
    ],
    thingsToDo: [
      { title: 'Gardens by the Bay light show', category: 'Sightseeing', location: 'Marina Bay', duration: 'Evening', summary: 'The Supertree Grove lights up nightly in a free, dazzling display.', img: u('photo-1559681113-3a3c0b6e0f0e', 900) },
      { title: 'Hawker-centre food crawl', category: 'Food & Drink', location: 'Chinatown', duration: '2–3 hours', summary: 'Chicken rice, laksa and chilli crab at the city’s legendary food courts.', img: u('photo-1533628635777-112b2239b1c7', 900) },
      { title: 'Marina Bay Sands SkyPark', category: 'Sightseeing', location: 'Marina Bay', duration: '1–2 hours', summary: 'The view from the top of the city’s most famous rooftop.', img: u('photo-1525625293386-3f8f99389edd', 900) },
      { title: 'A day on Sentosa', category: 'Leisure', location: 'Sentosa', duration: 'Full day', summary: 'Beaches, cable cars and theme-park thrills on the resort island.', img: u('photo-1565967511849-76a60a516170', 900) },
    ],
    stories: [
      { category: 'Food', title: 'Eating your way through Singapore', excerpt: 'A hawker-stall guide to the dishes you can’t leave without trying.', author: 'Priya Nair', date: '4 days ago', img: u('photo-1533628635777-112b2239b1c7', 900) },
      { category: 'City', title: '24 hours in the Lion City', excerpt: 'Gardens, skyline and street food packed into one perfect day.', author: 'James Okoro', date: '1 week ago', img: u('photo-1525625293386-3f8f99389edd', 900) },
      { category: 'Family', title: 'Singapore with kids', excerpt: 'Sentosa, the zoo and Gardens by the Bay — the family-friendly highlights.', author: 'Emma Wilson', date: '2 weeks ago', img: u('photo-1565967511849-76a60a516170', 900) },
    ],
  },
  global: {
    name: 'the world',
    destinations: [
      { city: 'Santorini', region: 'Greece', why: 'Sunsets & blue domes', img: u('photo-1570077188670-e3a8d69ac5ff', 900) },
      { city: 'Bali', region: 'Indonesia', why: 'Rice terraces & beach clubs', img: u('photo-1537953773345-d172ccf13cf1', 900) },
      { city: 'Rome', region: 'Italy', why: 'Ancient ruins & dolce vita', img: u('photo-1552832230-c0197dd311b5', 900) },
      { city: 'Barcelona', region: 'Spain', why: 'Gaudí, tapas & beaches', img: u('photo-1562883676-8c7feb83f09b', 900) },
      { city: 'Dubai', region: 'UAE', why: 'Skyline & desert', img: u('photo-1512453979798-5ea266f8880c', 900) },
    ],
    thingsToDo: [
      { title: 'Santorini sunset sail', category: 'Water Sports', location: 'Santorini, Greece', duration: 'Late afternoon · 4–5 hrs', summary: 'Sail the caldera as the famous Santorini sun goes down.', img: u('photo-1559827260-dc66d52bef19', 900) },
      { title: 'Colosseum & ancient Rome', category: 'Culture', location: 'Rome, Italy', duration: 'Half day', summary: 'Step into the arena and the forum at the heart of the ancient world.', img: u('photo-1552832230-c0197dd311b5', 900) },
      { title: 'Sagrada Família', category: 'Culture', location: 'Barcelona, Spain', duration: '2 hours', summary: 'Gaudí’s soaring, still-unfinished masterpiece of a basilica.', img: u('photo-1562883676-8c7feb83f09b', 900) },
      { title: 'Bali rice-terrace trek', category: 'Nature', location: 'Ubud, Bali', duration: 'Half day', summary: 'Emerald paddies, jungle temples and a taste of island life.', img: u('photo-1537953773345-d172ccf13cf1', 900) },
    ],
    stories: [
      { category: 'Itinerary', title: 'Island-hopping the Greek isles', excerpt: 'From Santorini to Naxos without ever feeling rushed.', author: 'James Okoro', date: '5 days ago', img: u('photo-1533105079780-92b9be482077', 900) },
      { category: 'City', title: 'A first-timer’s Rome', excerpt: 'How to see the icons and still find time for gelato and people-watching.', author: 'Olivia Rossi', date: '1 week ago', img: u('photo-1552832230-c0197dd311b5', 900) },
      { category: 'Budget', title: 'Southeast Asia on a budget', excerpt: 'Weeks of beaches, temples and street food without breaking the bank.', author: 'Diego Torres', date: '2 weeks ago', img: u('photo-1537953773345-d172ccf13cf1', 900) },
    ],
  },
};

export function contentFor(country: string): CountryContent {
  return COUNTRY_CONTENT[country] || COUNTRY_CONTENT.global;
}

/* ───────────────────────── Tourist attractions per destination (for the Destination page) ───────────────────────── */
export type Attraction = { name: string; blurb: string };
export const ATTRACTIONS: Record<string, Attraction[]> = {
  // India
  Agra: [{ name: 'Taj Mahal', blurb: 'The marble wonder at sunrise' }, { name: 'Agra Fort', blurb: 'Red-sandstone Mughal fortress' }, { name: 'Fatehpur Sikri', blurb: 'Abandoned imperial city' }, { name: 'Mehtab Bagh', blurb: 'Garden views of the Taj' }, { name: "Itimad-ud-Daulah's Tomb", blurb: 'The "Baby Taj"' }],
  Jaipur: [{ name: 'Amber Fort', blurb: 'Hilltop fort & mirror halls' }, { name: 'Hawa Mahal', blurb: 'The Palace of Winds' }, { name: 'City Palace, Jaipur', blurb: 'Royal courtyards & museums' }, { name: 'Jantar Mantar, Jaipur', blurb: 'Giant astronomical instruments' }, { name: 'Nahargarh Fort', blurb: 'Sunset over the Pink City' }],
  Goa: [{ name: 'Calangute Beach', blurb: 'The "Queen of Beaches"' }, { name: 'Basilica of Bom Jesus', blurb: 'UNESCO baroque church' }, { name: 'Fort Aguada', blurb: 'Clifftop Portuguese fort' }, { name: 'Dudhsagar Falls', blurb: 'Four-tiered jungle waterfall' }, { name: 'Anjuna', blurb: 'Flea market & nightlife' }],
  Kerala: [{ name: 'Alappuzha', blurb: 'Backwater houseboat cruises' }, { name: 'Munnar', blurb: 'Rolling tea-plantation hills' }, { name: 'Fort Kochi', blurb: 'Chinese nets & colonial lanes' }, { name: 'Periyar National Park', blurb: 'Lakeside wildlife reserve' }, { name: 'Varkala Beach', blurb: 'Dramatic cliff-backed coast' }],
  Udaipur: [{ name: 'Lake Pichola', blurb: 'Palaces on a shimmering lake' }, { name: 'City Palace, Udaipur', blurb: 'Sprawling lakeside palace' }, { name: 'Jag Mandir', blurb: 'Island palace retreat' }, { name: 'Sajjangarh Palace', blurb: 'The Monsoon Palace viewpoint' }, { name: 'Jagdish Temple', blurb: 'Ornate 17th-century temple' }],
  // USA
  'New York': [{ name: 'Statue of Liberty', blurb: 'The icon in the harbour' }, { name: 'Central Park', blurb: '843 acres of green' }, { name: 'Times Square', blurb: 'Neon heart of the city' }, { name: 'Empire State Building', blurb: 'Art-deco skyline view' }, { name: 'Brooklyn Bridge', blurb: 'Walk across the East River' }],
  'Grand Canyon': [{ name: 'Grand Canyon South Rim', blurb: 'The classic canyon overlook' }, { name: 'Grand Canyon Skywalk', blurb: 'Glass bridge over the void' }, { name: 'Bright Angel Trail', blurb: 'Descend into the canyon' }, { name: 'Desert View Watchtower', blurb: 'Historic stone lookout' }],
  'San Francisco': [{ name: 'Golden Gate Bridge', blurb: 'The world-famous span' }, { name: 'Alcatraz Island', blurb: 'The legendary island prison' }, { name: "Fisherman's Wharf", blurb: 'Sea lions & seafood' }, { name: 'Lombard Street', blurb: 'The crookedest street' }],
  Miami: [{ name: 'South Beach', blurb: 'Sand, surf & people-watching' }, { name: 'Art Deco Historic District', blurb: 'Pastel 1930s architecture' }, { name: 'Wynwood Walls', blurb: 'Open-air street-art museum' }, { name: 'Vizcaya Museum and Gardens', blurb: 'Italian-style estate' }],
  'Los Angeles': [{ name: 'Hollywood Sign', blurb: 'The hillside icon' }, { name: 'Santa Monica Pier', blurb: 'Ferris wheel by the sea' }, { name: 'Griffith Observatory', blurb: 'City & cosmos views' }, { name: 'Venice Beach', blurb: 'Boardwalk & muscle beach' }],
  // UK
  London: [{ name: 'Tower of London', blurb: 'Crown Jewels & history' }, { name: 'Big Ben', blurb: 'The iconic clock tower' }, { name: 'British Museum', blurb: 'Treasures of the world' }, { name: 'London Eye', blurb: 'Giant riverside wheel' }, { name: 'Buckingham Palace', blurb: 'The royal residence' }],
  Edinburgh: [{ name: 'Edinburgh Castle', blurb: 'Fortress on a volcanic rock' }, { name: 'Royal Mile', blurb: "The old town's spine" }, { name: "Arthur's Seat", blurb: 'Hike to city-wide views' }, { name: 'Palace of Holyroodhouse', blurb: 'The royal Scottish palace' }],
  Bath: [{ name: 'Roman Baths', blurb: 'Ancient thermal spa' }, { name: 'Bath Abbey', blurb: 'Soaring Gothic church' }, { name: 'Royal Crescent', blurb: 'Sweeping Georgian terrace' }, { name: 'Pulteney Bridge', blurb: 'Shops across the river' }],
  'Lake District': [{ name: 'Windermere', blurb: "England's largest lake" }, { name: 'Scafell Pike', blurb: 'The highest English peak' }, { name: 'Keswick', blurb: 'Charming lakeside town' }, { name: 'Derwentwater', blurb: 'Serene island-dotted lake' }],
  York: [{ name: 'York Minster', blurb: 'Magnificent Gothic cathedral' }, { name: 'The Shambles', blurb: 'Medieval cobbled lane' }, { name: 'York city walls', blurb: 'Walk the ancient ramparts' }, { name: 'Jorvik Viking Centre', blurb: 'Step into Viking York' }],
  // UAE
  Dubai: [{ name: 'Burj Khalifa', blurb: "The world's tallest tower" }, { name: 'Dubai Mall', blurb: 'Shopping, aquarium & fountains' }, { name: 'Palm Jumeirah', blurb: 'The palm-shaped island' }, { name: 'Dubai Marina', blurb: 'Glittering waterfront walk' }, { name: 'Dubai Creek', blurb: 'Old souks & abra rides' }],
  'Abu Dhabi': [{ name: 'Sheikh Zayed Mosque', blurb: 'Gleaming white marble' }, { name: 'Louvre Abu Dhabi', blurb: 'Art under a domed sky' }, { name: 'Corniche, Abu Dhabi', blurb: 'Beachfront promenade' }, { name: 'Ferrari World Abu Dhabi', blurb: 'Record-breaking coasters' }],
  Sharjah: [{ name: 'Sharjah Art Museum', blurb: 'The emirate of culture' }, { name: 'Al Noor Mosque', blurb: 'Ottoman-style landmark' }, { name: 'Blue Souk', blurb: 'Traditional covered market' }],
  'Ras Al Khaimah': [{ name: 'Jebel Jais', blurb: "UAE's highest peak & zipline" }, { name: 'Dhayah Fort', blurb: 'Hilltop historic fort' }, { name: 'Al Marjan Island', blurb: 'Man-made beach island' }],
  'Al Ain': [{ name: 'Al Ain Oasis', blurb: 'UNESCO palm oasis' }, { name: 'Jebel Hafeet', blurb: 'Mountain switchback drive' }, { name: 'Al Jahili Fort', blurb: '19th-century mud-brick fort' }],
  // France
  Paris: [{ name: 'Eiffel Tower', blurb: 'The symbol of Paris' }, { name: 'Louvre', blurb: 'The world’s greatest museum' }, { name: 'Notre-Dame de Paris', blurb: 'Gothic masterpiece' }, { name: 'Montmartre', blurb: 'Artists’ hilltop quarter' }, { name: 'Arc de Triomphe', blurb: 'Top of the Champs-Élysées' }],
  Nice: [{ name: 'Promenade des Anglais', blurb: 'Seafront strolling' }, { name: 'Castle Hill, Nice', blurb: 'Panorama over the bay' }, { name: 'Vieux Nice', blurb: 'Old town lanes & markets' }],
  Provence: [{ name: 'Gordes', blurb: 'Hilltop stone village' }, { name: 'Pont du Gard', blurb: 'Roman aqueduct wonder' }, { name: 'Avignon', blurb: 'City of the Popes' }],
  Bordeaux: [{ name: 'Place de la Bourse', blurb: 'Mirror-pool grandeur' }, { name: 'La Cité du Vin', blurb: 'Wine culture museum' }, { name: 'Bordeaux Cathedral', blurb: 'Soaring Gothic spires' }],
  'Mont-Saint-Michel': [{ name: 'Mont-Saint-Michel', blurb: 'Abbey rising from the sea' }, { name: 'Mont Saint-Michel Abbey', blurb: 'Climb to the spire' }],
  // Japan
  Tokyo: [{ name: 'Sensō-ji', blurb: "Tokyo's oldest temple" }, { name: 'Shibuya Crossing', blurb: 'The famous scramble' }, { name: 'Tokyo Tower', blurb: 'Red-and-white icon' }, { name: 'Meiji Shrine', blurb: 'Forest shrine in the city' }, { name: 'Shinjuku Gyoen', blurb: 'Blossoms & gardens' }],
  Kyoto: [{ name: 'Fushimi Inari-taisha', blurb: 'Thousands of torii gates' }, { name: 'Kinkaku-ji', blurb: 'The Golden Pavilion' }, { name: 'Arashiyama Bamboo Grove', blurb: 'Towering green corridor' }, { name: 'Gion', blurb: 'Historic geisha district' }],
  'Mount Fuji': [{ name: 'Lake Kawaguchi', blurb: 'Classic Fuji reflections' }, { name: 'Chureito Pagoda', blurb: 'Pagoda + Fuji view' }, { name: 'Fuji Five Lakes', blurb: 'Lakeside hot springs' }],
  Osaka: [{ name: 'Osaka Castle', blurb: 'Majestic moated castle' }, { name: 'Dōtonbori', blurb: 'Neon food paradise' }, { name: 'Universal Studios Japan', blurb: 'Blockbuster theme park' }],
  Hiroshima: [{ name: 'Hiroshima Peace Memorial', blurb: 'Moving memorial park' }, { name: 'Itsukushima Shrine', blurb: 'The floating torii gate' }, { name: 'Hiroshima Castle', blurb: 'Rebuilt riverside castle' }],
  // Singapore
  'Marina Bay': [{ name: 'Marina Bay Sands', blurb: 'Rooftop infinity pool' }, { name: 'Merlion', blurb: 'The city’s mascot' }, { name: 'ArtScience Museum', blurb: 'Lotus-shaped museum' }],
  'Gardens by the Bay': [{ name: 'Supertree Grove', blurb: 'Nightly light show' }, { name: 'Cloud Forest', blurb: 'Indoor mountain & mist' }, { name: 'Flower Dome', blurb: "World's largest glass greenhouse" }],
  Sentosa: [{ name: 'Universal Studios Singapore', blurb: 'Island theme park' }, { name: 'S.E.A. Aquarium', blurb: 'Vast ocean tanks' }, { name: 'Siloso Beach', blurb: 'Resort-island sands' }],
  Chinatown: [{ name: 'Buddha Tooth Relic Temple', blurb: 'Ornate Buddhist temple' }, { name: 'Maxwell Food Centre', blurb: 'Legendary hawker stalls' }],
  'Little India': [{ name: 'Sri Veeramakaliamman Temple', blurb: 'Colourful Hindu temple' }, { name: 'Tekka Centre', blurb: 'Spice market & food' }],
  // Global
  Santorini: [{ name: 'Oia', blurb: 'Blue domes & sunsets' }, { name: 'Fira', blurb: 'Cliffside capital' }, { name: 'Red Beach', blurb: 'Striking volcanic cove' }, { name: 'Ancient Thera', blurb: 'Ruins on a ridge' }],
  Bali: [{ name: 'Ubud', blurb: 'Rice terraces & temples' }, { name: 'Tanah Lot', blurb: 'Sea temple on a rock' }, { name: 'Uluwatu Temple', blurb: 'Clifftop sunset temple' }, { name: 'Tegallalang Rice Terraces', blurb: 'Emerald paddies' }],
  Rome: [{ name: 'Colosseum', blurb: 'The ancient arena' }, { name: 'Vatican City', blurb: "St Peter's & the museums" }, { name: 'Trevi Fountain', blurb: 'Toss a coin' }, { name: 'Pantheon, Rome', blurb: 'Perfect ancient dome' }],
  Barcelona: [{ name: 'Sagrada Família', blurb: "Gaudí's basilica" }, { name: 'Park Güell', blurb: 'Mosaic-tiled park' }, { name: 'La Rambla', blurb: 'The famous boulevard' }, { name: 'Casa Batlló', blurb: 'Whimsical Gaudí house' }],
};

export function attractionsFor(place: string): Attraction[] {
  return ATTRACTIONS[place] || [];
}
