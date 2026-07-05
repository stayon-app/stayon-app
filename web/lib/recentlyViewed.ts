'use client';

// Recently-viewed stays, mirroring the app's data/recentlyViewed.ts:
// most-recent-first id list in localStorage, capped at 12.
const KEY = 'stayon_recently_viewed';
const MAX = 12;

export function recordView(id: string) {
  try {
    const raw = localStorage.getItem(KEY);
    const ids: string[] = raw ? JSON.parse(raw) : [];
    const next = [id, ...ids.filter((x) => x !== id)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch { /* ignore */ }
}

export function recentlyViewedIds(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}
