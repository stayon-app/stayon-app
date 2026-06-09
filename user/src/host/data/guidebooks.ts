// Listing Guidebook — a host-curated local guide (eat / see / do / getting
// around) per listing, shown to guests on the property page. Mock store.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type GuideCategory = 'eat' | 'see' | 'do' | 'move';

export interface GuideEntry {
  id: string;
  category: GuideCategory;
  title: string;
  note: string;
  area?: string;
}

const KEY = '@stayon_host_guidebooks';

export const GUIDE_CATEGORIES: { key: GuideCategory; label: string; icon: string }[] = [
  { key: 'eat', label: 'Eat & drink', icon: 'restaurant-outline' },
  { key: 'see', label: 'See', icon: 'image-outline' },
  { key: 'do', label: 'Do', icon: 'walk-outline' },
  { key: 'move', label: 'Getting around', icon: 'navigate-outline' },
];

const SEED: Record<string, GuideEntry[]> = {
  hl1: [
    { id: 'g1', category: 'eat', title: 'Sunrise Café', note: 'Best filter coffee & breakfast, 5 min walk. Try the masala omelette.', area: '2 min walk' },
    { id: 'g2', category: 'eat', title: 'The Spice Lane', note: 'Local dinner spot the neighbours love — go before 8pm.', area: '8 min walk' },
    { id: 'g3', category: 'see', title: 'Old Fort viewpoint', note: 'Sunset over the city. Quiet on weekday evenings.', area: '10 min auto' },
    { id: 'g4', category: 'do', title: 'Riverside market', note: 'Crafts, street food and music on weekends.', area: '15 min' },
    { id: 'g5', category: 'move', title: 'Getting around', note: 'Autos are everywhere; the metro stop is 6 min away. Avoid 6–8pm traffic.' },
  ],
};

type GuideMap = Record<string, GuideEntry[]>;

async function readAll(): Promise<GuideMap> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p; } } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED)).catch(() => {});
  return SEED;
}

export async function getGuide(listingId: string): Promise<GuideEntry[]> {
  const m = await readAll();
  return m[listingId] ?? [];
}

/** Demo fallback for the guest view — shows the first non-empty guide. */
export async function getAnyGuide(): Promise<GuideEntry[]> {
  const m = await readAll();
  const first = Object.values(m).find((g) => g.length > 0);
  return first ?? [];
}

export async function addGuideEntry(listingId: string, e: Omit<GuideEntry, 'id'>): Promise<GuideEntry[]> {
  const m = await readAll();
  const list = [...(m[listingId] ?? []), { ...e, id: `g_${Date.now()}` }];
  m[listingId] = list;
  await AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});
  return list;
}

export async function deleteGuideEntry(listingId: string, id: string): Promise<GuideEntry[]> {
  const m = await readAll();
  const list = (m[listingId] ?? []).filter((x) => x.id !== id);
  m[listingId] = list;
  await AsyncStorage.setItem(KEY, JSON.stringify(m)).catch(() => {});
  return list;
}
