// Thin, FAIL-SAFE client for the StayOn backend (the same central API the mobile
// apps use). Every call swallows errors and returns null on failure, so the site
// keeps working from localStorage whether or not the backend is running.
//
// Point at a backend by setting VITE_API_BASE (e.g. http://localhost:4000/v1).
// Defaults to localhost:4000 — if nothing is listening, calls fail fast & silently.
const BASE: string =
  ((import.meta as any).env?.VITE_API_BASE as string) || 'http://localhost:4000/v1';

const TOKEN_KEY = 'stayon_api_token';
let token: string | null = null;
try { token = localStorage.getItem(TOKEN_KEY); } catch { /* storage unavailable */ }

export function setToken(t: string | null) {
  token = t;
  try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* ignore */ }
}

async function req(method: string, path: string, body?: unknown): Promise<any> {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) throw new Error(json?.error?.message || `HTTP ${res.status}`);
  return json;
}

// All methods are best-effort: they never throw, returning null when the backend
// is unreachable so the caller continues with its local behaviour.
export const api = {
  base: BASE,
  // Is the backend reachable? (fast timeout, no auth) — drives the status pill.
  async health(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2500);
      const res = await fetch(BASE.replace(/\/v1\/?$/, '') + '/health', { signal: ctrl.signal });
      clearTimeout(t);
      return res.ok;
    } catch { return false; }
  },
  async loginPhone(identifier: string, name: string, countryCode?: string) {
    try {
      const j = await req('POST', '/auth/login', { phone: identifier, name, countryCode });
      if (j?.accessToken) setToken(j.accessToken);
      return j;
    } catch { return null; }
  },
  async submitIdentity(p: { legalName: string; idType: string; idNumber: string; dob?: string; country?: string; docFront?: string; docBack?: string }) {
    try { return await req('POST', '/identity/submit', p); } catch { return null; }
  },
  async publishListing(p: Record<string, unknown>) {
    try { return await req('POST', '/listings', { ...p, publish: true }); } catch { return null; }
  },
  async createBooking(p: { listingId: string; checkIn: string; checkOut: string; guests: number; code?: string }) {
    try { return await req('POST', '/bookings', p); } catch { return null; }
  },
};
