// Typed endpoint wrappers + session bootstrap for the StayOn backend.
// Domains mirror backend/src/index.js. Import { Api } from '../api'.

import { http, setToken, getToken } from './client';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PHONE_KEY = '@stayon_api_phone';

/** Ensure we have a backend session. Reuses a device-stable phone so the same
 * user maps to the same backend account across launches. Safe to call often. */
export async function ensureSession(name?: string): Promise<string | null> {
  const existing = await getToken();
  if (existing) return existing;
  let phone = await AsyncStorage.getItem(PHONE_KEY);
  if (!phone) {
    // device-stable pseudo-phone for the dev migration
    phone = '+10' + Math.floor(1000000000 + Math.random() * 8999999999);
    await AsyncStorage.setItem(PHONE_KEY, phone);
  }
  const r = await http.post('/auth/login', { phone, name });
  await setToken(r.accessToken);
  return r.accessToken;
}

export async function signOut() {
  await setToken(null);
}

export const Api = {
  auth: {
    login: (phone: string, name?: string, countryCode?: string) =>
      http.post('/auth/login', { phone, name, countryCode }),
    me: () => http.get('/me'),
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
  notifications: () => http.get('/notifications'),
  markNotificationsRead: () => http.post('/notifications/read'),
};

export { ApiError, API_BASE } from './client';
