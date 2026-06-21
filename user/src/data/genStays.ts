// Generates country-located stays clustered around the user's live coordinates,
// so the home feed (Nearby You / Guest Favorites) shows stays IN the visitor's
// country — not far-away foreign listings. Same BotStay shape as the curated set,
// so all downstream logic (distance sort, category match, filters, botStayToProperty)
// works unchanged. Swap for real backend inventory later.

import { BotStay } from './stays';

const img = (id: string) => `https://images.unsplash.com/${id}?w=1600&q=80&auto=format&fit=crop`;
const IMGS = [
  'photo-1502672260266-1c1ef2d93688', 'photo-1560448204-e02f11c3d0e2', 'photo-1505691938895-1758d7feb511',
  'photo-1522708323590-d24dbb6b0267', 'photo-1493809842364-78817add7ffb', 'photo-1484154218962-a197022b5858',
  'photo-1560185007-cde436f6a4d0', 'photo-1505693416388-ac5ce068fe85', 'photo-1551524559-8af4e6624178',
  'photo-1564013799919-ab600027ffc6', 'photo-1512917774080-9991f1c4c750', 'photo-1493809842364-78817add7ffb',
];
const TYPES = ['Apartment', 'Villa', 'Loft', 'Cottage', 'Studio', 'Bungalow', 'Penthouse', 'Home', 'Cabin', 'Flat', 'Townhouse', 'Farmhouse'];
const AREAS = ['Downtown', 'Old Town', 'Riverside', 'Hillside', 'Central', 'Lakeview', 'Marina', 'Garden District', 'Uptown', 'Beachside', 'Heritage Quarter', 'The Heights'];
const VIBES = ['city', 'beach', 'luxury', 'family', 'romantic', 'budget', 'nature', 'work'];
const AMEN = ['wifi', 'kitchen', 'ac', 'parking', 'pool', 'workspace', 'gym', 'hottub', 'beachfront', 'pet', 'fireplace'];

function hashStr(s: string): number { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function rngFrom(seed: number) { let x = seed || 1; return () => { x = (x + 0x6D2B79F5) | 0; let t = Math.imul(x ^ (x >>> 15), 1 | x); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T,>(arr: T[], r: number): T => arr[Math.floor(r * arr.length) % arr.length];
const uniq = <T,>(a: T[]): T[] => Array.from(new Set(a));

export function generateLocalStays(
  loc: { city?: string; country?: string; latitude: number; longitude: number },
  count = 10,
): BotStay[] {
  const cityLabel = loc.city && loc.city !== 'Your area' ? loc.city : (loc.country || 'Nearby');
  const seed = hashStr((cityLabel + '|' + (loc.country || '')).toLowerCase());
  const r = rngFrom(seed);
  const out: BotStay[] = [];
  for (let i = 0; i < count; i++) {
    const type = pick(TYPES, r());
    const area = pick(AREAS, r());
    const price = 40 + Math.floor(r() * 460);
    const beds = 1 + Math.floor(r() * 4);
    const imgs = [0, 1, 2].map((k) => img(IMGS[(i + k * 3) % IMGS.length]));
    const vibes = uniq([pick(VIBES, r()), pick(VIBES, r())]);
    const amenities = uniq(Array.from({ length: 5 + Math.floor(r() * 2) }, () => pick(AMEN, r())));
    out.push({
      id: `local-${seed}-${i}`,
      title: `${type} in ${area}`,
      city: cityLabel,
      country: loc.country || '',
      location: `${area}, ${cityLabel}`,
      price,
      rating: +(4.6 + r() * 0.39).toFixed(2),
      reviews: 6 + Math.floor(r() * 380),
      image: imgs[0],
      images: imgs,
      type,
      maxGuests: beds * 2,
      beds: beds + Math.floor(r() * 2),
      baths: 1 + Math.floor(r() * 3),
      vibes,
      amenities,
      // cluster tightly around the user so they sort to the top of "Nearby You"
      latitude: loc.latitude + (r() - 0.5) * 0.1,
      longitude: loc.longitude + (r() - 0.5) * 0.1,
      instantBook: r() > 0.45,
    });
  }
  return out;
}
