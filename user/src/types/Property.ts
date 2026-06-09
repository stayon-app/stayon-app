// Extended Property type for comprehensive property details

export interface PropertyImage {
  uri: string;
  caption?: string;
}

export interface Amenity {
  id: string;
  icon: string;
  label: string;
  category: 'basics' | 'features' | 'safety' | 'location';
  available: boolean;
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  userLocation: string;
  date: string;
  rating: number;
  comment: string;
  categories?: string[]; // e.g., ['hospitality', 'cleanliness']
}

export interface ReviewBreakdown {
  cleanliness: number;
  accuracy: number;
  communication: number;
  location: number;
  checkIn: number;
  value: number;
}

export interface ReviewCategory {
  name: string;
  count: number;
  icon?: string;
}

export interface HostDetails {
  id: string;
  name: string;
  avatar: string;
  isSuperhost: boolean;
  hostingSince: string;
  responseRate: number; // percentage
  responseTime: string; // e.g., "within an hour"
  reviewCount: number;
  rating: number;
  work?: string;
  skill?: string;
  languages?: string[];
  verified: boolean;
}

export interface Location {
  address?: string; // Hidden until booking confirmed
  neighborhood: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  description?: string;
}

export interface HouseRule {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface SafetyFeature {
  id: string;
  icon: string;
  label: string;
  available: boolean;
  notes?: string;
}

export interface KeyFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

export interface Property {
  // Basic Info
  id: string;
  title: string;
  type: string; // e.g., "Entire rental unit"
  
  // Location
  location: Location;
  
  // Pricing
  price: number;
  currency: string;
  priceUnit: string; // e.g., "night"
  cleaningFee?: number;
  serviceFee?: number;
  
  // Rating & Reviews
  rating: number;
  reviewCount: number;
  reviewBreakdown?: ReviewBreakdown;
  reviewCategories?: ReviewCategory[];
  reviews?: Review[];
  
  // Images
  images: PropertyImage[];
  
  // Host
  host: HostDetails;
  
  // Property Details
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  
  // Descriptions
  description: string;
  spaceDescription?: string; // Detailed "About the space"
  guestAccess?: string;
  otherThingsToNote?: string;
  registrationNumber?: string;
  
  // Amenities
  amenities: Amenity[];
  
  // Features
  keyFeatures?: KeyFeature[];
  
  // Rules & Policies
  checkInTime: string;
  checkOutTime: string;
  checkInMethod?: string; // e.g., "Self check-in", "Lockbox"
  houseRules?: HouseRule[];
  cancellationPolicy: string;
  cancellationDetails?: string;
  
  // Safety
  safetyFeatures?: SafetyFeature[];
  
  // Availability
  availableDates?: string[];
  minNights: number;
  maxNights?: number;
  instantBook: boolean;
  
  // Additional Info
  isFavorite?: boolean;
  isGuestFavorite?: boolean;
  badge?: string;
  languages?: string[];
  hasTranslation?: boolean;
}

// ---------------------------------------------------------------------------
// Deterministic PRNG + pool helpers (seeded from property id string)
// ---------------------------------------------------------------------------

// Simple char-code string hash -> 32-bit int
const hashString = (str: string): number => {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
};

// mulberry32 PRNG: returns a function producing floats in [0, 1)
const mulberry32 = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

type Rng = () => number;

// Pick a single element from an array
const pick = <T,>(arr: T[], rng: Rng): T => arr[Math.floor(rng() * arr.length)];

// Pick a random subset of n distinct elements (order preserved, deterministic shuffle)
const pickSome = <T,>(arr: T[], n: number, rng: Rng): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  const count = Math.max(0, Math.min(n, copy.length));
  return copy.slice(0, count);
};

// Pick an integer in [min, max] inclusive
const pickInt = (min: number, max: number, rng: Rng): number =>
  min + Math.floor(rng() * (max - min + 1));

// Round to 2 decimals
const round2 = (n: number): number => Math.round(n * 100) / 100;

// ---------------------------------------------------------------------------
// POOLS (USA / UK / Europe, USD only)
// ---------------------------------------------------------------------------

