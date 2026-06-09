// Host listings — the properties a host manages. Persisted to AsyncStorage.
// Mirrors the guest-side Property fields so a published listing maps 1:1 to what
// guests see. USD pricing. Frontend-only for now (swap for an API later).

import AsyncStorage from '@react-native-async-storage/async-storage';
import { convertToUSD } from '../utils/currency';

export type ListingStatus = 'draft' | 'published' | 'snoozed';

/**
 * Derive the canonical USD value of a listing amount that was authored in the
 * listing's own currency. Pass any of the listing's amounts (price, weekend,
 * cleaning). Falls back to treating the amount as USD when no currency is set.
 * Display to a viewer with `format(listingUSD(amount, listing.priceCurrency))`.
 */
export const listingUSD = (amount: number | undefined, priceCurrency?: string): number =>
  convertToUSD(amount || 0, priceCurrency || 'USD');

export interface HouseRules {
  smoking: boolean;
  pets: boolean;
  parties: boolean;
  quietHours: boolean;      // enforce quiet hours
  extraGuests: boolean;     // guests beyond the booking allowed
}

export interface HostListing {
  id: string;
  title: string;
  type: string;                 // Entire villa / Apartment / Cabin …
  status: ListingStatus;
  // Location — FIXED once published (street stays private to guests until booking)
  address: string;              // street address
  area?: string;                // locality / neighborhood
  city: string;
  state?: string;
  country: string;
  zipcode?: string;
  latitude?: number;
  longitude?: number;
  // Capacity
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  // Pricing — authored in the host's currency (priceCurrency) as whole numbers.
  // USD is derived live for any other viewer; we never store a USD float, so the
  // host's price stays pinned exactly in their currency. Defaults to USD when
  // priceCurrency is absent (older seeds).
  priceCurrency?: string;       // e.g. "INR" — currency the amounts below are in
  price: number;                // nightly, in priceCurrency
  weekendPrice?: number;        // in priceCurrency
  cleaningFee?: number;         // in priceCurrency
  // Content / media
  images: string[];
  videos: string[];             // property video URLs (shown in guest gallery)
  description?: string;
  amenities: string[];          // ids from the master list
  // Rules & policies (editable anytime)
  houseRules: HouseRules;
  safety: string[];             // ids from SAFETY_OPTIONS
  instantBook: boolean;
  minNights: number;
  checkInTime: string;
  checkOutTime: string;
  cancellationPolicy: 'Flexible' | 'Moderate' | 'Strict';
  // Wizard-captured details
  placeType?: 'entire' | 'room' | 'shared';
  bedroomLock?: boolean;
  bathroomKind?: 'private' | 'dedicated' | 'shared';
  whoElse?: string[];           // me | family | other_guests | flatmates
  highlights?: string[];        // charming | hip | stylish | upscale | central | unique (max 2)
  bookingApproval?: 'approve5' | 'instant';
  discounts?: { newListing?: boolean; lastMinute?: boolean; weekly?: boolean; monthly?: boolean };
  safetyDisclosures?: { camera?: boolean; noise?: boolean; weapons?: boolean };
  // Computed-ish (seeded for demo) — earned, not host-entered
  rating?: number;
  reviewCount?: number;
  createdAt: number;
}

export interface AmenityOption { id: string; label: string; icon: string; category: string; }

// Ordered amenity categories shown to the host (grouped chips in the form).
export const AMENITY_CATEGORY_ORDER = [
  'Essentials', 'Kitchen & dining', 'Bathroom', 'Bedroom & laundry', 'Entertainment',
  'Heating & cooling', 'Internet & workspace', 'Outdoor', 'Parking & facilities',
  'Family', 'Services', 'Location', 'Accessibility',
];

