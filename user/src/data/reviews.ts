// Guest reviews written in-app. Persisted to AsyncStorage and shown on the
// property detail screen (newest first), merged ahead of any seed reviews.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface StoredReview {
  id: string;
  propertyId: string;
  author: string;
  avatar?: string;
  rating: number; // overall 1–5
  text: string;
  wouldRecommend?: boolean;
  date: number; // epoch ms
}

const KEY = '@stayon_reviews';

async function readAll(): Promise<StoredReview[]> {
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

export async function addReview(
  r: Omit<StoredReview, 'id' | 'date'> & { date?: number },
): Promise<StoredReview> {
  const all = await readAll();
  const date = r.date ?? Date.now();
  const review: StoredReview = { ...r, date, id: `r_${date}_${String(r.propertyId)}` };
  all.unshift(review);
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // best-effort
  }
  return review;
}

export async function getReviews(propertyId: string): Promise<StoredReview[]> {
  const all = await readAll();
  return all.filter((r) => String(r.propertyId) === String(propertyId));
}

/** "2 days ago" style relative label for a review timestamp. */
export function relativeDate(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  const day = 86400000;
  if (diff < day) return 'Today';
  if (diff < 2 * day) return 'Yesterday';
  const days = Math.floor(diff / day);
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)} week${days < 14 ? '' : 's'} ago`;
  return `${Math.floor(days / 30)} month${days < 60 ? '' : 's'} ago`;
}
