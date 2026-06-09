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
  price: number;                // nightly, in priceCurrency (covers `baseGuests`)
  weekendPrice?: number;        // in priceCurrency
  cleaningFee?: number;         // in priceCurrency
  baseGuests?: number;          // guests included in the base price
  extraGuestPct?: number;       // % of base added per extra guest (up to max guests)
  remoteId?: string;            // backend listing id (uuid) once synced — enables editing
  // Content / media
  images: string[];
  // Optional per-photo room tag + caption (powers the guest "Photo tour").
  // Keyed by image URI. Untagged photos fall back to auto-grouping by amenities.
  photoMeta?: Record<string, { room?: string; caption?: string }>;
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
  vibes?: string[];             // beach | mountain | city | nature | lake | ski | romantic | adventure | wellness | family | work | luxury | budget | pet — drives the guest "category" pills & "Match your vibe"
  bookingApproval?: 'approve5' | 'instant';
  discounts?: { newListing?: boolean; lastMinute?: boolean; weekly?: boolean; monthly?: boolean };
  safetyDisclosures?: { camera?: boolean; noise?: boolean; weapons?: boolean };
  // Computed-ish (seeded for demo) — earned, not host-entered
  rating?: number;
  reviewCount?: number;
  createdAt: number;
}

// `icon` is a lucide-react-native component name (PascalCase) — rendered via <AmenityIcon>.
export interface AmenityOption { id: string; label: string; icon: string; category: string; }

// Ordered amenity categories shown to the host (grouped chips in the form).
export const AMENITY_CATEGORY_ORDER = [
  'Standout', 'Bathroom', 'Bedroom & laundry', 'Entertainment', 'Family',
  'Heating & cooling', 'Home safety', 'Internet & workspace', 'Kitchen & dining',
  'Location', 'Outdoor', 'Parking & facilities', 'Services', 'Accessibility',
];

