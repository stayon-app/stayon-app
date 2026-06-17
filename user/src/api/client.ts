// Thin HTTP client for the StayOn backend (the central service that connects
// User, Host and Ops). All app data calls go through here. Tokens are cached in
// memory + SecureStore (AsyncStorage on web). Every call is awaitable and throws
// ApiError on failure so callers can fail-safe to local data while the migration
// is in progress.

import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

// Dev: web app (:8085) → backend (:4000). On a physical device, replace
// 'localhost' with your machine's LAN IP. Override via EXPO_PUBLIC_API_BASE.
export const API_BASE =
  (typeof process !== 'undefined' && (process as any)?.env?.EXPO_PUBLIC_API_BASE) ||
  'http://localhost:4000/v1';

// ---------------------------------------------------------------------------
// Secure storage helpers (SecureStore on native, AsyncStorage on web)
// ---------------------------------------------------------------------------
const ACCESS_TOKEN_KEY = '@stayon_access_token';
const REFRESH_TOKEN_KEY = '@stayon_refresh_token';

async function secureGet(key: string): Promise<string | null> {
  if (Platform.OS === 'web') {
    return AsyncStorage.getItem(key);
  }
  return SecureStore.getItemAsync(key);
}

async function secureSet(key: string, value: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.setItem(key, value);
  } else {
    await SecureStore.setItemAsync(key, value);
  }
}

async function secureDelete(key: string): Promise<void> {
  if (Platform.OS === 'web') {
    await AsyncStorage.removeItem(key);
  } else {
    await SecureStore.deleteItemAsync(key);
  }
}

// ---------------------------------------------------------------------------
// In-memory token cache
// ---------------------------------------------------------------------------
let cachedAccessToken: string | null = null;
let cachedRefreshToken: string | null = null;

/** Get the current access token (memory → secure store). */
export async function getToken(): Promise<string | null> {
  if (cachedAccessToken) return cachedAccessToken;
  cachedAccessToken = await secureGet(ACCESS_TOKEN_KEY);
  return cachedAccessToken;
}

/** Get the current refresh token (memory → secure store). */
export async function getRefreshToken(): Promise<string | null> {
  if (cachedRefreshToken) return cachedRefreshToken;
  cachedRefreshToken = await secureGet(REFRESH_TOKEN_KEY);
  return cachedRefreshToken;
}

/** Store both access and refresh tokens. */
export async function setTokens(accessToken: string, refreshToken: string): Promise<void> {
  cachedAccessToken = accessToken;
  cachedRefreshToken = refreshToken;
  await secureSet(ACCESS_TOKEN_KEY, accessToken);
  await secureSet(REFRESH_TOKEN_KEY, refreshToken);
}

/** Clear all stored tokens (logout). */
export async function clearTokens(): Promise<void> {
  cachedAccessToken = null;
  cachedRefreshToken = null;
  await secureDelete(ACCESS_TOKEN_KEY);
  await secureDelete(REFRESH_TOKEN_KEY);
}

/**
 * Backward-compatible setToken. Sets or clears the access token only.
 * Prefer setTokens() / clearTokens() for new code.
 */
export async function setToken(t: string | null): Promise<void> {
  cachedAccessToken = t;
  if (t) await secureSet(ACCESS_TOKEN_KEY, t);
  else await secureDelete(ACCESS_TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// ApiError
// ---------------------------------------------------------------------------
export class ApiError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'ApiError';
  }
}

// ---------------------------------------------------------------------------
// Core request helper with automatic token refresh
// ---------------------------------------------------------------------------
async function request(
  method: string,
  path: string,
  body?: any,
  _isRetry = false,
): Promise<any> {
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

  // --- 401: attempt a single silent refresh ---
  if (res.status === 401 && !_isRetry) {
    const refreshed = await tryRefreshToken();
    if (refreshed) {
      return request(method, path, body, true); // retry once
    }
  }

  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || { code: `HTTP_${res.status}`, message: 'Request failed' };
    throw new ApiError(e.code, e.message);
  }
  return json;
}

/** Attempt to refresh the access token using the stored refresh token. */
async function tryRefreshToken(): Promise<boolean> {
  const rt = await getRefreshToken();
  if (!rt) return false;
  try {
    const res = await fetch(API_BASE + '/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: rt }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    if (json.accessToken && json.refreshToken) {
      await setTokens(json.accessToken, json.refreshToken);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export const http = {
  get: (p: string) => request('GET', p),
  post: (p: string, b?: any) => request('POST', p, b),
  put: (p: string, b?: any) => request('PUT', p, b),
  del: (p: string) => request('DELETE', p),
};
