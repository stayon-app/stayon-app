// Host-app API surface against the shared StayOn backend. Mirrors the user app's
// client so both sides speak to the same database. Callers wrap these in
// try/catch and fall back to local AsyncStorage when the backend is offline.
import { http, setToken } from './client';

export { setToken, getToken, API_BASE, ApiError } from './client';

export const Api = {
  auth: {
    // Logs the host in and caches the session token for subsequent calls.
    login: async (phone: string, name?: string, countryCode?: string) => {
      const r = await http.post('/auth/login', { phone, name, countryCode });
      if (r?.accessToken) await setToken(r.accessToken);
      return r;
    },
    me: () => http.get('/me'),
  },
  listings: {
    create: (data: any) => http.post('/listings', data),       // publish reaches guests
    update: (id: string, data: any) => http.put(`/listings/${id}`, data),
    mine: () => http.get('/listings'),
    setCalendar: (id: string, days: any[]) => http.put(`/listings/${id}/calendar`, { days }),
    setPricing: (id: string, pricing: any) => http.put(`/listings/${id}/pricing`, pricing),
  },
  reservations: {
    mine: () => http.get('/reservations'),                     // guests' bookings land here
    act: (id: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') =>
      http.post(`/reservations/${id}/${action}`),
    actByCode: (code: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') =>
      http.post(`/reservations/by-code/${code}/${action}`),
  },
  threads: {
    mine: () => http.get('/threads'),
    messages: (id: string) => http.get(`/threads/${id}/messages`),
    send: (id: string, text: string) => http.post(`/threads/${id}/messages`, { text }),
  },
  reviews: {
    forHost: () => http.get('/reviews'),
    respond: (id: string, response: string) => http.post(`/reviews/${id}/respond`, { response }),
    reviewGuest: (bookingCode: string, rating: number, text: string) =>
      http.post('/guest-reviews', { bookingCode, rating, text }),
  },
  identity: { submit: (data: any) => http.post('/identity/submit', data) },
  earnings: () => http.get('/earnings'),
  payouts: () => http.get('/payouts'),
  notifications: () => http.get('/notifications'),
};
