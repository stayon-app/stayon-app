'use client';

// Controls the custom auth modal (phone/email + OTP + profile) so any component
// (Header, the host page, StayonBridge) can open it without prop drilling.

import { createContext, useContext, useState, useCallback } from 'react';

export type AuthIntent = 'guest' | 'host';
export type AuthStep = 'entry' | 'otp' | 'profile';

interface AuthModalValue {
  isOpen: boolean;
  intent: AuthIntent;
  step: AuthStep;
  openAuthModal: (intent?: AuthIntent, step?: AuthStep) => void;
  closeAuthModal: () => void;
  setStep: (step: AuthStep) => void;
}

const AuthModalContext = createContext<AuthModalValue | undefined>(undefined);

export function AuthModalProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [intent, setIntent] = useState<AuthIntent>('guest');
  const [step, setStepState] = useState<AuthStep>('entry');

  const openAuthModal = useCallback((nextIntent: AuthIntent = 'guest', nextStep: AuthStep = 'entry') => {
    setIntent(nextIntent);
    setStepState(nextStep);
    setIsOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => setIsOpen(false), []);
  const setStep = useCallback((nextStep: AuthStep) => setStepState(nextStep), []);

  return (
    <AuthModalContext.Provider value={{ isOpen, intent, step, openAuthModal, closeAuthModal, setStep }}>
      {children}
    </AuthModalContext.Provider>
  );
}

export function useAuthModal() {
  const ctx = useContext(AuthModalContext);
  if (!ctx) throw new Error('useAuthModal must be used within AuthModalProvider');
  return ctx;
}
