'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ensureStayonSession, clearStayonSession, hasStayonSession } from '@/lib/stayonClient';
import { syncWishlist } from '@/lib/wishlist';

// Keeps the StayOn backend session in lockstep with Clerk: mint one when the user
// signs in, drop it when they sign out. Also reconciles the wishlist with the
// backend once a session exists. Mounted once at the app root.
export function StayonBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      (async () => {
        if (!hasStayonSession()) await ensureStayonSession(() => getToken());
        syncWishlist(); // lossless merge local ↔ backend
      })();
    } else if (hasStayonSession()) {
      clearStayonSession();
    }
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
