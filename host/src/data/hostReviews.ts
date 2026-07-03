// Reviews, both directions:
//  • guestReviews — reviews guests wrote about the host's listings (host responds)
//  • hostToGuest  — reviews the host writes about a guest after checkout
// Persisted to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

const av = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0D9488&color=fff`;

export interface GuestReview {
  id: string;
  guestName: string;
  guestAvatar: string;
  listingTitle: string;
  rating: number;
  text: string;
  date: string;
  response?: string; // host's public response
}

export interface HostToGuestReview {
  id: string;
  reservationId: string;
  guestName: string;
  overall: number;
  communication: number;
  cleanliness: number;
  rules: number;
  recommend: boolean;
  text: string;
  date: number;
}

const GKEY = '@stayon_host_guestreviews';
const HKEY = '@stayon_host_hosttoguest';

export const SEED_GUEST_REVIEWS: GuestReview[] = [
  { id: 'g1', guestName: 'Emma Davis', guestAvatar: av('Emma Davis'), listingTitle: 'Palm Garden Villa', rating: 5, text: 'Stunning villa, spotless and the host was so responsive. Loved the pool!', date: 'May 2026' },
  { id: 'g2', guestName: 'Noah Williams', guestAvatar: av('Noah Williams'), listingTitle: 'Sunlit Loft in the City', rating: 5, text: 'Great location and super comfortable. Self check‑in was a breeze.', date: 'May 2026', response: 'Thanks Noah — you were a wonderful guest!' },
  { id: 'g3', guestName: 'Olivia Brown', guestAvatar: av('Olivia Brown'), listingTitle: 'Sunlit Loft in the City', rating: 4, text: 'Lovely stay overall, just a little street noise at night.', date: 'Apr 2026' },
];

export async function getGuestReviews(): Promise<GuestReview[]> {
  try { const raw = await AsyncStorage.getItem(GKEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  await AsyncStorage.setItem(GKEY, JSON.stringify(SEED_GUEST_REVIEWS)).catch(() => {});
  return SEED_GUEST_REVIEWS;
}

export async function respondToReview(id: string, response: string): Promise<GuestReview[]> {
  const all = await getGuestReviews();
  const next = all.map((r) => (r.id === id ? { ...r, response } : r));
  await AsyncStorage.setItem(GKEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function getHostToGuest(): Promise<HostToGuestReview[]> {
  try { const raw = await AsyncStorage.getItem(HKEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  return [];
}

export async function addHostToGuest(r: Omit<HostToGuestReview, 'id' | 'date'>): Promise<HostToGuestReview[]> {
  const all = await getHostToGuest();
  const next = [{ ...r, id: `h_${Date.now()}`, date: Date.now() }, ...all];
  await AsyncStorage.setItem(HKEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export function avgRating(rs: GuestReview[]): number {
  if (!rs.length) return 0;
  return rs.reduce((s, r) => s + r.rating, 0) / rs.length;
}
