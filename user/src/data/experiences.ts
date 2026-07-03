import AsyncStorage from '@react-native-async-storage/async-storage';
import type { CancellationTier } from './cancellationPolicy';

// ---------------------------------------------------------------------------
// Experiences — bookable activities a host can publish alongside stays.
// Music shows, comedy, gaming, events, trips, adventure, food, etc.
// Frontend-only for now: seeded + host-created experiences persisted locally,
// mirroring how stays/cards work elsewhere in the app.
// ---------------------------------------------------------------------------

export type BookingType = 'individual' | 'group' | 'both';
export type ExperienceStatus = 'draft' | 'published';

export interface Experience {
  id: string;
  title: string;
  description: string;
  category: string;          // one of EXPERIENCE_CATEGORIES ids
  images: string[];          // first image is the cover
  location: string;
  dateLabel?: string;        // e.g. "Sat, Jul 12 · 7:00 PM" (free text for now)
  durationLabel?: string;    // e.g. "2 hours"
  pricePerPerson: number;    // USD, charged per person
  capacity: number;          // max total spots
  bookingType: BookingType;  // individual / group / both
  included?: string;         // "what's included" free text
  rules?: string;            // guidelines / rules guests should know
  cancellationPolicy?: CancellationTier; // Flexible / Moderate / Strict
  hostName?: string;
  rating?: number;
  reviews?: number;
  status: ExperienceStatus;
  createdAt: number;
}

// Category catalogue — broad set requested (music/comedy/gaming/events/trips…).
export const EXPERIENCE_CATEGORIES: { id: string; label: string; icon: string }[] = [
  { id: 'music', label: 'Music shows', icon: 'musical-notes' },
  { id: 'comedy', label: 'Comedy', icon: 'happy' },
  { id: 'gaming', label: 'Gaming', icon: 'game-controller' },
  { id: 'events', label: 'Events', icon: 'sparkles' },
  { id: 'trips', label: 'Trips', icon: 'bus' },
  { id: 'adventure', label: 'Adventure', icon: 'trail-sign' },
  { id: 'food', label: 'Food & drink', icon: 'restaurant' },
  { id: 'wellness', label: 'Wellness', icon: 'leaf' },
  { id: 'workshops', label: 'Workshops', icon: 'construct' },
  { id: 'nightlife', label: 'Nightlife', icon: 'wine' },
];

export function categoryLabel(id: string): string {
  return EXPERIENCE_CATEGORIES.find((c) => c.id === id)?.label || id;
}
export function categoryIcon(id: string): string {
  return EXPERIENCE_CATEGORIES.find((c) => c.id === id)?.icon || 'sparkles';
}

const STORAGE_KEY = '@stayon_experiences';

