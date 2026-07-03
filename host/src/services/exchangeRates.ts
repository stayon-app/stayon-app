// Live foreign-exchange rates. Prices are stored canonical in USD; these rates
// drive every conversion to a viewer's currency. Rates are fetched from a free,
// keyless endpoint, cached to AsyncStorage, and fall back to the static sample
// rates baked into utils/currency.ts when the network is unavailable.

import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = '@stayon_fx_rates';
const TTL_MS = 12 * 60 * 60 * 1000; // refresh at most twice a day
// USD-based rates; response shape: { result, rates: { INR: 83.x, ... } }
const ENDPOINT = 'https://open.er-api.com/v6/latest/USD';

export interface CachedRates {
  rates: Record<string, number>;
  ts: number; // epoch ms when fetched
}

export async function getCachedRates(): Promise<CachedRates | null> {
  try {
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && p.rates && typeof p.ts === 'number') return p;
    }
  } catch {}
  return null;
}

export function isStale(c: CachedRates | null): boolean {
  return !c || Date.now() - c.ts > TTL_MS;
}

/** Fetch fresh USD-based rates. Returns null on any failure (caller falls back). */
export async function fetchLiveRates(): Promise<CachedRates | null> {
  try {
    const res = await fetch(ENDPOINT);
    const json = await res.json();
    const rates = json?.rates;
    if ((json?.result === 'success' || rates) && rates && typeof rates === 'object') {
      const entry: CachedRates = { rates, ts: Date.now() };
      AsyncStorage.setItem(CACHE_KEY, JSON.stringify(entry)).catch(() => {});
      return entry;
    }
  } catch {}
  return null;
}
