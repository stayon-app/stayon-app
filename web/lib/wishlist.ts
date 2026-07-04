'use client';

// Wishlist hook — keeps the [saved, toggle] signature the cards use, but backed
// by the account wishlist on the backend (via WishlistProvider) instead of
// localStorage, so saves sync across devices and into the mobile app.
// Signed-out users get the login prompt on first toggle (provider handles it).

import { useCallback } from 'react';
import { useWishlist as useWishlistCtx } from '@/components/WishlistProvider';

export function useWishlist(id: string): [boolean, () => void] {
  const { ids, toggle } = useWishlistCtx();
  const saved = ids.has(id);
  const doToggle = useCallback(() => { void toggle(id); }, [id, toggle]);
  return [saved, doToggle];
}

export function useWishlistCount(): number {
  return useWishlistCtx().ids.size;
}