const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&h=900&fit=crop&q=80`;

// A few seeded experiences so Explore isn't empty before hosts add their own.
const SEED_EXPERIENCES: Experience[] = [
  {
    id: 'exp-seed-1', title: 'Rooftop Live Music & Sunset', description: 'An intimate evening of live acoustic sets on a city rooftop, with skyline views and craft drinks.',
    category: 'music', images: [IMG('photo-1493225457124-a3eb161ffa5f')], location: 'Hyderabad, India',
    dateLabel: 'Every Sat · 7:00 PM', durationLabel: '3 hours', pricePerPerson: 25, capacity: 40, bookingType: 'both',
    included: 'Live music, one welcome drink, rooftop seating.', hostName: 'Aarav', rating: 4.9, reviews: 128, status: 'published', createdAt: 1,
  },
  {
    id: 'exp-seed-2', title: 'Stand-up Comedy Night', description: 'Laugh out loud with the city’s best comedians in a cosy club setting.',
    category: 'comedy', images: [IMG('photo-1527224538127-2104bb71c51b')], location: 'Bengaluru, India',
    dateLabel: 'Fri & Sat · 8:30 PM', durationLabel: '90 min', pricePerPerson: 15, capacity: 60, bookingType: 'both',
    included: 'Entry, reserved seating.', hostName: 'Meera', rating: 4.8, reviews: 96, status: 'published', createdAt: 2,
  },
  {
    id: 'exp-seed-3', title: 'Retro Gaming Tournament', description: 'Compete in classic console and arcade games. Prizes for the top players!',
    category: 'gaming', images: [IMG('photo-1542751371-adc38448a05e')], location: 'Mumbai, India',
    dateLabel: 'Sun · 4:00 PM', durationLabel: '4 hours', pricePerPerson: 18, capacity: 32, bookingType: 'both',
    included: 'All games, snacks, prizes.', hostName: 'Kabir', rating: 4.7, reviews: 54, status: 'published', createdAt: 3,
  },
  {
    id: 'exp-seed-4', title: 'Sunrise Trek & Breakfast', description: 'A guided dawn hike to a hilltop viewpoint, finishing with a local breakfast.',
    category: 'trips', images: [IMG('photo-1551632811-561732d1e306')], location: 'Lonavala, India',
    dateLabel: 'Sat & Sun · 5:30 AM', durationLabel: '5 hours', pricePerPerson: 30, capacity: 15, bookingType: 'both',
    included: 'Guide, breakfast, transport from meeting point.', hostName: 'Diya', rating: 4.95, reviews: 73, status: 'published', createdAt: 4,
  },
];

let cache: Experience[] | null = null;

async function load(): Promise<Experience[]> {
  if (cache) return cache;
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw) { cache = JSON.parse(raw); return cache!; }
  } catch { /* fall through to seed */ }
  cache = SEED_EXPERIENCES.slice();
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cache)); } catch { /* best effort */ }
  return cache;
}

async function persist(list: Experience[]): Promise<void> {
  cache = list;
  try { await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list)); } catch { /* best effort */ }
}

/** All published experiences (for guests). */
export async function getPublishedExperiences(): Promise<Experience[]> {
  return (await load()).filter((e) => e.status === 'published').sort((a, b) => b.createdAt - a.createdAt);
}

/** Every experience including drafts (for the host's own list). */
export async function getAllExperiences(): Promise<Experience[]> {
  return (await load()).slice().sort((a, b) => b.createdAt - a.createdAt);
}

export async function getExperience(id: string): Promise<Experience | undefined> {
  return (await load()).find((e) => e.id === id);
}

/** Create or update an experience. */
export async function saveExperience(exp: Experience): Promise<void> {
  const list = (await load()).slice();
  const i = list.findIndex((e) => e.id === exp.id);
  if (i >= 0) list[i] = exp; else list.unshift(exp);
  await persist(list);
}

export async function deleteExperience(id: string): Promise<void> {
  await persist((await load()).filter((e) => e.id !== id));
}

// --- Content moderation -----------------------------------------------------
// Block clearly illegal / unsafe / confidential content. Anything questionable
// can be sent to the Ops review queue in a later phase.
const BANNED = [
  'drug', 'drugs', 'cocaine', 'heroin', 'meth', 'weed', 'marijuana', 'narcotic',
  'weapon', 'gun', 'firearm', 'explosive', 'bomb',
  'escort', 'prostitut', 'trafficking',
  'confidential', 'classified', 'stolen', 'counterfeit',
];

export interface ContentCheck { ok: boolean; reason?: string }

/** Screen free text for disallowed content. Returns { ok, reason }. */
export function screenContent(...parts: (string | undefined)[]): ContentCheck {
  const text = parts.filter(Boolean).join(' ').toLowerCase();
  for (const word of BANNED) {
    if (text.includes(word)) {
      return { ok: false, reason: `Content mentioning "${word}" isn't allowed. Experiences must be legal, safe and appropriate.` };
    }
  }
  return { ok: true };
}

let counter = 0;
/** Generate a unique-ish id for a new experience (frontend only). */
export function newExperienceId(): string {
  counter += 1;
  return `exp-${Date.now()}-${counter}`;
}
