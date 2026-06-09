// StayOn - Itinerary / Trip Planner data model + seed
// Used by TripsScreen. Persisted to AsyncStorage under '@stayon_itineraries'.

export type ItineraryItemType =
  | 'check-in'
  | 'activity'
  | 'dining'
  | 'transport'
  | 'note';

export interface ItineraryItem {
  id: string;
  /** Day grouping key + label, e.g. "Day 1 · Mon, Jun 8" header is built from `dayLabel`. */
  dayKey: string; // stable sort/group key e.g. "2026-06-08"
  dayLabel: string; // human label e.g. "Mon, Jun 8"
  dayNumber: number; // 1-based day index for "Day N" header
  /** 24h minutes-from-midnight, used for sorting within a day. */
  sortTime: number;
  /** Display time, e.g. "2:00 PM". */
  time: string;
  type: ItineraryItemType;
  title: string;
  location?: string;
  notes?: string;
}

export interface ItineraryMeta {
  icon: string; // Ionicons name
  label: string;
  color: keyof typeof TYPE_COLOR_KEYS;
}

// Keys map to useTheme() colors so we stay light/dark safe.
const TYPE_COLOR_KEYS = {
  primary: 'primary',
  gold: 'gold',
  secondary: 'secondary',
  info: 'info',
  textTertiary: 'textTertiary',
} as const;

export const ITINERARY_TYPES: {
  type: ItineraryItemType;
  icon: string;
  label: string;
  colorKey: keyof typeof TYPE_COLOR_KEYS;
}[] = [
  { type: 'check-in', icon: 'key', label: 'Check-in', colorKey: 'primary' },
  { type: 'activity', icon: 'walk', label: 'Activity', colorKey: 'info' },
  { type: 'dining', icon: 'restaurant', label: 'Dining', colorKey: 'secondary' },
  { type: 'transport', icon: 'car', label: 'Transport', colorKey: 'gold' },
  { type: 'note', icon: 'document-text', label: 'Note', colorKey: 'textTertiary' },
];

export function typeMeta(type: ItineraryItemType) {
  return ITINERARY_TYPES.find((t) => t.type === type) ?? ITINERARY_TYPES[1];
}

/** Convert "2:00 PM" / "10:30 AM" style strings into minutes-from-midnight for sorting. */
export function parseTimeToMinutes(time: string): number {
  const m = time.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!m) return 0;
  let hours = parseInt(m[1], 10) % 12;
  const minutes = parseInt(m[2], 10);
  if (/PM/i.test(m[3])) hours += 12;
  return hours * 60 + minutes;
}

let idCounter = 0;
export function makeItemId(): string {
  idCounter += 1;
  return `it_${Date.now()}_${idCounter}`;
}

// Seed: trip '1' (Manhattan Luxury Loft, New York) — a realistic 2-day plan.
export const SEED_ITINERARIES: Record<string, ItineraryItem[]> = {
  '1': [
    {
      id: 'seed_1_1',
      dayKey: '2026-06-15',
      dayLabel: 'Mon, Jun 15',
      dayNumber: 1,
      sortTime: 15 * 60,
      time: '3:00 PM',
      type: 'check-in',
      title: 'Check in at Manhattan Luxury Loft',
      location: 'SoHo, New York, NY',
      notes: 'Self check-in. Door code sent 24h before arrival.',
    },
    {
      id: 'seed_1_2',
      dayKey: '2026-06-15',
      dayLabel: 'Mon, Jun 15',
      dayNumber: 1,
      sortTime: 19 * 60,
      time: '7:00 PM',
      type: 'dining',
      title: 'Dinner at Carbone',
      location: 'Greenwich Village',
      notes: 'Reservation for 2 · approx. $180',
    },
    {
      id: 'seed_1_3',
      dayKey: '2026-06-16',
      dayLabel: 'Tue, Jun 16',
      dayNumber: 2,
      sortTime: 10 * 60,
      time: '10:00 AM',
      type: 'activity',
      title: 'The Met Museum',
      location: '1000 5th Ave',
      notes: 'Tickets $30 per person.',
    },
    {
      id: 'seed_1_4',
      dayKey: '2026-06-16',
      dayLabel: 'Tue, Jun 16',
      dayNumber: 2,
      sortTime: 13 * 60,
      time: '1:00 PM',
      type: 'dining',
      title: 'Lunch in Central Park',
      location: 'The Loeb Boathouse',
      notes: 'Lakeside table · approx. $90',
    },
    {
      id: 'seed_1_5',
      dayKey: '2026-06-16',
      dayLabel: 'Tue, Jun 16',
      dayNumber: 2,
      sortTime: 18 * 60,
      time: '6:00 PM',
      type: 'activity',
      title: 'Sunset Harbor Cruise',
      location: 'Chelsea Piers, Pier 62',
      notes: 'Boarding 5:45 PM · $75 per ticket',
    },
  ],
};
