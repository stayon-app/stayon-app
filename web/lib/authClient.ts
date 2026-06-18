'use client';

// Browser-side client for the shared StayOn auth endpoints (the SAME backend the
// mobile app uses). Tokens live in localStorage; access tokens auto-refresh on 401.

import type { Listing } from './types';

export const CLIENT_API_BASE =
  process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/v1';

const ACCESS_KEY = 'stayon_access_token';
const REFRESH_KEY = 'stayon_refresh_token';

export interface AuthUser {
  id: string;
  phone?: string;
  email?: string | null;
  name?: string;
  countryCode?: string;
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// ── token storage ──────────────────────────────────────────────────────────
export const getAccessToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem(ACCESS_KEY);
export const getRefreshToken = () =>
  typeof window === 'undefined' ? null : localStorage.getItem(REFRESH_KEY);

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access);
  localStorage.setItem(REFRESH_KEY, refresh);
}
export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

// ── core request with one silent refresh on 401 ────────────────────────────
async function request(method: string, path: string, body?: unknown, isRetry = false): Promise<any> {
  const token = getAccessToken();
  let res: Response;
  try {
    res = await fetch(CLIENT_API_BASE + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e: any) {
    throw new ApiError('NETWORK', e?.message || 'Network request failed');
  }

  if (res.status === 401 && !isRetry && (await tryRefresh())) {
    return request(method, path, body, true);
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || { code: `HTTP_${res.status}`, message: 'Request failed' };
    throw new ApiError(e.code, e.message);
  }
  return json;
}

async function tryRefresh(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(CLIENT_API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.accessToken && json.refreshToken) {
      setTokens(json.accessToken, json.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

// ── auth API (mirrors the mobile app's Api.auth) ───────────────────────────
export interface SendOtpResult {
  message: string;
  expiresIn: number;
  devCode?: string;
}
export interface VerifyOtpResult {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
  isNewUser: boolean;
}

export const authApi = {
  sendOtp: (phone: string, countryCode?: string): Promise<SendOtpResult> =>
    request('POST', '/auth/send-otp', { phone, countryCode }),

  verifyOtp: async (phone: string, code: string): Promise<VerifyOtpResult> => {
    const res = (await request('POST', '/auth/verify-otp', { phone, code })) as VerifyOtpResult;
    setTokens(res.accessToken, res.refreshToken);
    return res;
  },

  updateProfile: (data: { name?: string; email?: string }): Promise<AuthUser> =>
    request('PUT', '/me', data),

  me: (): Promise<AuthUser> => request('GET', '/me'),

  logout: async (): Promise<void> => {
    const rt = getRefreshToken();
    try {
      if (rt) await request('POST', '/auth/logout', { refreshToken: rt });
    } catch {
      /* best-effort */
    }
    clearTokens();
  },
};

// ── authenticated data calls (for booking etc. — slice 2b) ─────────────────
export const dataApi = {
  myBookings: (): Promise<{ items: any[] }> => request('GET', '/bookings'),
  quote: (id: string, qs: string): Promise<any> => request('GET', `/listings/${id}/quote?${qs}`),
  book: (payload: any): Promise<any> => request('POST', '/bookings', payload),
};
export type { Listing };
