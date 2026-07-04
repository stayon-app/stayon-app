// Monthly earnings ledger — aggregates host reservations into a month-by-month
// history, from the host's first month to the current month. Earnings count
// confirmed + completed stays (what the host receives; StayOn takes 0%).

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { HostReservation } from './reservations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SINCE_KEY = '@stayon_host_since';

export interface MonthEarnings {
  key: string;          // "2026-05"
  label: string;        // "May 2026"
  monthShort: string;   // "May"
  year: number;
  earnings: number;     // host payout total (confirmed + completed)
  realised: number;     // completed only (already paid out)
  scheduled: number;    // confirmed only (upcoming payout)
  nights: number;
  bookings: number;
  reservations: HostReservation[];
}

/** Parse a "May 10, 2026" check-in into { year, monthIndex } (0-based month). */
export function parseResDate(s: string): { year: number; month: number } | null {
  if (!s) return null;
  const m = MONTHS.findIndex((mm) => s.startsWith(mm));
  const yearMatch = s.match(/(\d{4})/);
  if (m < 0 || !yearMatch) return null;
  return { year: Number(yearMatch[1]), month: m };
}

/** Persisted "hosting since" — set when the first listing is created. */
export async function getHostingSince(): Promise<{ year: number; month: number }> {
  try {
    const raw = await AsyncStorage.getItem(SINCE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { year: 2026, month: 0 }; // Jan 2026 by default
}

export async function setHostingSince(year: number, month: number): Promise<void> {
  try { await AsyncStorage.setItem(SINCE_KEY, JSON.stringify({ year, month })); } catch {}
}

/** Set hosting-since to now, only if not already set (first listing created). */
export async function markHostingStartedIfUnset(year: number, month: number): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(SINCE_KEY);
    if (!raw) await AsyncStorage.setItem(SINCE_KEY, JSON.stringify({ year, month }));
  } catch {}
}

const keyOf = (y: number, m: number) => `${y}-${String(m + 1).padStart(2, '0')}`;

/**
 * Build a descending list of months from `since` to `now` (inclusive). Each
 * month carries its earnings, nights, bookings and reservation list. Months
 * with no bookings are still included so the history reads continuously.
 */
export function buildMonthlyEarnings(
  reservations: HostReservation[],
  since: { year: number; month: number },
  now: { year: number; month: number }
): MonthEarnings[] {
  // Earning reservations grouped by month key.
  const byKey: Record<string, HostReservation[]> = {};
  reservations.forEach((r) => {
    if (r.status !== 'confirmed' && r.status !== 'completed') return;
    const d = parseResDate(r.checkIn);
    if (!d) return;
    const k = keyOf(d.year, d.month);
    (byKey[k] ||= []).push(r);
  });

  // Don't start later than the earliest actual booking.
  let startY = since.year, startM = since.month;
  Object.values(byKey).flat().forEach((r) => {
    const d = parseResDate(r.checkIn)!;
    if (d.year < startY || (d.year === startY && d.month < startM)) { startY = d.year; startM = d.month; }
  });

  const months: MonthEarnings[] = [];
  let y = now.year, m = now.month;
  // Walk backwards from now to start.
  while (y > startY || (y === startY && m >= startM)) {
    const k = keyOf(y, m);
    const list = byKey[k] ?? [];
    const realised = list.filter((r) => r.status === 'completed').reduce((s, r) => s + r.payout, 0);
    const scheduled = list.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.payout, 0);
    months.push({
      key: k,
      label: `${MONTHS[m]} ${y}`,
      monthShort: MONTHS[m],
      year: y,
      earnings: realised + scheduled,
      realised,
      scheduled,
      nights: list.reduce((s, r) => s + r.nights, 0),
      bookings: list.length,
      reservations: list,
    });
    // Step back one month.
    if (m === 0) { m = 11; y -= 1; } else { m -= 1; }
    // Safety stop (max 60 months).
    if (months.length >= 60) break;
  }
  return months;
}

/** Total across all months (lifetime). */
export function lifetimeTotal(months: MonthEarnings[]): number {
  return months.reduce((s, mo) => s + mo.earnings, 0);
}