// Comprehensive amenity catalogue (Airbnb-style). `icon` = lucide-react-native
// component name. The host ticks what applies; guests see the same set.
export const AMENITY_OPTIONS: AmenityOption[] = [
  // Standout
  { id: 'pool', label: 'Pool', icon: 'Waves', category: 'Standout' },
  { id: 'hot_tub', label: 'Hot tub', icon: 'Bath', category: 'Standout' },
  { id: 'patio', label: 'Patio or balcony', icon: 'Armchair', category: 'Standout' },
  { id: 'bbq', label: 'BBQ grill', icon: 'Flame', category: 'Standout' },
  { id: 'fire_pit', label: 'Fire pit', icon: 'Flame', category: 'Standout' },
  { id: 'indoor_fireplace', label: 'Indoor fireplace', icon: 'Flame', category: 'Standout' },
  { id: 'pool_table', label: 'Pool table', icon: 'CircleDot', category: 'Standout' },
  { id: 'piano', label: 'Piano', icon: 'Music', category: 'Standout' },
  { id: 'gym', label: 'Gym equipment', icon: 'Dumbbell', category: 'Standout' },
  { id: 'lake_access', label: 'Lake access', icon: 'Waves', category: 'Standout' },
  { id: 'beach_access', label: 'Beach access', icon: 'Umbrella', category: 'Standout' },
  { id: 'ski_in_out', label: 'Ski‑in / ski‑out', icon: 'Snowflake', category: 'Standout' },
  { id: 'outdoor_shower', label: 'Outdoor shower', icon: 'ShowerHead', category: 'Standout' },
  { id: 'waterfront', label: 'Waterfront', icon: 'Waves', category: 'Standout' },
  { id: 'rare_find', label: 'Rare find', icon: 'Gem', category: 'Standout' },

  // Bathroom
  { id: 'bathtub', label: 'Bathtub', icon: 'Bath', category: 'Bathroom' },
  { id: 'hair_dryer', label: 'Hair dryer', icon: 'Wind', category: 'Bathroom' },
  { id: 'cleaning_products', label: 'Cleaning products', icon: 'SprayCan', category: 'Bathroom' },
  { id: 'shampoo', label: 'Shampoo', icon: 'Droplets', category: 'Bathroom' },
  { id: 'conditioner', label: 'Conditioner', icon: 'Droplets', category: 'Bathroom' },
  { id: 'body_soap', label: 'Body soap', icon: 'Droplet', category: 'Bathroom' },
  { id: 'hot_water', label: 'Hot water', icon: 'ThermometerSun', category: 'Bathroom' },
  { id: 'bidet', label: 'Bidet', icon: 'ShowerHead', category: 'Bathroom' },
  { id: 'shower', label: 'Shower', icon: 'ShowerHead', category: 'Bathroom' },

  // Bedroom & laundry
  { id: 'washer', label: 'Washer', icon: 'WashingMachine', category: 'Bedroom & laundry' },
  { id: 'dryer', label: 'Dryer', icon: 'WashingMachine', category: 'Bedroom & laundry' },
  { id: 'essentials', label: 'Essentials', icon: 'Package', category: 'Bedroom & laundry' },
  { id: 'hangers', label: 'Hangers', icon: 'Shirt', category: 'Bedroom & laundry' },
  { id: 'bed_linens', label: 'Bed linens', icon: 'BedDouble', category: 'Bedroom & laundry' },
  { id: 'pillows', label: 'Extra pillows & blankets', icon: 'Bed', category: 'Bedroom & laundry' },
  { id: 'shades', label: 'Room‑darkening shades', icon: 'Blinds', category: 'Bedroom & laundry' },
  { id: 'iron', label: 'Iron', icon: 'Shirt', category: 'Bedroom & laundry' },
  { id: 'drying_rack', label: 'Drying rack', icon: 'Shirt', category: 'Bedroom & laundry' },
  { id: 'clothing_storage', label: 'Clothing storage', icon: 'Archive', category: 'Bedroom & laundry' },
  { id: 'mosquito_net', label: 'Mosquito net', icon: 'Bug', category: 'Bedroom & laundry' },
  { id: 'safe', label: 'Safe', icon: 'Lock', category: 'Bedroom & laundry' },

  // Entertainment
  { id: 'tv', label: 'TV', icon: 'Tv', category: 'Entertainment' },
  { id: 'hdtv', label: 'HDTV', icon: 'Tv', category: 'Entertainment' },
  { id: 'sound_system', label: 'Sound system', icon: 'Speaker', category: 'Entertainment' },
  { id: 'game_console', label: 'Game console', icon: 'Gamepad2', category: 'Entertainment' },
  { id: 'books', label: 'Books', icon: 'BookOpen', category: 'Entertainment' },
  { id: 'ethernet', label: 'Ethernet', icon: 'Cable', category: 'Entertainment' },
  { id: 'exercise', label: 'Exercise equipment', icon: 'Dumbbell', category: 'Entertainment' },
  { id: 'record_player', label: 'Record player', icon: 'Disc3', category: 'Entertainment' },
  { id: 'board_games', label: 'Board games', icon: 'Dices', category: 'Entertainment' },

  // Family
  { id: 'crib', label: 'Crib', icon: 'Baby', category: 'Family' },
  { id: 'travel_crib', label: 'Travel crib', icon: 'Baby', category: 'Family' },
  { id: 'high_chair', label: 'High chair', icon: 'Baby', category: 'Family' },
  { id: 'toys', label: "Children's toys", icon: 'ToyBrick', category: 'Family' },
  { id: 'child_dinnerware', label: "Children's dinnerware", icon: 'Utensils', category: 'Family' },
  { id: 'baby_monitor', label: 'Baby monitor', icon: 'Radio', category: 'Family' },
  { id: 'safety_gates', label: 'Safety gates', icon: 'Fence', category: 'Family' },
  { id: 'outlet_covers', label: 'Outlet covers', icon: 'Plug', category: 'Family' },

  // Heating & cooling
  { id: 'ac', label: 'Air conditioning', icon: 'Snowflake', category: 'Heating & cooling' },
  { id: 'heating', label: 'Heating', icon: 'Thermometer', category: 'Heating & cooling' },
  { id: 'ceiling_fan', label: 'Ceiling fan', icon: 'Fan', category: 'Heating & cooling' },
  { id: 'portable_fan', label: 'Portable fans', icon: 'Fan', category: 'Heating & cooling' },

  // Home safety
  { id: 'smoke_alarm', label: 'Smoke alarm', icon: 'ShieldAlert', category: 'Home safety' },
  { id: 'co_alarm', label: 'CO alarm', icon: 'ShieldAlert', category: 'Home safety' },
  { id: 'fire_extinguisher', label: 'Fire extinguisher', icon: 'FireExtinguisher', category: 'Home safety' },
  { id: 'first_aid', label: 'First aid kit', icon: 'HeartPulse', category: 'Home safety' },
  { id: 'security_cameras', label: 'Security cameras', icon: 'Cctv', category: 'Home safety' },
  { id: 'noise_monitor', label: 'Noise monitor', icon: 'Gauge', category: 'Home safety' },

  // Internet & workspace
  { id: 'wifi', label: 'Wifi', icon: 'Wifi', category: 'Internet & workspace' },
  { id: 'workspace', label: 'Dedicated workspace', icon: 'Laptop', category: 'Internet & workspace' },
  { id: 'pocket_wifi', label: 'Pocket wifi', icon: 'Router', category: 'Internet & workspace' },

  // Kitchen & dining
  { id: 'kitchen', label: 'Kitchen', icon: 'Utensils', category: 'Kitchen & dining' },
  { id: 'refrigerator', label: 'Refrigerator', icon: 'Refrigerator', category: 'Kitchen & dining' },
  { id: 'microwave', label: 'Microwave', icon: 'Microwave', category: 'Kitchen & dining' },
  { id: 'cooking_basics', label: 'Cooking basics', icon: 'CookingPot', category: 'Kitchen & dining' },
  { id: 'dishes', label: 'Dishes & silverware', icon: 'UtensilsCrossed', category: 'Kitchen & dining' },
  { id: 'freezer', label: 'Freezer', icon: 'Snowflake', category: 'Kitchen & dining' },
  { id: 'dishwasher', label: 'Dishwasher', icon: 'WashingMachine', category: 'Kitchen & dining' },
  { id: 'stove', label: 'Stove', icon: 'Flame', category: 'Kitchen & dining' },
  { id: 'oven', label: 'Oven', icon: 'CookingPot', category: 'Kitchen & dining' },
  { id: 'kettle', label: 'Kettle', icon: 'CupSoda', category: 'Kitchen & dining' },
  { id: 'coffee_maker', label: 'Coffee maker', icon: 'Coffee', category: 'Kitchen & dining' },
  { id: 'wine_glasses', label: 'Wine glasses', icon: 'Wine', category: 'Kitchen & dining' },
  { id: 'dining_table', label: 'Dining table', icon: 'Utensils', category: 'Kitchen & dining' },

  // Location
  { id: 'private_entrance', label: 'Private entrance', icon: 'DoorOpen', category: 'Location' },
  { id: 'laundromat', label: 'Laundromat nearby', icon: 'WashingMachine', category: 'Location' },
  { id: 'resort_access', label: 'Resort access', icon: 'Building2', category: 'Location' },

  // Outdoor
  { id: 'backyard', label: 'Backyard', icon: 'Trees', category: 'Outdoor' },
  { id: 'outdoor_furniture', label: 'Outdoor furniture', icon: 'Armchair', category: 'Outdoor' },
  { id: 'outdoor_dining', label: 'Outdoor dining', icon: 'Utensils', category: 'Outdoor' },
  { id: 'hammock', label: 'Hammock', icon: 'TreePalm', category: 'Outdoor' },
  { id: 'beach_essentials', label: 'Beach essentials', icon: 'Umbrella', category: 'Outdoor' },

  // Parking & facilities
  { id: 'free_parking', label: 'Free parking', icon: 'SquareParking', category: 'Parking & facilities' },
  { id: 'street_parking', label: 'Street parking', icon: 'SquareParking', category: 'Parking & facilities' },
  { id: 'paid_parking', label: 'Paid parking', icon: 'SquareParking', category: 'Parking & facilities' },
  { id: 'ev_charger', label: 'EV charger', icon: 'Zap', category: 'Parking & facilities' },
  { id: 'sauna', label: 'Sauna', icon: 'Thermometer', category: 'Parking & facilities' },
  { id: 'single_level', label: 'Single‑level home', icon: 'Building', category: 'Parking & facilities' },
  { id: 'elevator', label: 'Elevator', icon: 'ArrowUpDown', category: 'Parking & facilities' },

  // Services
  { id: 'pets', label: 'Pets allowed', icon: 'PawPrint', category: 'Services' },
  { id: 'long_term', label: 'Long‑term stays', icon: 'CalendarRange', category: 'Services' },
  { id: 'luggage', label: 'Luggage dropoff', icon: 'Luggage', category: 'Services' },
  { id: 'cleaning', label: 'Cleaning during stay', icon: 'Sparkles', category: 'Services' },
  { id: 'breakfast', label: 'Breakfast', icon: 'Croissant', category: 'Services' },
  { id: 'host_greets', label: 'Host greets you', icon: 'Handshake', category: 'Services' },
  { id: 'self_checkin', label: 'Self check‑in', icon: 'KeyRound', category: 'Services' },

  // Accessibility
  { id: 'step_free_entrance', label: 'Step‑free entrance', icon: 'Accessibility', category: 'Accessibility' },
  { id: 'wide_entrance', label: 'Wide entrance', icon: 'Accessibility', category: 'Accessibility' },
  { id: 'accessible_parking', label: 'Accessible parking', icon: 'Accessibility', category: 'Accessibility' },
  { id: 'grab_rails', label: 'Grab rails', icon: 'Accessibility', category: 'Accessibility' },
  { id: 'shower_chair', label: 'Shower chair', icon: 'Accessibility', category: 'Accessibility' },
  { id: 'hoist', label: 'Ceiling hoist', icon: 'Accessibility', category: 'Accessibility' },
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
// `icon` = lucide-react-native name (rendered via <AmenityIcon>).
export const PLACE_TYPES: { id: string; label: string; icon: string }[] = [
  { id: 'House', label: 'House', icon: 'House' },
  { id: 'Flat', label: 'Flat / apartment', icon: 'Building2' },
  { id: 'Barn', label: 'Barn', icon: 'Warehouse' },
  { id: 'Bnb', label: 'Bed & breakfast', icon: 'Hotel' },
  { id: 'Boat', label: 'Boat', icon: 'Sailboat' },
  { id: 'Cabin', label: 'Cabin', icon: 'TreePine' },
  { id: 'Camper', label: 'Campervan', icon: 'Caravan' },
  { id: 'Castle', label: 'Castle', icon: 'Castle' },
  { id: 'Cave', label: 'Cave', icon: 'Mountain' },
  { id: 'Container', label: 'Container', icon: 'Container' },
  { id: 'Dome', label: 'Dome', icon: 'Tent' },
  { id: 'Farm', label: 'Farm', icon: 'Wheat' },
  { id: 'Guesthouse', label: 'Guest house', icon: 'Users' },
  { id: 'Hotel', label: 'Hotel', icon: 'Hotel' },
  { id: 'Houseboat', label: 'Houseboat', icon: 'Sailboat' },
  { id: 'Loft', label: 'Loft', icon: 'Building' },
  { id: 'Tinyhome', label: 'Tiny home', icon: 'Home' },
  { id: 'Villa', label: 'Villa', icon: 'House' },
];

export const PLACE_KINDS: { id: 'entire' | 'room' | 'shared'; label: string; sub: string; icon: string }[] = [
  { id: 'entire', label: 'An entire place', sub: 'Guests have the whole place to themselves.', icon: 'House' },
  { id: 'room', label: 'A room', sub: 'Guests have their own room in a home, plus shared spaces.', icon: 'DoorOpen' },
  { id: 'shared', label: 'A shared room', sub: 'Guests sleep in a room or common area that may be shared.', icon: 'Users' },
];

export const WHO_ELSE_OPTIONS: { id: string; label: string; icon: string }[] = [
  { id: 'me', label: 'Me', icon: 'person-outline' },
  { id: 'family', label: 'My family', icon: 'people-outline' },
  { id: 'other_guests', label: 'Other guests', icon: 'people-circle-outline' },
  { id: 'flatmates', label: 'Flatmates', icon: 'people' },
  { id: 'no_one', label: 'No one', icon: 'person-remove-outline' },
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

// Rooms/areas a host can tag a photo with (also the AI classifier's labels).
// Drives the guest "Photo tour" grouping.
export const PHOTO_ROOMS: { key: string; label: string }[] = [
  { key: 'living', label: 'Living room' },
  { key: 'kitchen', label: 'Kitchen' },
  { key: 'dining', label: 'Dining' },
  { key: 'bedroom', label: 'Bedroom' },
  { key: 'bathroom', label: 'Bathroom' },
  { key: 'balcony', label: 'Balcony' },
  { key: 'workspace', label: 'Workspace' },
  { key: 'pool', label: 'Pool' },
  { key: 'garden', label: 'Garden / open space' },
  { key: 'parking', label: 'Parking' },
  { key: 'playground', label: 'Playground' },
  { key: 'exterior', label: 'Exterior' },
];

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
    priceCurrency: 'USD', price: 100, cleaningFee: 0, baseGuests: 2, extraGuestPct: 0, images: [], photoMeta: {}, videos: [], amenities: [],
    houseRules: { ...DEFAULT_RULES }, safety: [],
    instantBook: true, minNights: 1, checkInTime: '3:00 PM', checkOutTime: '11:00 AM',
    cancellationPolicy: 'Flexible', createdAt: Date.now(),
    placeType: 'entire', bathroomKind: 'private', whoElse: ['no_one'], highlights: [], vibes: [],
    bookingApproval: 'approve5',
    discounts: { newListing: true, lastMinute: true, weekly: true, monthly: true },
    safetyDisclosures: { camera: false, noise: false, weapons: false },
  };
}
