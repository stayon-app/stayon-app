// Builds an Airbnb-style "Photo tour": groups a stay's photos into rooms
// (Living room, Kitchen, Bedroom, Bathroom…) each with a feature list.
// Prefers the host's per-photo room tags + captions when present; otherwise
// auto-groups by amenities. Works for ANY stay (real or generated).

export interface TourPhoto { uri: string; caption?: string }
export interface PhotoCategory {
  key: string;
  title: string;
  features: string[];
  photos: TourPhoto[];
}

type RawPhoto = string | { uri?: string; url?: string; room?: string; caption?: string };

const prettify = (s: string) =>
  String(s).replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).trim();

// room key → display title (matches the host wizard's PHOTO_ROOMS + AI labels)
const ROOM_TITLES: Record<string, string> = {
  living: 'Living room', kitchen: 'Full kitchen', dining: 'Dining area',
  bedroom: 'Bedroom', bathroom: 'Full bathroom', balcony: 'Balcony',
  workspace: 'Workspace', pool: 'Pool', garden: 'Garden / open space',
  parking: 'Parking', playground: 'Playground', exterior: 'Exterior',
};
const ROOM_ORDER = ['living', 'kitchen', 'dining', 'bedroom', 'bathroom', 'balcony', 'workspace', 'pool', 'garden', 'parking', 'playground', 'exterior'];

// room → amenity keywords + default features (for the feature line)
const ROOMS: { key: string; title: string; match: string[]; defaults: string[]; core?: boolean }[] = [
  { key: 'living', title: 'Living room', core: true, match: ['sofa', 'tv', 'television', 'sound', 'speaker', 'fireplace', 'wifi'], defaults: ['Sofa', 'TV'] },
  { key: 'kitchen', title: 'Full kitchen', core: true, match: ['kitchen', 'fridge', 'refriger', 'freezer', 'kettle', 'cooker', 'cooking', 'crockery', 'cutlery', 'blender', 'dishwasher', 'microwave', 'oven', 'stove', 'coffee'], defaults: ['Cooking basics', 'Fridge', 'Kettle'] },
  { key: 'dining', title: 'Dining area', match: ['dining', 'dinner'], defaults: ['Dining table'] },
  { key: 'bedroom', title: 'Bedroom', core: true, match: ['bed', 'linen', 'hanger', 'wardrobe', 'blind', 'clothes storage', 'pillow', 'blanket'], defaults: ['Queen bed', 'Bed linen', 'Hangers'] },
  { key: 'bathroom', title: 'Full bathroom', core: true, match: ['bidet', 'hair', 'hot water', 'shampoo', 'shower', 'gel', 'toilet', 'towel', 'bath'], defaults: ['Hot water', 'Shampoo', 'Towels'] },
  { key: 'workspace', title: 'Workspace', match: ['workspace', 'desk', 'work'], defaults: ['Dedicated workspace'] },
  { key: 'exterior', title: 'Exterior', match: ['parking', 'pool', 'garden', 'balcony', 'view', 'patio', 'terrace', 'bbq', 'beach'], defaults: ['Outdoor space'] },
];
const COMMON = ['Air conditioning', 'Ceiling fan'];

function featuresFor(roomKey: string, amen: string[], amenLower: string[]): string[] {
  const room = ROOMS.find((r) => r.key === roomKey);
  const matched = room ? amen.filter((_, idx) => room.match.some((m) => amenLower[idx].includes(m))) : [];
  const base = matched.length ? matched.map(prettify) : (room?.defaults || []);
  return Array.from(new Set([...base, ...COMMON])).slice(0, 8);
}

export function buildPhotoTour(rawImages: RawPhoto[], amenities: Array<string | { name?: string }> = []): PhotoCategory[] {
  const photos = (rawImages || [])
    .map((i) => (typeof i === 'string' ? { uri: i } : { uri: i?.uri || i?.url, room: i?.room, caption: i?.caption }))
    .filter((p): p is { uri: string; room?: string; caption?: string } => !!p.uri);
  if (!photos.length) return [];

  const amen = (amenities || []).map((a) => (typeof a === 'string' ? a : a?.name || '')).filter(Boolean);
  const amenLower = amen.map((a) => a.toLowerCase());

  // If the host tagged any photo with a room → group by those real tags.
  const tagged = photos.some((p) => p.room);
  if (tagged) {
    const byRoom = new Map<string, TourPhoto[]>();
    const untagged: TourPhoto[] = [];
    for (const p of photos) {
      if (p.room && ROOM_TITLES[p.room]) {
        if (!byRoom.has(p.room)) byRoom.set(p.room, []);
        byRoom.get(p.room)!.push({ uri: p.uri, caption: p.caption });
      } else {
        untagged.push({ uri: p.uri, caption: p.caption });
      }
    }
    const cats: PhotoCategory[] = ROOM_ORDER.filter((k) => byRoom.has(k)).map((k) => ({
      key: k, title: ROOM_TITLES[k], features: featuresFor(k, amen, amenLower), photos: byRoom.get(k)!,
    }));
    if (untagged.length) cats.push({ key: 'more', title: 'More photos', features: [], photos: untagged });
    return cats;
  }

  // Otherwise auto-group by amenities and distribute photos round-robin.
  const cats: PhotoCategory[] = [];
  for (const room of ROOMS) {
    const matched = amen.filter((_, idx) => room.match.some((m) => amenLower[idx].includes(m)));
    if (!room.core && matched.length === 0) continue;
    cats.push({ key: room.key, title: room.title, features: featuresFor(room.key, amen, amenLower), photos: [] });
  }
  photos.forEach((p, i) => cats[i % cats.length].photos.push({ uri: p.uri, caption: p.caption }));
  cats.forEach((c, i) => { if (!c.photos.length) c.photos.push({ uri: photos[i % photos.length].uri }); });
  return cats;
}
