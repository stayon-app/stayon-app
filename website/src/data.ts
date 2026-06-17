// StayOn website content — mirrors the user app's real data (src/data/*).
// Stays use USD ($), matching the app. Images are high-quality Unsplash crops.

const u = (id: string, w = 1400) =>
  `https://images.unsplash.com/${id}?w=${w}&q=80&auto=format&fit=crop`;

const avatar = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D9488&color=fff&bold=true`;

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
  responseRate: number;
  responseTime: string;
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
  { name: 'Sarah Chen', avatar: avatar('Sarah Chen'), location: 'San Francisco, US', date: 'May 2026', text: 'Absolutely stunning — the photos do not do it justice. Spotless, and the host thought of every little detail. We did not want to leave.' },
  { name: 'James Okoro', avatar: avatar('James Okoro'), location: 'London, UK', date: 'April 2026', text: 'Incredible location and the views at sunset were unreal. Check-in was seamless with the smart lock. Would book again in a heartbeat.' },
  { name: 'Priya Nair', avatar: avatar('Priya Nair'), location: 'Mumbai, IN', date: 'March 2026', text: 'Perfect for our family trip. Super comfortable beds, a great kitchen, and the host responded within minutes whenever we asked anything.' },
  { name: 'Lucas Müller', avatar: avatar('Lucas Müller'), location: 'Berlin, DE', date: 'February 2026', text: 'A real gem. Quiet, beautifully designed, and walking distance to everything we wanted to see. Highly recommend.' },
  { name: 'Emma Wilson', avatar: avatar('Emma Wilson'), location: 'Sydney, AU', date: 'January 2026', text: 'One of the best stays we have ever had. The space is even more gorgeous in person and the little welcome gift was a lovely touch.' },
  { name: 'Diego Torres', avatar: avatar('Diego Torres'), location: 'Madrid, ES', date: 'December 2025', text: 'Great value for such a premium place. Everything worked, everything was clean, and the host gave brilliant local tips.' },
];

const reviewsFor = (seed: number, count: number): Review[] =>
  Array.from({ length: Math.min(count, REVIEW_POOL.length) }, (_, i) => {
    const r = REVIEW_POOL[(seed + i) % REVIEW_POOL.length];
    return { ...r, rating: 5 - ((seed + i) % 2 === 0 ? 0 : 0) };
  });

const HOSTS: Host[] = [
  { name: 'Olivia', avatar: avatar('Olivia R'), since: 2017, superhost: true, responseRate: 100, responseTime: 'within an hour', bio: 'Designer turned host. I love creating calm, beautiful spaces and sharing my favourite local spots with every guest.' },
  { name: 'Marcus', avatar: avatar('Marcus L'), since: 2019, superhost: true, responseRate: 98, responseTime: 'within a few hours', bio: 'Lifelong traveller, now hosting the kind of stays I always wished I could find on the road.' },
  { name: 'Aisha', avatar: avatar('Aisha K'), since: 2020, superhost: false, responseRate: 95, responseTime: 'within a day', bio: 'I restore old homes and give them a second life. Every detail in my places is chosen with care.' },
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

export const stayById = (id: string) => STAYS.find((s) => s.id === id);

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
};

/* ───────────────────────── Host data (mirrors host app seed data) ───────────────────────── */
export type HostListing = {
  id: string; title: string; type: string; city: string; country: string; status: 'Published' | 'Draft' | 'Snoozed';
  price: number; weekend: number; cleaning: number; rating: number; reviews: number;
  guests: number; bedrooms: number; beds: number; baths: number; instant: boolean; image: string; occupancy: number;
};

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