// Comprehensive list of amenities a property can offer. The host ticks what applies.
export const AMENITY_OPTIONS: AmenityOption[] = [
  // Essentials
  { id: 'wifi', label: 'Wi‑Fi', icon: 'wifi', category: 'Essentials' },
  { id: 'tv', label: 'TV', icon: 'tv', category: 'Essentials' },
  { id: 'hot_water', label: 'Hot water', icon: 'water', category: 'Essentials' },
  { id: 'hair_dryer', label: 'Hair dryer', icon: 'sparkles', category: 'Essentials' },
  { id: 'iron', label: 'Iron', icon: 'shirt', category: 'Essentials' },
  { id: 'hangers', label: 'Hangers', icon: 'shirt-outline', category: 'Essentials' },
  { id: 'bed_linens', label: 'Bed linens', icon: 'bed', category: 'Essentials' },
  { id: 'extra_blankets', label: 'Extra pillows & blankets', icon: 'bed-outline', category: 'Essentials' },
  { id: 'cleaning_products', label: 'Cleaning products', icon: 'sparkles-outline', category: 'Essentials' },

  // Kitchen & dining
  { id: 'kitchen', label: 'Kitchen', icon: 'restaurant', category: 'Kitchen & dining' },
  { id: 'refrigerator', label: 'Refrigerator', icon: 'cube', category: 'Kitchen & dining' },
  { id: 'microwave', label: 'Microwave', icon: 'cube-outline', category: 'Kitchen & dining' },
  { id: 'stove', label: 'Stove', icon: 'flame', category: 'Kitchen & dining' },
  { id: 'oven', label: 'Oven', icon: 'flame-outline', category: 'Kitchen & dining' },
  { id: 'dishwasher', label: 'Dishwasher', icon: 'water-outline', category: 'Kitchen & dining' },
  { id: 'cooking_basics', label: 'Cooking basics', icon: 'fast-food', category: 'Kitchen & dining' },
  { id: 'dishes', label: 'Dishes & silverware', icon: 'restaurant-outline', category: 'Kitchen & dining' },
  { id: 'coffee_maker', label: 'Coffee maker', icon: 'cafe', category: 'Kitchen & dining' },
  { id: 'kettle', label: 'Kettle', icon: 'cafe-outline', category: 'Kitchen & dining' },
  { id: 'toaster', label: 'Toaster', icon: 'cube-outline', category: 'Kitchen & dining' },
  { id: 'dining_table', label: 'Dining table', icon: 'restaurant-outline', category: 'Kitchen & dining' },
  { id: 'freezer', label: 'Freezer', icon: 'snow', category: 'Kitchen & dining' },
  { id: 'wine_glasses', label: 'Wine glasses', icon: 'wine', category: 'Kitchen & dining' },

  // Bathroom
  { id: 'bathtub', label: 'Bathtub', icon: 'water', category: 'Bathroom' },
  { id: 'shampoo', label: 'Shampoo', icon: 'flask', category: 'Bathroom' },
  { id: 'body_soap', label: 'Body soap', icon: 'flask-outline', category: 'Bathroom' },
  { id: 'shower_gel', label: 'Shower gel', icon: 'water-outline', category: 'Bathroom' },

  // Bedroom & laundry
  { id: 'washer', label: 'Washer', icon: 'shirt', category: 'Bedroom & laundry' },
  { id: 'dryer', label: 'Dryer', icon: 'shirt-outline', category: 'Bedroom & laundry' },
  { id: 'drying_rack', label: 'Drying rack', icon: 'grid', category: 'Bedroom & laundry' },
  { id: 'clothing_storage', label: 'Clothing storage', icon: 'file-tray-stacked', category: 'Bedroom & laundry' },

  // Entertainment
  { id: 'sound_system', label: 'Sound system', icon: 'volume-high', category: 'Entertainment' },
  { id: 'streaming', label: 'Streaming services', icon: 'play-circle', category: 'Entertainment' },
  { id: 'game_console', label: 'Game console', icon: 'game-controller', category: 'Entertainment' },
  { id: 'books', label: 'Books & reading', icon: 'book', category: 'Entertainment' },
  { id: 'board_games', label: 'Board games', icon: 'dice', category: 'Entertainment' },

  // Heating & cooling
  { id: 'ac', label: 'Air conditioning', icon: 'snow', category: 'Heating & cooling' },
  { id: 'heating', label: 'Heating', icon: 'flame', category: 'Heating & cooling' },
  { id: 'ceiling_fan', label: 'Ceiling fan', icon: 'aperture', category: 'Heating & cooling' },
  { id: 'fireplace', label: 'Fireplace', icon: 'bonfire', category: 'Heating & cooling' },

  // Internet & workspace
  { id: 'workspace', label: 'Dedicated workspace', icon: 'laptop', category: 'Internet & workspace' },
  { id: 'ethernet', label: 'Ethernet connection', icon: 'git-network', category: 'Internet & workspace' },

  // Outdoor
  { id: 'pool', label: 'Pool', icon: 'water', category: 'Outdoor' },
  { id: 'hottub', label: 'Hot tub', icon: 'thermometer', category: 'Outdoor' },
  { id: 'patio', label: 'Patio or balcony', icon: 'sunny', category: 'Outdoor' },
  { id: 'backyard', label: 'Backyard', icon: 'leaf', category: 'Outdoor' },
  { id: 'outdoor_furniture', label: 'Outdoor furniture', icon: 'sunny-outline', category: 'Outdoor' },
  { id: 'outdoor_dining', label: 'Outdoor dining', icon: 'restaurant-outline', category: 'Outdoor' },
  { id: 'bbq', label: 'BBQ grill', icon: 'flame-outline', category: 'Outdoor' },
  { id: 'firepit', label: 'Fire pit', icon: 'bonfire-outline', category: 'Outdoor' },
  { id: 'garden', label: 'Garden', icon: 'flower', category: 'Outdoor' },
  { id: 'hammock', label: 'Hammock', icon: 'leaf-outline', category: 'Outdoor' },

  // Parking & facilities
  { id: 'parking', label: 'Free parking', icon: 'car', category: 'Parking & facilities' },
  { id: 'paid_parking', label: 'Paid parking', icon: 'car-sport', category: 'Parking & facilities' },
  { id: 'ev_charger', label: 'EV charger', icon: 'flash', category: 'Parking & facilities' },
  { id: 'gym', label: 'Gym', icon: 'barbell', category: 'Parking & facilities' },
  { id: 'elevator', label: 'Elevator', icon: 'swap-vertical', category: 'Parking & facilities' },

  // Family
  { id: 'crib', label: 'Crib', icon: 'bed', category: 'Family' },
  { id: 'high_chair', label: 'High chair', icon: 'restaurant-outline', category: 'Family' },
  { id: 'baby_gates', label: 'Baby safety gates', icon: 'shield', category: 'Family' },
  { id: 'kids_toys', label: "Children's toys", icon: 'happy', category: 'Family' },

  // Services
  { id: 'breakfast', label: 'Breakfast', icon: 'cafe', category: 'Services' },
  { id: 'self_checkin', label: 'Self check‑in', icon: 'key', category: 'Services' },
  { id: 'smart_lock', label: 'Smart lock', icon: 'lock-closed', category: 'Services' },
  { id: 'luggage_dropoff', label: 'Luggage drop‑off', icon: 'briefcase', category: 'Services' },
  { id: 'long_term', label: 'Long‑term stays', icon: 'calendar', category: 'Services' },
  { id: 'pets', label: 'Pets allowed', icon: 'paw', category: 'Services' },

  // Location
  { id: 'beachfront', label: 'Beachfront', icon: 'sunny', category: 'Location' },
  { id: 'waterfront', label: 'Waterfront', icon: 'water-outline', category: 'Location' },
  { id: 'lake_access', label: 'Lake access', icon: 'water', category: 'Location' },
  { id: 'ski_in_out', label: 'Ski‑in/out', icon: 'snow', category: 'Location' },

  // Accessibility
  { id: 'step_free', label: 'Step‑free entrance', icon: 'walk', category: 'Accessibility' },
  { id: 'wide_doorway', label: 'Wide doorway', icon: 'resize', category: 'Accessibility' },
  { id: 'accessible_bathroom', label: 'Accessible bathroom', icon: 'accessibility', category: 'Accessibility' },
  { id: 'grab_rails', label: 'Grab rails', icon: 'hand-left', category: 'Accessibility' },
];

