// Host analytics — payouts schedule + performance trends, all derived from
// reservations (no separate store). Amounts are USD; format at the view layer.

import type { HostReservation } from './reservations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseDate(s: string): Date | null {
  const m = MONTHS.findIndex((x) => s.startsWith(x));
  const dm = s.match(/\b(\d{1,2}),/);
  const ym = s.match(/(\d{4})/);
  if (m < 0 || !dm || !ym) return null;
  return new Date(Number(ym[1]), m, Number(dm[1]));
}

// ── Payouts ────────────────────────────────────────────────────────────────
export interface Payout {
  id: string;
  guestName: string;
  guestAvatar?: string;
  listingTitle: string;
  amount: number;       // host payout (USD)
  date: string;         // the check-out display date
  releaseLabel: string; // e.g. "Released 24h after check-in"
  status: 'scheduled' | 'paid';
}

export function buildPayouts(reservations: HostReservation[]): { paid: Payout[]; scheduled: Payout[]; nextPayout: Payout | null } {
  const mk = (r: HostReservation, status: 'scheduled' | 'paid'): Payout => ({
    id: r.id, guestName: r.guestName, guestAvatar: r.guestAvatar, listingTitle: r.listingTitle,
    amount: r.payout, date: status === 'paid' ? r.checkOut : r.checkIn,
    releaseLabel: status === 'paid' ? `Paid · ${r.checkOut}` : `Releases ~24h after ${r.checkIn}`,
    status,
  });
  const paid = reservations.filter((r) => r.status === 'completed').map((r) => mk(r, 'paid'));
  const scheduled = reservations.filter((r) => r.status === 'confirmed')
    .map((r) => ({ r, d: parseDate(r.checkIn) }))
    .sort((a, b) => (a.d?.getTime() ?? 0) - (b.d?.getTime() ?? 0))
    .map(({ r }) => mk(r, 'scheduled'));
  return { paid, scheduled, nextPayout: scheduled[0] ?? null };
}

