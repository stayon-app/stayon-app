// Thin HTTP client for the StayOn backend — the SAME central service the user
// app uses. This is what lets host ⇄ guest data flow (a published listing reaches
// guests; a guest's booking shows up as a host reservation). Token is cached in
// memory + AsyncStorage. Every call throws ApiError so callers can fail-safe to
// local data when the backend isn't running.

import AsyncStorage from '@react-native-async-storage/async-storage';

// Dev: backend on :4000. On a physical device replace 'localhost' with your
// machine's LAN IP. Override via EXPO_PUBLIC_API_BASE.
export const API_BASE =
  (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_API_BASE) ||
  'http://localhost:4000/v1';

const TOKEN_KEY = '@stayon_host_api_token';
let cachedToken: string | null = null;

export async function getToken(): Promise<string | null> {
  if (cachedToken) return cachedToken;
  cachedToken = await AsyncStorage.getItem(TOKEN_KEY);
  return cachedToken;
}
export async function setToken(t: string | null): Promise<void> {
  cachedToken = t;
  if (t) await AsyncStorage.setItem(TOKEN_KEY, t);
  else await AsyncStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

async function request(method: string, path: string, body?: any): Promise<any> {
  const token = await getToken();
  let res: Response;
  try {
    res = await fetch(API_BASE + path, {
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || { code: `HTTP_${res.status}`, message: 'Request failed' };
    throw new ApiError(e.code, e.message);
  }
  return json;
}

export const http = {
  get: (p: string) => request('GET', p),
  post: (p: string, b?: any) => request('POST', p, b),
  put: (p: string, b?: any) => request('PUT', p, b),
  del: (p: string) => request('DELETE', p),
};