export const SAFETY_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'smoke_alarm', label: 'Smoke alarm', icon: 'alert-circle' },
  { id: 'co_alarm', label: 'Carbon monoxide alarm', icon: 'warning' },
  { id: 'first_aid', label: 'First aid kit', icon: 'medkit' },
  { id: 'extinguisher', label: 'Fire extinguisher', icon: 'flame' },
  { id: 'camera', label: 'Exterior security camera', icon: 'videocam' },
];

export const PROPERTY_TYPES = ['Entire home', 'Apartment', 'Villa', 'Cabin', 'Loft', 'Cottage', 'Studio', 'Room'];

// Rich property-type grid (Airbnb-style) for the wizard.
export const PLACE_TYPES: { id: string; label: string; icon: string }[] = [
  { id: 'House', label: 'House', icon: 'home-outline' },
  { id: 'Flat', label: 'Flat / apartment', icon: 'business-outline' },
  { id: 'Barn', label: 'Barn', icon: 'storefront-outline' },
  { id: 'Bnb', label: 'Bed & breakfast', icon: 'cafe-outline' },
  { id: 'Boat', label: 'Boat', icon: 'boat-outline' },
  { id: 'Cabin', label: 'Cabin', icon: 'leaf-outline' },
  { id: 'Camper', label: 'Campervan', icon: 'bus-outline' },
  { id: 'Castle', label: 'Castle', icon: 'shield-outline' },
  { id: 'Cave', label: 'Cave', icon: 'triangle-outline' },
  { id: 'Container', label: 'Container', icon: 'cube-outline' },
  { id: 'Dome', label: 'Dome', icon: 'ellipse-outline' },
  { id: 'Farm', label: 'Farm', icon: 'flower-outline' },
  { id: 'Guesthouse', label: 'Guest house', icon: 'people-outline' },
  { id: 'Hotel', label: 'Hotel', icon: 'bed-outline' },
  { id: 'Houseboat', label: 'Houseboat', icon: 'boat' },
  { id: 'Loft', label: 'Loft', icon: 'albums-outline' },
  { id: 'Tinyhome', label: 'Tiny home', icon: 'cube' },
  { id: 'Villa', label: 'Villa', icon: 'home' },
];

