'use client';

// Bridges Clerk → the StayOn backend. After Clerk sign-in we exchange the Clerk
// session token for a StayOn session (POST /auth/clerk), then use StayOn tokens
// for all backend calls (quote/book/trips). Quote is public; booking needs auth.

export const API = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:4000/v1';

const ACCESS = 'stayon_access_token';
const REFRESH = 'stayon_refresh_token';

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

const getAccess = () => (typeof window === 'undefined' ? null : localStorage.getItem(ACCESS));
const getRefresh = () => (typeof window === 'undefined' ? null : localStorage.getItem(REFRESH));
export const hasStayonSession = () => !!getAccess();
export function clearStayonSession() {
  localStorage.removeItem(ACCESS);
  localStorage.removeItem(REFRESH);
}
function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS, access);
  localStorage.setItem(REFRESH, refresh);
}

/** Exchange a Clerk session token for a StayOn session. Returns true on success. */
export async function exchangeClerkToken(clerkToken: string): Promise<boolean> {
  try {
    const res = await fetch(`${API}/auth/clerk`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ clerkToken }),
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

/**
 * Ensure a StayOn session exists. If not, mint one from the current Clerk token.
 * @param getClerkToken – Clerk's useAuth().getToken
 */
export async function ensureStayonSession(
  getClerkToken: () => Promise<string | null>,
): Promise<boolean> {
  if (hasStayonSession()) return true;
  const clerkToken = await getClerkToken();
  if (!clerkToken) return false;
  return exchangeClerkToken(clerkToken);
}

async function tryRefresh(): Promise<boolean> {
  const rt = getRefresh();
  if (!rt) return false;
  try {
    const res = await fetch(`${API}/auth/refresh`, {
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

async function authed(method: string, path: string, body?: unknown, retry = false): Promise<any> {
  const res = await fetch(API + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getAccess() ? { Authorization: `Bearer ${getAccess()}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 && !retry && (await tryRefresh())) {
    return authed(method, path, body, true);
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || { code: `HTTP_${res.status}`, message: 'Request failed' };
    throw new ApiError(e.code, e.message);
  }
  return json;
}

// Public (no auth) — quote is open
export async function getQuote(listingId: string, qs: string): Promise<any> {
  const res = await fetch(`${API}/listings/${listingId}/quote?${qs}`, { cache: 'no-store' });
  if (!res.ok) throw new ApiError('QUOTE', 'Could not get a price');
  return res.json();
}

// Authed — guest
export const stayon = {
  book: (payload: { listingId: string; checkIn: string; checkOut: string; guests: number }) =>
    authed('POST', '/bookings', payload),
  myBookings: (): Promise<{ items: any[] }> => authed('GET', '/bookings'),
};

// Authed — host
export const host = {
  myListings: (): Promise<{ items: any[] }> => authed('GET', '/listings'),
  createListing: (data: Record<string, unknown>) =>
    authed('POST', '/listings', { ...data, publish: true }),
  reservations: (): Promise<{ items: any[] }> => authed('GET', '/reservations'),
  reservationAction: (id: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') =>
    authed('POST', `/reservations/${id}/${action}`),
};
