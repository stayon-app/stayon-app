// Recently viewed stays — pushed when a guest opens a property, shown as a row
// on Home (Airbnb-style). Persisted to AsyncStorage, deduped by id, capped at 12.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface RecentStay {
  id: string;
  title: string;
  location: string;
  price: number;
  rating: number;
  image: string;
  property: any; // raw object, so tapping re-opens the detail screen
  viewedAt: number;
}

const KEY = '@stayon_recently_viewed';
const MAX = 12;

export async function getRecentlyViewed(): Promise<RecentStay[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // ignore
  }
  return [];
}

export async function addRecentlyViewed(stay: Omit<RecentStay, 'viewedAt'>): Promise<void> {
  const id = String(stay.id ?? '');
  if (!id) return;
  try {
    const list = await getRecentlyViewed();
    const next = [
      { ...stay, id, viewedAt: Date.now() },
      ...list.filter((s) => String(s.id) !== id),
    ].slice(0, MAX);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // best-effort
  }
}