export const PLACE_KINDS: { id: 'entire' | 'room' | 'shared'; label: string; sub: string; icon: string }[] = [
  { id: 'entire', label: 'An entire place', sub: 'Guests have the whole place to themselves.', icon: 'home' },
  { id: 'room', label: 'A room', sub: 'Guests have their own room in a home, plus shared spaces.', icon: 'bed' },
  { id: 'shared', label: 'A shared room', sub: 'Guests sleep in a room or common area that may be shared.', icon: 'people' },
];

export const WHO_ELSE_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'me', label: 'Me', icon: 'person-outline' },
  { id: 'family', label: 'My family', icon: 'people-outline' },
  { id: 'other_guests', label: 'Other guests', icon: 'people-circle-outline' },
  { id: 'flatmates', label: 'Flatmates', icon: 'people' },
];

export const HIGHLIGHTS: { id: string; label: string; icon: string }[] = [
  { id: 'charming', label: 'Charming', icon: 'heart-outline' },
  { id: 'hip', label: 'Hip', icon: 'camera-outline' },
  { id: 'stylish', label: 'Stylish', icon: 'diamond-outline' },
  { id: 'upscale', label: 'Upscale', icon: 'sparkles-outline' },
  { id: 'central', label: 'Central', icon: 'location-outline' },
  { id: 'unique', label: 'Unique', icon: 'star-outline' },
];

export const DISCOUNT_OPTIONS: { id: 'newListing' | 'lastMinute' | 'weekly' | 'monthly'; pct: string; title: string; sub: string }[] = [
  { id: 'newListing', pct: '20%', title: 'New listing promotion', sub: 'Offer 20% off your first 3 bookings' },
  { id: 'lastMinute', pct: '1%', title: 'Last‑minute discount', sub: 'For stays booked 14 days or less before arrival' },
  { id: 'weekly', pct: '10%', title: 'Weekly discount', sub: 'For stays of 7 nights or more' },
  { id: 'monthly', pct: '25%', title: 'Monthly discount', sub: 'For stays of 28 nights or more' },
];

export const MIN_PHOTOS = 6;

export const DEFAULT_RULES: HouseRules = {
  smoking: false, pets: false, parties: false, quietHours: true, extraGuests: false,
};

const KEY = '@stayon_host_listings';
const img = (id: string) => `https://images.unsplash.com/${id}?w=1200&q=80&auto=format&fit=crop`;

