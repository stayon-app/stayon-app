// Host reservations — bookings made on the host's listings. Persisted to
// AsyncStorage. Mirrors the guest booking shape, from the host's perspective.

import AsyncStorage from '@react-native-async-storage/async-storage';
import dayjs from 'dayjs';
import { Api } from '../../api';

// Map a backend reservation → the host reservation shape (0% fee → host keeps
// the full rate; taxes are display-only at 12%).
function beToHostReservation(r: any): HostReservation {
  const nights = r.nights || 1;
  const subtotal = Math.round((r.rateUSD || 0) * nights);
  const taxes = Math.round(subtotal * 0.12);
  return {
    id: String(r.id), code: r.code, listingId: String(r.listingId || ''), listingTitle: r.listingTitle || 'Your stay',
    image: '', guestName: r.guestName || 'Guest',
    checkIn: r.checkIn ? dayjs(r.checkIn).format('MMM D, YYYY') : '',
    checkOut: r.checkOut ? dayjs(r.checkOut).format('MMM D, YYYY') : '',
    nights, guests: 1, subtotal, cleaningFee: 0, taxes, total: subtotal + taxes, payout: subtotal,
    status: r.status as ReservationStatus, instant: !!r.instant,
    createdAt: r.createdAt ? new Date(r.createdAt).getTime() : Date.now(),
  };
}

export type ReservationStatus = 'pending' | 'confirmed' | 'completed' | 'cancelled';

export interface HostReservation {
  id: string;
  code: string;                 // confirmation code
  listingId: string;
  listingTitle: string;
  image: string;
  guestName: string;
  guestAvatar?: string;
  checkIn: string;              // "Jun 14, 2026"
  checkOut: string;
  nights: number;
  guests: number;
  subtotal: number;             // USD
  cleaningFee: number;
  taxes: number;
  total: number;
  payout: number;               // what the host receives (full rate + cleaning; no fee)
  status: ReservationStatus;
  instant: boolean;             // instant-book vs request
  message?: string;             // guest's message to host
  createdAt: number;
}

const KEY = '@stayon_host_reservations';
const av = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0D9488&color=fff`;
const img = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&auto=format&fit=crop`;

// StayOn charges NO platform fee — to the guest OR the host. The host keeps the
// full nightly rate + cleaning fee; only taxes pass through. Kept as 0 so the
// payout math stays explicit.
export const HOST_COMMISSION = 0;

const mk = (
  o: Partial<HostReservation> & { id: string; guestName: string; status: ReservationStatus; nights: number; rate: number }
): HostReservation => {
  const subtotal = o.rate * o.nights;
  const cleaningFee = o.cleaningFee ?? Math.round(subtotal * 0.1);
  const taxes = o.taxes ?? Math.round(subtotal * 0.08);
  const total = subtotal + cleaningFee + taxes;
  const payout = Math.round(subtotal * (1 - HOST_COMMISSION)) + cleaningFee;
  return {
    code: o.code ?? `STY-${o.id.toUpperCase()}`,
    listingId: o.listingId ?? 'hl1',
    listingTitle: o.listingTitle ?? 'Sunlit Loft in the City',
    image: o.image ?? img('photo-1502672260266-1c1ef2d93688'),
    guestAvatar: av(o.guestName),
    checkIn: o.checkIn ?? 'Jun 14, 2026',
    checkOut: o.checkOut ?? 'Jun 17, 2026',
    guests: o.guests ?? 2,
    instant: o.instant ?? true,
    message: o.message,
    createdAt: o.createdAt ?? 0,
    subtotal, cleaningFee, taxes, total, payout,
    ...o,
  } as HostReservation;
};

