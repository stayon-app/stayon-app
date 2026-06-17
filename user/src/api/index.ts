// Typed endpoint wrappers + session bootstrap for the StayOn backend.
// Domains mirror backend/src/index.js. Import { Api } from '../api'.

import { http, setTokens, clearTokens, getToken, getRefreshToken } from './client';

/** Ensure we have a backend session. If we already have a token, skip. */
export async function ensureSession(_name?: string): Promise<string | null> {
  const existing = await getToken();
  if (existing) return existing;
  // No session — caller should go through the OTP auth flow.
  return null;
}

export async function signOut() {
  try {
    const rt = await getRefreshToken();
    if (rt) await http.post('/auth/logout', { refreshToken: rt });
  } catch { /* best-effort */ }
  await clearTokens();
}

export const Api = {
  auth: {
    /** Send an OTP to the given phone number. */
    sendOtp: (phone: string, countryCode: string) =>
      http.post('/auth/send-otp', { phone, countryCode }),
    /** Verify an OTP code. Returns tokens + user. */
    verifyOtp: (phone: string, code: string) =>
      http.post('/auth/verify-otp', { phone, code }),
    /** Refresh the access token using a refresh token. */
    refresh: (refreshToken: string) =>
      http.post('/auth/refresh', { refreshToken }),
    /** Logout — invalidate the refresh token server-side. */
    logout: () => signOut(),
    /** Get the current authenticated user. */
    me: () => http.get('/me'),
    /** Update the current user's profile (name/email). */
    updateProfile: (data: { name?: string; email?: string }) => http.put('/me', data),
    ensureSession,
    signOut,
  },
  listings: {
    create: (data: any) => http.post('/listings', data),
    update: (id: string, data: any) => http.put(`/listings/${id}`, data),
    submit: (id: string) => http.post(`/listings/${id}/submit`),
    mine: () => http.get('/listings'),
    get: (id: string) => http.get(`/listings/${id}`),
    setCalendar: (id: string, days: any[]) => http.put(`/listings/${id}/calendar`, { days }),
    getCalendar: (id: string) => http.get(`/listings/${id}/calendar`),
    setPricing: (id: string, pricing: any) => http.put(`/listings/${id}/pricing`, pricing),
  },
  search: (params: Record<string, string | number> = {}) =>
    http.get('/search?' + new URLSearchParams(params as any).toString()),
  featureFlags: () => http.get('/feature-flags'),
  bookings: {
    create: (data: any) => http.post('/bookings', data),
    mine: () => http.get('/bookings'),
    cancel: (id: string, reason: string) => http.post(`/bookings/${id}/cancel`, { reason }),
    cancelByCode: (code: string) => http.post(`/bookings/by-code/${code}/cancel`),
  },
  reservations: {
    mine: () => http.get('/reservations'),
    act: (id: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') =>
      http.post(`/reservations/${id}/${action}`),
    actByCode: (code: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') =>
      http.post(`/reservations/by-code/${code}/${action}`),
  },
  threads: {
    open: (listingId: string) => http.post('/threads', { listingId }),
    mine: () => http.get('/threads'),
    messages: (id: string) => http.get(`/threads/${id}/messages`),
    send: (id: string, text: string) => http.post(`/threads/${id}/messages`, { text }),
  },
  reviews: {
    create: (data: any) => http.post('/reviews', data),
    forHost: () => http.get('/reviews'),
    respond: (id: string, response: string) => http.post(`/reviews/${id}/respond`, { response }),
    reviewGuest: (bookingCode: string, rating: number, text: string) => http.post('/guest-reviews', { bookingCode, rating, text }),
  },
  reels: {
    create: (data: any) => http.post('/reels', data),
    feed: () => http.get('/reels'),
  },
  reports: { create: (data: any) => http.post('/reports', data) },
  ai: {
    classifyPhotos: (images: Array<{ id: string; b64: string; mediaType?: string }>) =>
      http.post('/ai/classify-photos', { images }),
  },
  media: {
    upload: (b64: string, contentType = 'image/jpeg') => http.post('/media/upload', { b64, contentType }),
    presign: (contentType: string) => http.post('/media/presign', { contentType }),
  },
  hosts: {
    // public host profile + their reviews + the stays they manage
    profile: (id: string) => http.get(`/hosts/${id}`),
  },
  identity: { submit: (data: any) => http.post('/identity/submit', data) },
  wishlists: {
    mine: () => http.get('/wishlists'),
    add: (listingId: string) => http.post('/wishlists', { listingId }),
    remove: (listingId: string) => http.del(`/wishlists/${listingId}`),
  },
  earnings: () => http.get('/earnings'),
  payouts: () => http.get('/payouts'),
  payoutChange: (data: any) => http.post('/payout-method/change-request', data),
  payoutConnect: () => http.post('/payout-account/connect'),
  notifications: () => http.get('/notifications'),
  markNotificationsRead: () => http.post('/notifications/read'),
  push: { register: (token: string) => http.post('/push/register', { token }) },
};

export { ApiError, API_BASE } from './client';
