'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  authApi,
  clearTokens,
  getAccessToken,
  type AuthUser,
  type SendOtpResult,
  type VerifyOtpResult,
} from '@/lib/authClient';

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  sendOtp: (phone: string, countryCode?: string) => Promise<SendOtpResult>;
  verifyOtp: (phone: string, code: string) => Promise<VerifyOtpResult>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore session on load
  useEffect(() => {
    (async () => {
      if (getAccessToken()) {
        try {
          setUser(await authApi.me());
        } catch {
          clearTokens();
        }
      }
      setLoading(false);
    })();
  }, []);

  const sendOtp = useCallback(
    (phone: string, countryCode?: string) => authApi.sendOtp(phone, countryCode),
    [],
  );

  const verifyOtp = useCallback(async (phone: string, code: string) => {
    const res = await authApi.verifyOtp(phone, code);
    setUser(res.user);
    return res;
  }, []);

  const updateProfile = useCallback(async (data: { name?: string; email?: string }) => {
    const updated = await authApi.updateProfile(data);
    setUser(updated);
  }, []);

  const logout = useCallback(async () => {
    await authApi.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        sendOtp,
        verifyOtp,
        updateProfile,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