export const SEED_RESERVATIONS: HostReservation[] = [
  mk({ id: 'r1', code: 'STY-A8K2M1', guestName: 'Aarav Mehta', status: 'pending', nights: 3, rate: 110, instant: false,
       checkIn: 'Jun 20, 2026', checkOut: 'Jun 23, 2026', guests: 2,
       message: 'Hi! Travelling for work — is early check‑in possible?' }),
  mk({ id: 'r2', code: 'STY-7QF3PD', guestName: 'Sophie Turner', status: 'pending', nights: 2, rate: 280, instant: false,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Jul 02, 2026', checkOut: 'Jul 04, 2026', guests: 6 }),
  mk({ id: 'r3', code: 'STY-M4XK9T', guestName: 'Liam O’Brien', status: 'confirmed', nights: 4, rate: 110, instant: true,
       checkIn: 'Jun 14, 2026', checkOut: 'Jun 18, 2026', guests: 3 }),
  mk({ id: 'r4', code: 'STY-B2NH6R', guestName: 'Mia Chen', status: 'confirmed', nights: 5, rate: 280, instant: true,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Jun 28, 2026', checkOut: 'Jul 03, 2026', guests: 8 }),
  mk({ id: 'r5', code: 'STY-C9LZ5W', guestName: 'Noah Williams', status: 'completed', nights: 2, rate: 110, instant: true,
       checkIn: 'May 10, 2026', checkOut: 'May 12, 2026', guests: 2 }),
  mk({ id: 'r6', code: 'STY-K3VD8Y', guestName: 'Emma Davis', status: 'completed', nights: 3, rate: 280, instant: false,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Apr 22, 2026', checkOut: 'Apr 25, 2026', guests: 5 }),
  mk({ id: 'r7', code: 'STY-T6RP2J', guestName: 'Raj Patel', status: 'cancelled', nights: 2, rate: 110, instant: true,
       checkIn: 'May 30, 2026', checkOut: 'Jun 01, 2026', guests: 2 }),
];

export async function getReservations(): Promise<HostReservation[]> {
  // 1) Local (seed/cached) baseline.
  let local: HostReservation[] = SEED_RESERVATIONS;
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) local = p; }
    else await AsyncStorage.setItem(KEY, JSON.stringify(SEED_RESERVATIONS)).catch(() => {});
  } catch {}
  // 2) Merge REAL backend reservations on top (authoritative by code) so
  //    Reservations + Earnings + Payouts reflect actual bookings cross-device.
  try {
    await Api.auth.ensureSession();
    const r: any = await Api.reservations.mine();
    const live: HostReservation[] = (r?.items || []).map(beToHostReservation);
    if (live.length) {
      const codes = new Set(live.map((x) => x.code));
      return [...live, ...local.filter((x: HostReservation) => !codes.has(x.code))];
    }
  } catch { /* offline → local only */ }
  return local;
}

// Reverse bridge: when the host changes a reservation, mirror it onto the guest's
// trip (by confirmation code). confirmed/pending → guest "upcoming"; completed →
// "completed"; cancelled → "cancelled".
async function syncGuestBooking(code: string, status: ReservationStatus) {
  if (!code) return;
  const map = { pending: 'upcoming', confirmed: 'upcoming', completed: 'completed', cancelled: 'cancelled' } as const;
  try {
    const { setBookingStatusByCode } = await import('../../data/bookings');
    await setBookingStatusByCode(code, map[status] as any);
  } catch { /* guest store unavailable — ignore */ }
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<HostReservation[]> {
  const all = await getReservations();
  const target = all.find((r) => r.id === id);
  const next = all.map((r) => (r.id === id ? { ...r, status } : r));
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  if (target?.code) await syncGuestBooking(target.code, status);
  return next;
}

/** Update a reservation by its confirmation CODE — used by guest↔host bridges
 * (e.g. a guest cancellation flips the matching host reservation too). */
export async function setReservationStatusByCode(code: string, status: ReservationStatus): Promise<HostReservation[]> {
  const all = await getReservations();
  const next = all.map((r) => (r.code === code ? { ...r, status } : r));
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  await syncGuestBooking(code, status);
  return next;
}

/**
 * Bridge from a guest booking → a host reservation, using the SAME confirmation
 * code so the host sees the exact reservation the guest just made. Idempotent on
 * the code (won't duplicate if called again). Single-app guest↔host link.
 */
export async function addReservationFromBooking(b: {
  code: string; guestName: string; listingTitle: string; image?: string;
  checkIn: string; checkOut: string; nights: number; guests: number;
  subtotal: number; cleaningFee: number; taxes: number; total: number;
  instant?: boolean;
}): Promise<HostReservation[]> {
  const all = await getReservations();
  if (all.some((r) => r.code === b.code)) return all; // already linked
  const reservation: HostReservation = {
    id: `gb_${b.code}`,
    code: b.code,
    listingId: 'hl1',
    listingTitle: b.listingTitle,
    image: b.image ?? img('photo-1502672260266-1c1ef2d93688'),
    guestName: b.guestName,
    guestAvatar: av(b.guestName),
    checkIn: b.checkIn,
    checkOut: b.checkOut,
    nights: b.nights,
    guests: b.guests,
    subtotal: b.subtotal,
    cleaningFee: b.cleaningFee,
    taxes: b.taxes,
    total: b.total,
    payout: Math.round(b.subtotal * (1 - HOST_COMMISSION)) + b.cleaningFee,
    status: b.instant === false ? 'pending' : 'confirmed',
    instant: b.instant ?? true,
    createdAt: Date.now(),
  };
  const next = [reservation, ...all];
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export function reservationsByTab(all: HostReservation[], tab: 'requests' | 'upcoming' | 'completed' | 'cancelled') {
  if (tab === 'requests') return all.filter((r) => r.status === 'pending');
  if (tab === 'upcoming') return all.filter((r) => r.status === 'confirmed');
  if (tab === 'completed') return all.filter((r) => r.status === 'completed');
  return all.filter((r) => r.status === 'cancelled');
}
