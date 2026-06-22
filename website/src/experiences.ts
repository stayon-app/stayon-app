// Experiences for the website — bookable activities (music, comedy, gaming,
// trips, events…). Mirrors user/src/data/experiences.ts so web and app match.
// Seeded + persisted in localStorage (host-created experiences land here too).

export type BookingType = 'individual' | 'group' | 'both';
export type ExperienceStatus = 'draft' | 'published';

export interface Experience {
  id: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  location: string;
  dateLabel?: string;
  durationLabel?: string;
  pricePerPerson: number; // USD
  capacity: number;
  bookingType: BookingType;
  included?: string;
  rules?: string;
  cancellationPolicy?: 'Flexible' | 'Moderate' | 'Strict';
  hostName?: string;
  rating?: number;
  reviews?: number;
  status: ExperienceStatus;
  createdAt: number;
}

export const EXPERIENCE_CATEGORIES: { id: string; label: string }[] = [
  { id: 'music', label: 'Music shows' },
  { id: 'comedy', label: 'Comedy' },
  { id: 'gaming', label: 'Gaming' },
  { id: 'events', label: 'Events' },
  { id: 'trips', label: 'Trips' },
  { id: 'adventure', label: 'Adventure' },
  { id: 'food', label: 'Food & drink' },
  { id: 'wellness', label: 'Wellness' },
  { id: 'workshops', label: 'Workshops' },
  { id: 'nightlife', label: 'Nightlife' },
];

export function categoryLabel(id: string): string {
  return EXPERIENCE_CATEGORIES.find((c) => c.id === id)?.label || id;
}

const KEY = '@stayon_web_experiences';
const IMG = (id: string) => `https://images.unsplash.com/${id}?w=1200&h=900&fit=crop&q=80`;

const SEED: Experience[] = [
  { id: 'wexp-1', title: 'Rooftop Live Music & Sunset', description: 'An intimate evening of live acoustic sets on a city rooftop, with skyline views and craft drinks.', category: 'music', images: [IMG('photo-1493225457124-a3eb161ffa5f')], location: 'Hyderabad, India', dateLabel: 'Every Sat · 7:00 PM', durationLabel: '3 hours', pricePerPerson: 25, capacity: 40, bookingType: 'both', included: 'Live music, one welcome drink, rooftop seating.', rules: '18+. Arrive 15 minutes early.', cancellationPolicy: 'Moderate', hostName: 'Aarav', rating: 4.9, reviews: 128, status: 'published', createdAt: 1 },
  { id: 'wexp-2', title: 'Stand-up Comedy Night', description: 'Laugh out loud with the city’s best comedians in a cosy club setting.', category: 'comedy', images: [IMG('photo-1527224538127-2104bb71c51b')], location: 'Bengaluru, India', dateLabel: 'Fri & Sat · 8:30 PM', durationLabel: '90 min', pricePerPerson: 15, capacity: 60, bookingType: 'both', included: 'Entry, reserved seating.', cancellationPolicy: 'Flexible', hostName: 'Meera', rating: 4.8, reviews: 96, status: 'published', createdAt: 2 },
  { id: 'wexp-3', title: 'Retro Gaming Tournament', description: 'Compete in classic console and arcade games. Prizes for the top players!', category: 'gaming', images: [IMG('photo-1542751371-adc38448a05e')], location: 'Mumbai, India', dateLabel: 'Sun · 4:00 PM', durationLabel: '4 hours', pricePerPerson: 18, capacity: 32, bookingType: 'both', included: 'All games, snacks, prizes.', cancellationPolicy: 'Moderate', hostName: 'Kabir', rating: 4.7, reviews: 54, status: 'published', createdAt: 3 },
  { id: 'wexp-4', title: 'Sunrise Trek & Breakfast', description: 'A guided dawn hike to a hilltop viewpoint, finishing with a local breakfast.', category: 'trips', images: [IMG('photo-1551632811-561732d1e306')], location: 'Lonavala, India', dateLabel: 'Sat & Sun · 5:30 AM', durationLabel: '5 hours', pricePerPerson: 30, capacity: 15, bookingType: 'both', included: 'Guide, breakfast, transport from meeting point.', rules: 'Wear sports shoes. Moderate fitness needed.', cancellationPolicy: 'Strict', hostName: 'Diya', rating: 4.95, reviews: 73, status: 'published', createdAt: 4 },
];

function load(): Experience[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch { /* ignore */ }
  try { localStorage.setItem(KEY, JSON.stringify(SEED)); } catch { /* ignore */ }
  return SEED;
}

export function getPublishedExperiences(): Experience[] {
  return load().filter((e) => e.status === 'published').sort((a, b) => b.createdAt - a.createdAt);
}

export function getExperience(id: string): Experience | undefined {
  return load().find((e) => e.id === id);
}

export function saveExperience(exp: Experience): void {
  const list = load().slice();
  const i = list.findIndex((e) => e.id === exp.id);
  if (i >= 0) list[i] = exp; else list.unshift(exp);
  try { localStorage.setItem(KEY, JSON.stringify(list)); } catch { /* ignore */ }
}