interface PlacePool {
  city: string;
  country: string;
  neighborhoods: string[];
  latitude: number;
  longitude: number;
}

const PLACES: PlacePool[] = [
  { city: 'New York', country: 'United States', neighborhoods: ['Midtown', 'SoHo', 'Williamsburg', 'Upper West Side', 'Chelsea'], latitude: 40.758, longitude: -73.985 },
  { city: 'Los Angeles', country: 'United States', neighborhoods: ['Venice Beach', 'Silver Lake', 'Santa Monica', 'Los Feliz', 'Echo Park'], latitude: 34.052, longitude: -118.244 },
  { city: 'Austin', country: 'United States', neighborhoods: ['South Congress', 'East Austin', 'Zilker', 'Hyde Park'], latitude: 30.267, longitude: -97.743 },
  { city: 'Miami', country: 'United States', neighborhoods: ['South Beach', 'Wynwood', 'Coconut Grove', 'Brickell'], latitude: 25.761, longitude: -80.191 },
  { city: 'London', country: 'United Kingdom', neighborhoods: ['Shoreditch', 'Notting Hill', 'Camden', 'Greenwich', 'Soho'], latitude: 51.507, longitude: -0.127 },
  { city: 'Edinburgh', country: 'United Kingdom', neighborhoods: ['Old Town', 'Stockbridge', 'Leith', 'New Town'], latitude: 55.953, longitude: -3.188 },
  { city: 'Paris', country: 'France', neighborhoods: ['Le Marais', 'Montmartre', 'Saint-Germain', 'Bastille', 'Canal Saint-Martin'], latitude: 48.857, longitude: 2.352 },
  { city: 'Barcelona', country: 'Spain', neighborhoods: ['Gothic Quarter', 'Gràcia', 'El Born', 'Eixample'], latitude: 41.385, longitude: 2.173 },
  { city: 'Rome', country: 'Italy', neighborhoods: ['Trastevere', 'Monti', 'Prati', 'Testaccio'], latitude: 41.903, longitude: 12.496 },
  { city: 'Amsterdam', country: 'Netherlands', neighborhoods: ['Jordaan', 'De Pijp', 'Oud-West', 'Canal Belt'], latitude: 52.368, longitude: 4.904 },
  { city: 'Lisbon', country: 'Portugal', neighborhoods: ['Alfama', 'Bairro Alto', 'Príncipe Real', 'Chiado'], latitude: 38.722, longitude: -9.139 },
  { city: 'Berlin', country: 'Germany', neighborhoods: ['Kreuzberg', 'Mitte', 'Prenzlauer Berg', 'Friedrichshain'], latitude: 52.520, longitude: 13.405 },
];

interface HostPool {
  name: string;
  avatar: string;
  bio: string;
}