export const SEED_LISTINGS: HostListing[] = [
  {
    id: 'hl1', title: 'Sunlit Loft in the City', type: 'Loft', status: 'published',
    address: '12 Jubilee Hills Rd', area: 'Jubilee Hills', city: 'Hyderabad', state: 'Telangana', country: 'India', zipcode: '500033',
    latitude: 17.4435, longitude: 78.3772,
    guests: 4, bedrooms: 2, beds: 2, bathrooms: 2,
    price: 110, weekendPrice: 135, cleaningFee: 20,
    images: [img('photo-1502672260266-1c1ef2d93688'), img('photo-1493809842364-78817add7ffb')],
    videos: [],
    description: 'A bright, modern loft minutes from the tech district — fast Wi‑Fi and a great workspace.',
    amenities: ['wifi', 'kitchen', 'ac', 'workspace', 'tv', 'parking'],
    houseRules: { smoking: false, pets: true, parties: false, quietHours: true, extraGuests: false },
    safety: ['smoke_alarm', 'first_aid'],
    instantBook: true, minNights: 1, checkInTime: '3:00 PM', checkOutTime: '11:00 AM',
    cancellationPolicy: 'Moderate', rating: 4.86, reviewCount: 64, createdAt: 1,
  },
  {
    id: 'hl2', title: 'Palm Garden Villa', type: 'Villa', status: 'published',
    address: '7 Anjuna Beach Rd', area: 'Anjuna', city: 'Goa', state: 'Goa', country: 'India', zipcode: '403509',
    latitude: 15.5524, longitude: 73.7517,
    guests: 8, bedrooms: 4, beds: 5, bathrooms: 3,
    price: 280, weekendPrice: 340, cleaningFee: 45,
    images: [img('photo-1613490493576-7fde63acd811'), img('photo-1582719478250-c89cae4dc85b')],
    videos: [],
    description: 'Private pool villa surrounded by palms, a short drive from the beach.',
    amenities: ['wifi', 'kitchen', 'pool', 'ac', 'parking', 'beachfront'],
    houseRules: { smoking: false, pets: false, parties: false, quietHours: true, extraGuests: false },
    safety: ['smoke_alarm', 'co_alarm', 'extinguisher'],
    instantBook: false, minNights: 2, checkInTime: '2:00 PM', checkOutTime: '11:00 AM',
    cancellationPolicy: 'Strict', rating: 4.95, reviewCount: 38, createdAt: 2,
  },
];

export async function getListings(): Promise<HostListing[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED_LISTINGS)).catch(() => {});
  return SEED_LISTINGS;
}

async function writeAll(list: HostListing[]) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(list)); } catch {}
}

export async function saveListing(listing: HostListing): Promise<HostListing[]> {
  const all = await getListings();
  const i = all.findIndex((l) => l.id === listing.id);
  const next = i >= 0 ? all.map((l) => (l.id === listing.id ? listing : l)) : [listing, ...all];
  await writeAll(next);
  // Stamp the host's start month on first listing creation (drives the earnings ledger).
  if (i < 0) {
    try {
      const now = new Date();
      const { markHostingStartedIfUnset } = await import('./earnings');
      await markHostingStartedIfUnset(now.getFullYear(), now.getMonth());
    } catch {}
  }
  return next;
}

export async function deleteListing(id: string): Promise<HostListing[]> {
  const all = await getListings();
  const next = all.filter((l) => l.id !== id);
  await writeAll(next);
  return next;
}

export function newDraft(): HostListing {
  return {
    id: `hl_${Date.now()}`, title: '', type: 'Entire home', status: 'draft',
    address: '', area: '', city: '', state: '', country: '', zipcode: '',
    guests: 2, bedrooms: 1, beds: 1, bathrooms: 1,
    priceCurrency: 'USD', price: 100, cleaningFee: 0, images: [], videos: [], amenities: [],
    houseRules: { ...DEFAULT_RULES }, safety: [],
    instantBook: true, minNights: 1, checkInTime: '3:00 PM', checkOutTime: '11:00 AM',
    cancellationPolicy: 'Flexible', createdAt: Date.now(),
    placeType: 'entire', bathroomKind: 'private', whoElse: [], highlights: [],
    bookingApproval: 'approve5',
    discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true },
    safetyDisclosures: { camera: false, noise: false, weapons: false },
  };
}
