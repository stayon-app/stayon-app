'use client';

import { useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import { ensureStayonSession, clearStayonSession, hasStayonSession, consumeIsNewUser } from '@/lib/stayonClient';
import { useAuthModal } from './AuthModalProvider';

// Keeps the StayOn backend session in lockstep with Clerk: mint one when the user
// signs in, drop it when they sign out. Mounted once at the app root. Also the
// single place that decides whether a fresh sign-in needs the "set up your
// profile" step — covers the inline phone/email flow and the OAuth-redirect
// round trip (which can't carry modal state across the navigation) alike.
export function StayonBridge() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { intent, openAuthModal, closeAuthModal } = useAuthModal();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) {
      if (!hasStayonSession()) {
        ensureStayonSession(() => getToken()).then((ok) => {
          if (!ok) return;
          if (consumeIsNewUser()) openAuthModal(intent, 'profile');
          else closeAuthModal();
        });
      }
    } else if (hasStayonSession()) {
      clearStayonSession();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, getToken]);

  return null;
}
