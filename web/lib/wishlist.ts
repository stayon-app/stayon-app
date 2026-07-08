'use client';

// Wishlist store. localStorage gives instant UI and covers signed-out users.
// When signed in, the backend `wishlists` table is the source of truth:
//   • toggles write through to the server (add/remove)
//   • on login, local (anonymous) saves are pushed up, then the store is set to
//     the UNION of server + local so nothing is ever lost and both surfaces
//     (web + app) converge — no duplicate, no mismatch.
import { useEffect, useState, useCallback } from 'react';
import { hasStayonSession, stayon } from './stayonClient';

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
    const nowSaved = !set.has(id);
    if (nowSaved) set.add(id); else set.delete(id);
    persist();
    // Write through to the backend when signed in (best-effort; reconciled on
    // next sync). Signed-out users stay purely local.
    if (hasStayonSession()) {
      (nowSaved ? stayon.wishlist.add(id) : stayon.wishlist.remove(id)).catch(() => { /* reconciled later */ });
    }
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

// Prevent overlapping syncs.
let syncing = false;

/**
 * Reconcile with the backend `wishlists` table. Call after a StayOn session is
 * established (login) and it's safe to call anytime signed in. Lossless:
 * pushes local-only saves to the server, then sets the store to the union so
 * web + app agree. No-op when signed out.
 */
export async function syncWishlist(): Promise<void> {
  if (typeof window === 'undefined' || !hasStayonSession() || syncing) return;
  syncing = true;
  try {
    const res = await stayon.wishlist.list();
    const serverIds = new Set((res.items || []).map((r) => r.listing_id));
    const localIds = load();
    // Push local-only (anonymous) saves up so they're not lost.
    const toPush = [...localIds].filter((x) => !serverIds.has(x));
    await Promise.all(toPush.map((x) => stayon.wishlist.add(x).catch(() => {})));
    // Authoritative set = union(server, local).
    ids = new Set([...serverIds, ...localIds]);
    persist();
  } catch {
    /* offline / not ready — keep local; will reconcile next time */
  } finally {
    syncing = false;
  }
}
