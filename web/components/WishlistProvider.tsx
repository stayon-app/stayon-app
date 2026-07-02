'use client';

// Holds the signed-in user's saved listing ids so hearts render instantly on
// any card. Loads once after Clerk sign-in; toggles optimistically.

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { ensureStayonSession, stayon } from '@/lib/stayonClient';

interface WishlistValue {
  ids: Set<string>;
  ready: boolean;
  toggle: (listingId: string) => Promise<void>;
}

const WishlistContext = createContext<WishlistValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const [ids, setIds] = useState<Set<string>>(new Set());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setIds(new Set());
      setReady(true);
      return;
    }
    (async () => {
      try {
        if (await ensureStayonSession(() => getToken())) {
          const res = await stayon.wishlists();
          setIds(new Set((res.items || []).map((w) => w.listing_id)));
        }
      } catch {
        /* non-fatal — hearts just start empty */
      } finally {
        setReady(true);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  const toggle = useCallback(
    async (listingId: string) => {
      if (!isSignedIn) {
        openSignIn();
        return;
      }
      const saved = ids.has(listingId);
      // optimistic flip
      setIds((prev) => {
        const next = new Set(prev);
        if (saved) next.delete(listingId);
        else next.add(listingId);
        return next;
      });
      try {
        await ensureStayonSession(() => getToken());
        if (saved) await stayon.wishlistRemove(listingId);
        else await stayon.wishlistAdd(listingId);
      } catch {
        // revert on failure
        setIds((prev) => {
          const next = new Set(prev);
          if (saved) next.add(listingId);
          else next.delete(listingId);
          return next;
        });
      }
    },
    [ids, isSignedIn, getToken, openSignIn],
  );

  return (
    <WishlistContext.Provider value={{ ids, ready, toggle }}>{children}</WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within WishlistProvider');
  return ctx;
}
