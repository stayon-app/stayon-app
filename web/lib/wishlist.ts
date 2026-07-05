'use client';

// Tiny localStorage-backed wishlist, mirroring the app's `useFavorite` store:
// a module-level set with subscribers so every card sharing an id stays in sync.
import { useEffect, useState, useCallback } from 'react';

const KEY = 'stayon_wishlist';
const listeners = new Set<() => void>();
let ids: Set<string> | null = null;

function load(): Set<string> {
  if (ids) return ids;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(KEY) : null;
    ids = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    ids = new Set();
  }
  return ids;
}

function persist() {
  try { localStorage.setItem(KEY, JSON.stringify([...load()])); } catch { /* ignore */ }
  listeners.forEach((fn) => fn());
}

export function useWishlist(id: string): [boolean, () => void] {
  const [, force] = useState(0);
  useEffect(() => {
    const fn = () => force((n) => n + 1);
    listeners.add(fn);
    return () => { listeners.delete(fn); };
  }, []);
  const saved = load().has(id);
  const toggle = useCallback(() => {
    const set = load();
    if (set.has(id)) set.delete(id); else set.add(id);
    persist();
  }, [id]);
  return [saved, toggle];
}

export function wishlistCount(): number {
  return load().size;
}

/** All saved ids (for the /saved page). */
export function wishlistIds(): string[] {
  return [...load()];
}

/** Subscribe to wishlist changes; returns unsubscribe. */
export function onWishlistChange(fn: () => void): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
