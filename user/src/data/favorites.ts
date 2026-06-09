// Favorites — the heart on any stay card. Persisted as a "Saved" collection in
// the same wishlists storage, so hearted stays appear in the Wishlists tab.
// A tiny in-memory cache + listener set keeps every visible heart in sync when
// one is toggled.

import { useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  WISHLISTS_STORAGE_KEY,
  SEED_WISHLISTS,
  WishlistCollection,
  WishlistStay,
} from './wishlists';

const SAVED_ID = 'wl_saved';
const SAVED_NAME = 'Saved';

let cache: Set<string> | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

async function readCollections(): Promise<WishlistCollection[]> {
  try {
    const raw = await AsyncStorage.getItem(WISHLISTS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // fall through to seed
  }
  return SEED_WISHLISTS;
}

async function writeCollections(list: WishlistCollection[]) {
  try {
    await AsyncStorage.setItem(WISHLISTS_STORAGE_KEY, JSON.stringify(list));
  } catch {
    // best-effort
  }
}

/** Load (or refresh) the favorites cache from storage. */
export async function loadFavorites(): Promise<Set<string>> {
  const cols = await readCollections();
  const saved = cols.find((c) => c.id === SAVED_ID);
  cache = new Set((saved?.stays ?? []).map((s) => s.id));
  notify();
  return cache;
}

export function isFavorite(id: string): boolean {
  return cache ? cache.has(String(id)) : false;
}

/** Add/remove a stay from the Saved collection. Returns the new favorited state. */
export async function toggleFavorite(stay: WishlistStay): Promise<boolean> {
  const id = String(stay.id);
  const cols = await readCollections();
  let saved = cols.find((c) => c.id === SAVED_ID);
  if (!saved) {
    saved = { id: SAVED_ID, name: SAVED_NAME, stays: [] };
    cols.unshift(saved);
  }
  const exists = saved.stays.some((s) => String(s.id) === id);
  saved.stays = exists
    ? saved.stays.filter((s) => String(s.id) !== id)
    : [{ ...stay, id }, ...saved.stays];
  await writeCollections(cols);

  if (!cache) cache = new Set();
  if (exists) cache.delete(id);
  else cache.add(id);
  notify();
  return !exists;
}

/**
 * Card hook: live `favorited` flag + `toggle`. Reads the shared cache, loads it
 * on first use, and re-renders whenever any card toggles a favorite.
 */
export function useFavorite(stay: WishlistStay): readonly [boolean, () => void] {
  const id = String(stay.id);
  const [fav, setFav] = useState<boolean>(() => isFavorite(id));

  useEffect(() => {
    let active = true;
    if (cache === null) {
      loadFavorites().then(() => { if (active) setFav(isFavorite(id)); });
    } else {
      setFav(isFavorite(id));
    }
    const l = () => setFav(isFavorite(id));
    listeners.add(l);
    return () => { active = false; listeners.delete(l); };
  }, [id]);

  return [fav, () => { toggleFavorite(stay); }] as const;
}
