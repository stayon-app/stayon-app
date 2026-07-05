'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ensureStayonSession, clearStayonSession, hasStayonSession } from '@/lib/stayonClient';

// Keeps the StayOn backend session in lockstep with Clerk: mint one when the user
// signs in, drop it when they sign out. Mounted once at the app root.
export function StayonBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      if (!hasStayonSession()) {
        ensureStayonSession(() => getToken());
      }
    } else if (hasStayonSession()) {
      clearStayonSession();
    }
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