const HOSTS: HostPool[] = [
  { name: 'Alex Morgan', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&q=80&crop=faces&auto=format', bio: 'Lifelong traveler who loves sharing local gems with guests.' },
  { name: 'Sofia Bennett', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&q=80&crop=faces&auto=format', bio: 'Designer and coffee enthusiast. Happy to recommend my favorite cafés.' },
  { name: 'James Carter', avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&q=80&crop=faces&auto=format', bio: 'Former chef turned host. Ask me for the best dinner spots nearby.' },
  { name: 'Emma Wilson', avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&q=80&crop=faces&auto=format', bio: 'I keep my places spotless and love helping guests feel at home.' },
  { name: "Liam O'Brien", avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&q=80&crop=faces&auto=format', bio: 'Born and raised here. Always reachable for tips and questions.' },
  { name: 'Chloé Dubois', avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&q=80&crop=faces&auto=format', bio: 'Art lover hosting cozy, light-filled spaces for thoughtful guests.' },
  { name: 'Noah Schmidt', avatar: 'https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&q=80&crop=faces&auto=format', bio: 'Architect by day, host by passion. My homes are calm and minimal.' },
  { name: 'Olivia Rossi', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&q=80&crop=faces&auto=format', bio: 'I treat every guest like a friend visiting from out of town.' },
  { name: 'Mateo García', avatar: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&q=80&crop=faces&auto=format', bio: 'Hosting is my way of meeting people from all over the world.' },
  { name: 'Hannah Becker', avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&q=80&crop=faces&auto=format', bio: 'Plant mom and weekend hiker. My place is your quiet escape.' },
  { name: 'Daniel Novak', avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=400&q=80&crop=faces&auto=format', bio: 'Detail-oriented host who loves a smooth, easy check-in.' },
  { name: 'Isabella Conti', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&q=80&crop=faces&auto=format', bio: 'I curate each home with comfort and good taste in mind.' },
];

const RESPONSE_TIMES = ['within an hour', 'within a few hours', 'within a day'];
const LANGUAGE_SETS = [
  ['English'],
  ['English', 'Spanish'],
  ['English', 'French'],
  ['English', 'German'],
  ['English', 'Italian'],
  ['English', 'Spanish', 'French'],
];

// Description templates. {n}=neighborhood, {c}=city, {t}=title
const DESCRIPTION_TEMPLATES: string[] = [
  'Soak up the sun in this bright, modern retreat in {n}. Floor-to-ceiling windows fill the space with light, and you are just minutes from the best of {c}. Perfect for a relaxed city escape.',
  'Welcome to {t}, a stylish home tucked into the heart of {n}. Sip your morning coffee on the sofa, then step out to explore everything {c} has to offer right at your doorstep.',
  'Unwind in this cozy cabin-inspired space in {n}. Warm wood tones, a crackling fireplace, and soft lighting make it an ideal hideaway after a day exploring {c}.',
  'This sleek city loft in {n} blends industrial charm with everyday comfort. High ceilings, exposed brick, and a fully equipped kitchen make it a memorable base in {c}.',
  'Escape to this peaceful poolside villa near {n}. Lounge by the water, fire up the BBQ, and enjoy effortless indoor-outdoor living, just a short drive from central {c}.',
  'A calm, minimalist apartment in {n} designed for slow mornings and easy evenings. Thoughtful touches throughout and a prime {c} location make every stay feel special.',
  'Charming and full of character, this {n} home is steps from cafés, shops, and local life. Whether you are here for work or play, {c} is yours to discover.',
  'Light, airy, and effortlessly comfortable, this {n} space is the perfect place to recharge. Wake up rested and spend your days wandering the streets of {c}.',
  'Stay in style at {t} in vibrant {n}. With a dedicated workspace, fast WiFi, and a comfy bed, it suits remote workers and weekend explorers in {c} alike.',
  'A warm, welcoming home in the lively {n} district. Cook a meal in the open kitchen, relax in the living room, and step out into the energy of {c} whenever you like.',
];

interface PropertyTypePool {
  label: string;
  titleHint: string;
}

const PROPERTY_TYPES: PropertyTypePool[] = [
  { label: 'Entire rental unit', titleHint: 'Apartment' },
  { label: 'Entire loft', titleHint: 'Loft' },
  { label: 'Entire condo', titleHint: 'Condo' },
  { label: 'Entire cottage', titleHint: 'Cottage' },
  { label: 'Entire villa', titleHint: 'Villa' },
  { label: 'Entire townhouse', titleHint: 'Townhouse' },
  { label: 'Entire cabin', titleHint: 'Cabin' },
  { label: 'Entire studio', titleHint: 'Studio' },
];

// Master amenity list to pick a subset from
const MASTER_AMENITIES: Amenity[] = [
  { id: 'wifi', icon: 'wifi', label: 'Wifi', category: 'basics', available: true },
  { id: 'kitchen', icon: 'restaurant', label: 'Kitchen', category: 'basics', available: true },
  { id: 'pool', icon: 'water-outline', label: 'Pool', category: 'features', available: true },
  { id: 'hottub', icon: 'water', label: 'Hot tub', category: 'features', available: true },
  { id: 'ac', icon: 'snow', label: 'Air conditioning', category: 'basics', available: true },
  { id: 'heating', icon: 'thermometer', label: 'Heating', category: 'basics', available: true },
  { id: 'washer', icon: 'water', label: 'Washing machine', category: 'basics', available: true },
  { id: 'dryer', icon: 'sunny', label: 'Dryer', category: 'basics', available: true },
  { id: 'parking', icon: 'car', label: 'Free parking on premises', category: 'features', available: true },
  { id: 'evcharger', icon: 'flash', label: 'EV charger', category: 'features', available: true },
  { id: 'gym', icon: 'barbell', label: 'Gym', category: 'features', available: true },
  { id: 'workspace', icon: 'desktop', label: 'Dedicated workspace', category: 'features', available: true },
  { id: 'tv', icon: 'tv', label: 'TV', category: 'basics', available: true },
  { id: 'fireplace', icon: 'flame', label: 'Indoor fireplace', category: 'features', available: true },
  { id: 'bbq', icon: 'flame-outline', label: 'BBQ grill', category: 'features', available: true },
  { id: 'beach', icon: 'sunny-outline', label: 'Beach access', category: 'location', available: true },
  { id: 'pets', icon: 'paw', label: 'Pets allowed', category: 'features', available: true },
  { id: 'selfcheckin', icon: 'key', label: 'Self check-in', category: 'features', available: true },
  { id: 'crib', icon: 'bed', label: 'Crib', category: 'features', available: true },
  { id: 'breakfast', icon: 'cafe', label: 'Breakfast', category: 'features', available: true },
  { id: 'coffee', icon: 'cafe-outline', label: 'Coffee maker', category: 'features', available: true },
  { id: 'hairdryer', icon: 'flash-outline', label: 'Hair dryer', category: 'features', available: true },
  { id: 'smokealarm', icon: 'notifications', label: 'Smoke alarm', category: 'safety', available: true },
  { id: 'firstaid', icon: 'shield-checkmark', label: 'First aid kit', category: 'safety', available: true },
  { id: 'coalarm', icon: 'alert-circle', label: 'Carbon monoxide alarm', category: 'safety', available: true },
  { id: 'extinguisher', icon: 'flame-outline', label: 'Fire extinguisher', category: 'safety', available: true },
];

interface CancellationPool {
  policy: string;
  details: string;
}

const CANCELLATION_POLICIES: CancellationPool[] = [
  { policy: 'Flexible', details: 'Free cancellation up to 24 hours before check-in. Cancel before then for a full refund.' },
  { policy: 'Moderate', details: 'Free cancellation up to 5 days before check-in. After that, the first night is non-refundable.' },
  { policy: 'Strict', details: 'Free cancellation within 48 hours of booking. After that, 50% refund up to one week before check-in.' },
];

const REVIEW_AUTHORS: { name: string; location: string; avatar: string }[] = [
  { name: 'Sarah', location: 'Chicago, United States', avatar: 'https://i.pravatar.cc/150?img=5' },
  { name: 'Tom', location: 'Manchester, United Kingdom', avatar: 'https://i.pravatar.cc/150?img=11' },
  { name: 'Lena', location: 'Munich, Germany', avatar: 'https://i.pravatar.cc/150?img=20' },
  { name: 'Marco', location: 'Milan, Italy', avatar: 'https://i.pravatar.cc/150?img=15' },
  { name: 'Claire', location: 'Lyon, France', avatar: 'https://i.pravatar.cc/150?img=25' },
  { name: 'David', location: 'Seattle, United States', avatar: 'https://i.pravatar.cc/150?img=8' },
  { name: 'Anna', location: 'Rotterdam, Netherlands', avatar: 'https://i.pravatar.cc/150?img=32' },
  { name: 'Pedro', location: 'Porto, Portugal', avatar: 'https://i.pravatar.cc/150?img=18' },
];

const REVIEW_COMMENTS: string[] = [
  'Spotless, comfortable, and exactly as pictured. The host was super responsive and check-in was a breeze.',
  'Great location, walkable to everything. We would happily stay here again on our next trip.',
  'Beautiful space with thoughtful touches. The bed was so comfortable and the kitchen had everything we needed.',
  'Quiet, cozy, and well-equipped. Perfect base for exploring the city. Highly recommend.',
  'The photos do not do it justice. Bright, airy, and immaculately clean throughout our stay.',
  'Wonderful host who gave us excellent local recommendations. The place felt like a home away from home.',
];

const REVIEW_CATEGORY_NAMES = ['Hospitality', 'Cleanliness', 'Location', 'Value', 'Communication', 'Comfort'];

// Helper function to create mock property data
export const createMockProperty = (overrides?: Partial<Property>): Property => {
  // Seed deterministically from the listing id (or title fallback)
  const seedSource = String(overrides?.id ?? overrides?.title ?? '1');
  const rng = mulberry32(hashString(seedSource));

  const place = pick(PLACES, rng);
  const neighborhood = pick(place.neighborhoods, rng);
  const propType = pick(PROPERTY_TYPES, rng);
  const hostPool = pick(HOSTS, rng);
  const isSuperhost = rng() < 0.5;
  const responseRate = pickInt(90, 100, rng);
  const responseTime = pick(RESPONSE_TIMES, rng);
  const yearsHosting = pickInt(1, 9, rng);
  const languages = pick(LANGUAGE_SETS, rng);

  // Counts
  const bedrooms = pickInt(1, 5, rng);
  const beds = bedrooms + pickInt(0, 2, rng);
  const bathrooms = pickInt(1, Math.min(4, bedrooms + 1), rng);
  const maxGuests = beds * 2;

  // Rating & reviews
  const rating = round2(4.6 + rng() * 0.4); // 4.6 - 5.0
  const reviewCount = pickInt(40, 400, rng);

  // Price (vary if not overridden)
  const price = pickInt(90, 520, rng);

  // Description
  const descTemplate = pick(DESCRIPTION_TEMPLATES, rng);
  const titleForDesc = String(overrides?.title ?? `${neighborhood} ${propType.titleHint}`);
  const description = descTemplate
    .replace(/{n}/g, neighborhood)
    .replace(/{c}/g, place.city)
    .replace(/{t}/g, titleForDesc);

  // Amenities subset (always include wifi + kitchen + smoke alarm for realism)
  const amenityCount = pickInt(8, 14, rng);
  const amenities = pickSome(MASTER_AMENITIES, amenityCount, rng);

  // Cancellation
  const cancellation = pick(CANCELLATION_POLICIES, rng);

  // House rules (varied)
  const checkInHour = pick(['2:00 PM', '3:00 PM', '4:00 PM'], rng);
  const checkOutHour = pick(['10:00 AM', '11:00 AM', '12:00 PM'], rng);
  const petsAllowed = amenities.some((a) => a.id === 'pets');
  const partiesAllowed = rng() < 0.15;
  const quietHours = pick(['10 PM to 8 AM', '11 PM to 7 AM', '10 PM to 7 AM'], rng);
  const houseRules: HouseRule[] = [
    { id: '1', icon: 'time', title: `Check-in after ${checkInHour}`, description: 'Flexible check-in available upon request' },
    { id: '2', icon: 'time-outline', title: `Checkout before ${checkOutHour}`, description: 'Late checkout may be available for an additional fee' },
    { id: '3', icon: 'people', title: `${maxGuests} guests maximum`, description: 'Maximum occupancy strictly enforced' },
    { id: '4', icon: 'ban', title: 'No smoking', description: 'Smoking is not allowed anywhere on the property' },
    {
      id: '5',
      icon: 'paw',
      title: petsAllowed ? 'Pets allowed' : 'No pets',
      description: petsAllowed ? 'Well-behaved pets are welcome' : 'Service animals are welcome with prior notice',
    },
    {
      id: '6',
      icon: 'musical-notes-outline',
      title: partiesAllowed ? 'Small gatherings allowed' : 'No parties or events',
      description: `Quiet hours from ${quietHours}`,
    },
  ];

  // Reviews (varied, 2-4)
  const reviewSampleCount = pickInt(2, 4, rng);
  const authors = pickSome(REVIEW_AUTHORS, reviewSampleCount, rng);
  const comments = pickSome(REVIEW_COMMENTS, reviewSampleCount, rng);
  const reviews: Review[] = authors.map((a, i) => ({
    id: String(i + 1),
    userName: a.name,
    userAvatar: a.avatar,
    userLocation: a.location,
    date: pick(['2 weeks ago', '3 weeks ago', '1 month ago', '2 months ago'], rng),
    rating: pickInt(4, 5, rng),
    comment: comments[i] ?? comments[0],
    categories: pickSome(['hospitality', 'cleanliness', 'value', 'location'], 2, rng),
  }));

  // Review categories (varied)
  const catNames = pickSome(REVIEW_CATEGORY_NAMES, 3, rng);
  const reviewCategories: ReviewCategory[] = catNames.map((name) => ({
    name,
    count: pickInt(5, 30, rng),
    icon: '',
  }));

  const defaultProperty: Property = {
    id: seedSource,
    title: `${neighborhood} ${propType.titleHint}`,
    type: `${propType.label} in ${place.city}`,

    location: {
      neighborhood,
      city: place.city,
      country: place.country,
      latitude: round2(place.latitude + (rng() - 0.5) * 0.05),
      longitude: round2(place.longitude + (rng() - 0.5) * 0.05),
      description: `Located in ${neighborhood}, one of the most loved areas of ${place.city}. Easy access to transit, dining, and local attractions.`,
    },

    price,
    currency: '$',
    priceUnit: 'night',
    cleaningFee: pickInt(30, 80, rng),
    serviceFee: pickInt(40, 90, rng),

    rating,
    reviewCount,
    reviewBreakdown: {
      cleanliness: round2(4.6 + rng() * 0.4),
      accuracy: round2(4.6 + rng() * 0.4),
      communication: round2(4.6 + rng() * 0.4),
      location: round2(4.6 + rng() * 0.4),
      checkIn: round2(4.6 + rng() * 0.4),
      value: round2(4.6 + rng() * 0.4),
    },
    reviewCategories,
    reviews,

    images: [
      { uri: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=2000&q=80&auto=format&fit=crop', caption: 'Bedroom with city views' },
      { uri: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=2000&q=80&auto=format&fit=crop', caption: 'Modern living space' },
      { uri: 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?w=2000&q=80&auto=format&fit=crop', caption: 'Fully equipped kitchen' },
      { uri: 'https://images.unsplash.com/photo-1505693314120-0d443867891c?w=2000&q=80&auto=format&fit=crop', caption: 'Comfortable bed with fresh linens' },
      { uri: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=2000&q=80&auto=format&fit=crop', caption: 'Cozy sofa bed' },
      { uri: 'https://images.unsplash.com/photo-1552321554-5fefe8c9ef14?w=2000&q=80&auto=format&fit=crop', caption: 'Work desk with natural light' },
      { uri: 'https://images.unsplash.com/photo-1600566752355-35792bedcfea?w=2000&q=80&auto=format&fit=crop', caption: 'Modern bathroom' },
      { uri: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=2000&q=80&auto=format&fit=crop', caption: 'Dining area' },
      { uri: 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?w=2000&q=80&auto=format&fit=crop', caption: 'Building exterior' },
      { uri: 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?w=2000&q=80&auto=format&fit=crop', caption: 'City views from window' },
      { uri: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=2000&q=80&auto=format&fit=crop', caption: 'Close to metro station' },
      { uri: 'https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=2000&q=80&auto=format&fit=crop', caption: 'Nearby attractions' },
      { uri: 'https://images.unsplash.com/photo-1556228720-195a672e8a03?w=2000&q=80&auto=format&fit=crop', caption: 'Building amenities' },
      { uri: 'https://images.unsplash.com/photo-1527359443443-8426e66f8dc2?w=2000&q=80&auto=format&fit=crop', caption: 'Parking area' },
      { uri: 'https://images.unsplash.com/photo-1574643156929-51fa098b0394?w=2000&q=80&auto=format&fit=crop', caption: 'Smart TV and entertainment' },
      { uri: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=2000&q=80&auto=format&fit=crop', caption: 'Bedroom closet space' },
      { uri: 'https://images.unsplash.com/photo-1600585152220-90363fe7e115?w=2000&q=80&auto=format&fit=crop', caption: 'Towels and toiletries' },
      { uri: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=2000&q=80&auto=format&fit=crop', caption: 'Air conditioning' },
      { uri: 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=2000&q=80&auto=format&fit=crop', caption: 'WiFi and connectivity' },
    ],
    
    host: {
      id: `host_${hashString(seedSource) % 100000}`,
      name: hostPool.name,
      avatar: hostPool.avatar,
      isSuperhost,
      hostingSince: `${yearsHosting} ${yearsHosting === 1 ? 'year' : 'years'}`,
      responseRate,
      responseTime,
      reviewCount: pickInt(20, 350, rng),
      rating: round2(4.6 + rng() * 0.4),
      work: pick(['Designer', 'Architect', 'Chef', 'Photographer', 'Entrepreneur', 'Teacher'], rng),
      skill: pick(['Surfing', 'Baking', 'Pottery', 'Cycling', 'Painting', 'Gardening'], rng),
      languages,
      verified: rng() < 0.85,
    },

    guests: maxGuests,
    bedrooms,
    beds,
    bathrooms,

    description,

    spaceDescription: `${description}\n\nThis ${propType.titleHint.toLowerCase()} comfortably sleeps ${maxGuests} across ${bedrooms} ${bedrooms === 1 ? 'bedroom' : 'bedrooms'} (${beds} ${beds === 1 ? 'bed' : 'beds'}) and ${bathrooms} ${bathrooms === 1 ? 'bathroom' : 'bathrooms'}.\n\nThe space is thoughtfully furnished with everything you need for a relaxed, independent stay. You will find a well-equipped kitchen, fast WiFi, and comfortable bedding throughout.\n\nWhether you are visiting ${place.city} for work or leisure, ${neighborhood} puts you close to the area's best cafés, shops, and transit links.`,

    registrationNumber: `${place.country.slice(0, 2).toUpperCase()}-${hashString(seedSource) % 1000000}`,

    amenities,

    // icon = Ionicons name; rendered inside a soft tinted circle (premium look).
    keyFeatures: [
      {
        id: '1',
        icon: amenities.some((a) => a.id === 'selfcheckin') ? 'KeyRound' : 'Users', // lucide
        title: amenities.some((a) => a.id === 'selfcheckin') ? 'Self check-in' : 'Easy check-in',
        description: amenities.some((a) => a.id === 'selfcheckin')
          ? 'Check yourself in with the smart lock.'
          : 'The host will greet you and hand over the keys.',
      },
      {
        id: '2',
        icon: 'Navigation', // lucide
        title: `Great ${neighborhood} location`,
        description: `Guests love how central this ${propType.titleHint.toLowerCase()} is.`,
      },
      {
        id: '3',
        icon: amenities.some((a) => a.id === 'parking') ? 'SquareParking' : 'Award', // lucide
        title: amenities.some((a) => a.id === 'parking') ? 'Park for free' : 'Guest favorite',
        description: amenities.some((a) => a.id === 'parking')
          ? 'One of the few places in the area with free parking.'
          : 'This home is highly rated by recent guests.',
      },
    ],

    checkInTime: checkInHour,
    checkOutTime: checkOutHour,
    checkInMethod: amenities.some((a) => a.id === 'selfcheckin') ? 'Self check-in with smart lock' : 'Check-in with host',

    houseRules,

    cancellationPolicy: cancellation.policy,
    cancellationDetails: cancellation.details,

    safetyFeatures: [
      { id: '1', icon: 'alert-circle', label: 'Carbon monoxide alarm', available: amenities.some((a) => a.id === 'coalarm'), notes: amenities.some((a) => a.id === 'coalarm') ? undefined : 'Not reported' },
      { id: '2', icon: 'notifications', label: 'Smoke alarm', available: amenities.some((a) => a.id === 'smokealarm'), notes: amenities.some((a) => a.id === 'smokealarm') ? undefined : 'Not reported' },
      { id: '3', icon: 'shield-checkmark', label: 'First aid kit', available: amenities.some((a) => a.id === 'firstaid') },
      { id: '4', icon: 'flame-outline', label: 'Fire extinguisher', available: amenities.some((a) => a.id === 'extinguisher') },
    ],

    minNights: pickInt(1, 3, rng),
    maxNights: pickInt(14, 60, rng),
    instantBook: rng() < 0.5,

    isFavorite: false,
    isGuestFavorite: rng() < 0.5,
    hasTranslation: false,
  };

  return { ...defaultProperty, ...overrides };
};