// ── Day-wise & month-wise earnings ───────────────────────────────────────────
export interface DayEarning {
  date: Date;
  label: string;        // "Jun 5, 2026"
  weekday: string;      // "Fri"
  amount: number;       // total host payout that day (USD)
  items: { guestName: string; listingTitle: string; nights: number; amount: number }[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** One entry per earning day (payout releases ~check-in), newest first. */
export function buildDailyEarnings(reservations: HostReservation[]): DayEarning[] {
  const earning = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const map = new Map<string, DayEarning>();
  earning.forEach((r) => {
    const d = parseDate(r.checkIn) ?? parseDate(r.checkOut);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const e = map.get(key) ?? {
      date: d, label: `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`,
      weekday: WEEKDAYS[d.getDay()], amount: 0, items: [],
    };
    e.amount += r.payout;
    e.items.push({ guestName: r.guestName, listingTitle: r.listingTitle, nights: r.nights, amount: r.payout });
    map.set(key, e);
  });
  return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
}

export interface MonthEarning {
  key: string;          // "2026-5"
  label: string;        // "Jun 2026"
  short: string;        // "Jun"
  amount: number;
  bookings: number;
  nights: number;
  best: boolean;        // highest-earning month
  sortIdx: number;      // y*12+m for ordering
}

/** One entry per month that earned, newest first; the top month is flagged. */
export function buildMonthlyEarnings(reservations: HostReservation[]): MonthEarning[] {
  const earning = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const map = new Map<string, MonthEarning>();
  earning.forEach((r) => {
    const d = parseDate(r.checkIn) ?? parseDate(r.checkOut);
    if (!d) return;
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const e = map.get(key) ?? {
      key, label: `${MONTHS[d.getMonth()]} ${d.getFullYear()}`, short: MONTHS[d.getMonth()],
      amount: 0, bookings: 0, nights: 0, best: false, sortIdx: d.getFullYear() * 12 + d.getMonth(),
    };
    e.amount += r.payout; e.bookings += 1; e.nights += r.nights;
    map.set(key, e);
  });
  const arr = [...map.values()].sort((a, b) => b.sortIdx - a.sortIdx);
  const top = arr.reduce((mx, m) => (m.amount > mx ? m.amount : mx), 0);
  arr.forEach((m) => { m.best = top > 0 && m.amount === top; });
  return arr;
}

/** Lifetime + this-month totals for the earnings hero. */
export function earningsSummary(reservations: HostReservation[], now: Date) {
  const months = buildMonthlyEarnings(reservations);
  const lifetime = months.reduce((s, m) => s + m.amount, 0);
  const thisKey = `${now.getFullYear()}-${now.getMonth()}`;
  const thisMonth = months.find((m) => m.key === thisKey)?.amount ?? 0;
  const best = months.reduce((b, m) => (!b || m.amount > b.amount ? m : b), null as MonthEarning | null);
  return { lifetime, thisMonth, best, monthsCount: months.length };
}

// ── Trends ─────────────────────────────────────────────────────────────────
export interface Trends {
  occupancy: number;      // % of the next 30 nights that are booked
  adr: number;            // average daily rate (USD) over earning stays
  repeatRate: number;     // % of guests who booked more than once
  avgStay: number;        // average nights per stay
  totalNights: number;
  totalBookings: number;
  uniqueGuests: number;
  monthly: { label: string; value: number }[]; // last 6 months earnings
  momPct: number | null;  // this vs last month earnings
}

export function buildTrends(reservations: HostReservation[], now: Date): Trends {
  const earning = reservations.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const totalNights = earning.reduce((s, r) => s + r.nights, 0);
  const totalBookings = earning.length;
  const adr = totalNights ? Math.round(earning.reduce((s, r) => s + r.subtotal, 0) / totalNights) : 0;
  const avgStay = totalBookings ? Math.round((totalNights / totalBookings) * 10) / 10 : 0;

  // Repeat guests
  const counts: Record<string, number> = {};
  earning.forEach((r) => { counts[r.guestName] = (counts[r.guestName] ?? 0) + 1; });
  const uniqueGuests = Object.keys(counts).length;
  const repeats = Object.values(counts).filter((n) => n > 1).length;
  const repeatRate = uniqueGuests ? Math.round((repeats / uniqueGuests) * 100) : 0;

  // Occupancy over the next 30 nights (booked confirmed/completed nights / 30)
  const start = new Date(now); start.setHours(0, 0, 0, 0);
  const horizon = new Date(start); horizon.setDate(horizon.getDate() + 30);
  let bookedNights = 0;
  earning.forEach((r) => {
    const ci = parseDate(r.checkIn); const co = parseDate(r.checkOut);
    if (!ci || !co) return;
    for (let d = new Date(ci); d < co; d.setDate(d.getDate() + 1)) {
      if (d >= start && d < horizon) bookedNights++;
    }
  });
  const occupancy = Math.min(100, Math.round((bookedNights / 30) * 100));

  // Monthly earnings (last 6 months)
  const buckets: { label: string; value: number; y: number; m: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const ref = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({ label: MONTHS[ref.getMonth()], value: 0, y: ref.getFullYear(), m: ref.getMonth() });
  }
  earning.forEach((r) => {
    const d = parseDate(r.checkIn); if (!d) return;
    const b = buckets.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (b) b.value += r.payout;
  });
  const monthly = buckets.map((b) => ({ label: b.label, value: b.value }));
  const cur = monthly[monthly.length - 1]?.value ?? 0;
  const prev = monthly[monthly.length - 2]?.value ?? 0;
  const momPct = prev > 0 ? Math.round(((cur - prev) / prev) * 100) : null;

  return { occupancy, adr, repeatRate, avgStay, totalNights, totalBookings, uniqueGuests, monthly, momPct };
}
