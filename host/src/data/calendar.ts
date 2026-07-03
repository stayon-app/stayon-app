// Per-listing availability — the dates a host has blocked. Persisted to
// AsyncStorage. Booked dates come from reservations (computed separately).

import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import type { HostReservation } from './reservations';

const KEY = '@stayon_host_blocked';
const PRICE_KEY = '@stayon_host_dateprices';

type BlockedMap = Record<string, string[]>; // listingId -> ['YYYY-MM-DD', …]
// listingId -> { 'YYYY-MM-DD': priceUSD } — per-night custom price overrides.
type PriceMap = Record<string, Record<string, number>>;

async function readAll(): Promise<BlockedMap> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p; }
  } catch {}
  return {};
}
async function writeAll(m: BlockedMap) {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(m)); } catch {}
}

export async function getBlocked(listingId: string): Promise<string[]> {
  const m = await readAll();
  return m[listingId] ?? [];
}

export async function toggleBlocked(listingId: string, date: string): Promise<string[]> {
  const m = await readAll();
  const cur = new Set(m[listingId] ?? []);
  if (cur.has(date)) cur.delete(date); else cur.add(date);
  m[listingId] = Array.from(cur);
  await writeAll(m);
  return m[listingId];
}

// ── Per-night custom prices (stored as canonical USD) ──────────────────────
async function readPrices(): Promise<PriceMap> {
  try {
    const raw = await AsyncStorage.getItem(PRICE_KEY);
    if (raw) { const p = JSON.parse(raw); if (p && typeof p === 'object') return p; }
  } catch {}
  return {};
}
async function writePrices(m: PriceMap) {
  try { await AsyncStorage.setItem(PRICE_KEY, JSON.stringify(m)); } catch {}
}

export async function getDatePrices(listingId: string): Promise<Record<string, number>> {
  const m = await readPrices();
  return m[listingId] ?? {};
}

/** Set (priceUSD) or clear (null) a custom price for one date. Returns the map. */
export async function setDatePrice(listingId: string, date: string, priceUSD: number | null): Promise<Record<string, number>> {
  const m = await readPrices();
  const cur = { ...(m[listingId] ?? {}) };
  if (priceUSD == null || priceUSD <= 0) delete cur[date];
  else cur[date] = priceUSD;
  m[listingId] = cur;
  await writePrices(m);
  return cur;
}

/** Set of 'YYYY-MM-DD' that are booked for a listing (confirmed/completed). */
export function bookedDates(reservations: HostReservation[], listingId: string): Set<string> {
  const out = new Set<string>();
  reservations
    .filter((r) => r.listingId === listingId && (r.status === 'confirmed' || r.status === 'completed'))
    .forEach((r) => {
      const start = dayjs(r.checkIn);
      const end = dayjs(r.checkOut);
      if (!start.isValid() || !end.isValid()) return;
      let cur = start;
      while (cur.isBefore(end)) { out.add(cur.format('YYYY-MM-DD')); cur = cur.add(1, 'day'); }
    });
  return out;
}
