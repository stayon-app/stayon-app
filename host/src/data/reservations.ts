// Host reservations — bookings made on the host's listings. Persisted to
// AsyncStorage. Mirrors the guest booking shape, from the host's perspective.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from '../api';

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
    code: `STY-${o.id.toUpperCase()}`,
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
  mk({ id: 'r1', guestName: 'Aarav Mehta', status: 'pending', nights: 3, rate: 110, instant: false,
       checkIn: 'Jun 20, 2026', checkOut: 'Jun 23, 2026', guests: 2,
       message: 'Hi! Travelling for work — is early check‑in possible?' }),
  mk({ id: 'r2', guestName: 'Sophie Turner', status: 'pending', nights: 2, rate: 280, instant: false,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Jul 02, 2026', checkOut: 'Jul 04, 2026', guests: 6 }),
  mk({ id: 'r3', guestName: 'Liam O’Brien', status: 'confirmed', nights: 4, rate: 110, instant: true,
       checkIn: 'Jun 14, 2026', checkOut: 'Jun 18, 2026', guests: 3 }),
  mk({ id: 'r4', guestName: 'Mia Chen', status: 'confirmed', nights: 5, rate: 280, instant: true,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Jun 28, 2026', checkOut: 'Jul 03, 2026', guests: 8 }),
  mk({ id: 'r5', guestName: 'Noah Williams', status: 'completed', nights: 2, rate: 110, instant: true,
       checkIn: 'May 10, 2026', checkOut: 'May 12, 2026', guests: 2 }),
  mk({ id: 'r6', guestName: 'Emma Davis', status: 'completed', nights: 3, rate: 280, instant: false,
       listingId: 'hl2', listingTitle: 'Palm Garden Villa', image: img('photo-1613490493576-7fde63acd811'),
       checkIn: 'Apr 22, 2026', checkOut: 'Apr 25, 2026', guests: 5 }),
  mk({ id: 'r7', guestName: 'Raj Patel', status: 'cancelled', nights: 2, rate: 110, instant: true,
       checkIn: 'May 30, 2026', checkOut: 'Jun 01, 2026', guests: 2 }),
];

export async function getReservations(): Promise<HostReservation[]> {
  // Prefer the shared backend so bookings made by guests appear here. The money
  // fields are recomputed by mk() from rate × nights. Fail-safe to local data.
  try {
    const r = await Api.reservations.mine();
    if (r?.items && Array.isArray(r.items)) {
      return r.items.map((it: any) => mk({
        id: it.id || it.code, code: it.code, guestName: it.guestName || 'Guest',
        status: it.status, nights: it.nights || 1, rate: it.rateUSD || 0,
        listingId: it.listingId, listingTitle: it.listingTitle,
        checkIn: it.checkIn, checkOut: it.checkOut, instant: it.instant,
      }));
    }
  } catch { /* backend offline → local */ }
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED_RESERVATIONS)).catch(() => {});
  return SEED_RESERVATIONS;
}

export async function setReservationStatus(id: string, status: ReservationStatus): Promise<HostReservation[]> {
  const all = await getReservations();
  const next = all.map((r) => (r.id === id ? { ...r, status } : r));
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export function reservationsByTab(all: HostReservation[], tab: 'requests' | 'upcoming' | 'completed' | 'cancelled') {
  if (tab === 'requests') return all.filter((r) => r.status === 'pending');
  if (tab === 'upcoming') return all.filter((r) => r.status === 'confirmed');
  if (tab === 'completed') return all.filter((r) => r.status === 'completed');
  return all.filter((r) => r.status === 'cancelled');
}
