// Shared booking store — the source of truth for the Trips tab.
// Pure client-side persistence (AsyncStorage); no backend.
// A confirmed booking is added here on the confirmation screen and shows up
// as an UPCOMING trip. Cancelling refunds the "stay money" but WITHHOLDS taxes
// (taxes are remitted to the government and are non-refundable).
import AsyncStorage from '@react-native-async-storage/async-storage';

export type BookingStatus = 'upcoming' | 'completed' | 'cancelled';

export interface Booking {
  id: string;
  confirmationCode: string;
  property: string;
  location: string;     // city, always shown
  address?: string;     // exact street address — only revealed once confirmed
  image?: string;
  checkIn: string;   // display string e.g. "Jul 3, 2026"
  checkOut: string;
  nights: number;
  guests: number;
  subtotal: number;
  cleaningFee: number;
  taxes: number;
  total: number;     // USD
  status: BookingStatus;
  card?: string;
  createdAt: number;
  cancelReason?: string;
  refundAmount?: number;
}

export const STORAGE_KEY = '@stayon_bookings';

// Realistic seed so the Trips tab isn't empty for the demo (2 upcoming, 2 completed).
function seedBookings(): Booking[] {
  return [
    {
      id: 'seed-1',
      confirmationCode: 'STY-A8K2M1',
      property: 'Manhattan Luxury Loft',
      location: 'New York, NY',
      address: '15 W 55th St, New York, NY 10019',
      image: 'https://images.unsplash.com/photo-1555636222-cae831e670b3?w=400&h=300&fit=crop',
      checkIn: 'Jun 15, 2026',
      checkOut: 'Jun 20, 2026',
      nights: 5,
      guests: 2,
      subtotal: 1425,
      cleaningFee: 171,
      taxes: 224,
      total: 1820,
      status: 'upcoming',
      card: 'Visa •••• 4242',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 3,
    },
    {
      id: 'seed-2',
      confirmationCode: 'STY-B3N9P4',
      property: 'Notting Hill Garden Flat',
      location: 'London, UK',
      address: '22 Pembridge Rd, Notting Hill, London W11 3HL',
      image: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400&h=300&fit=crop',
      checkIn: 'Jul 3, 2026',
      checkOut: 'Jul 7, 2026',
      nights: 4,
      guests: 3,
      subtotal: 1760,
      cleaningFee: 211,
      taxes: 309,
      total: 2280,
      status: 'upcoming',
      card: 'Visa •••• 4242',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 2,
    },
    {
      id: 'seed-3',
      confirmationCode: 'STY-C5Q1R7',
      property: 'Chelsea Townhouse',
      location: 'London, UK',
      address: '48 Cheyne Walk, Chelsea, London SW3 5LR',
      image: 'https://images.unsplash.com/photo-1577495508326-19a1b3cf65b7?w=400&h=300&fit=crop',
      checkIn: 'May 10, 2026',
      checkOut: 'May 15, 2026',
      nights: 5,
      guests: 4,
      subtotal: 1650,
      cleaningFee: 198,
      taxes: 252,
      total: 2100,
      status: 'completed',
      card: 'Visa •••• 4242',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 30,
    },
    {
      id: 'seed-4',
      confirmationCode: 'STY-D7S3T2',
      property: 'Eixample Designer Apartment',
      location: 'Barcelona, Spain',
      address: 'Carrer de Mallorca 312, Eixample, Barcelona 08037',
      image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&h=300&fit=crop',
      checkIn: 'Apr 2, 2026',
      checkOut: 'Apr 6, 2026',
      nights: 4,
      guests: 2,
      subtotal: 720,
      cleaningFee: 86,
      taxes: 114,
      total: 920,
      status: 'completed',
      card: 'Visa •••• 4242',
      createdAt: Date.now() - 1000 * 60 * 60 * 24 * 60,
    },
  ];
}

let seededThisSession = false;

export async function getBookings(): Promise<Booking[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed once if storage is empty so the demo has trips.
      if (!seededThisSession) {
        const seeded = seedBookings();
        seededThisSession = true;
        await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded.sort((a, b) => b.createdAt - a.createdAt);
      }
      return [];
    }
    const arr = JSON.parse(raw) as Booking[];
    if (!Array.isArray(arr)) return [];
    // Self-heal: older data may have stored `image` as a {uri,caption} object,
    // which crashes <Image source={{uri}}>. Coerce to string|undefined.
    const cleaned = arr.map((b) => ({ ...b, image: toBookingUri((b as any).image) }));
    return cleaned.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function toBookingUri(v: any): string | undefined {
  if (typeof v === 'string') return v;
  if (v && typeof v.uri === 'string') return v.uri;
  return undefined;
}

export async function addBooking(b: Booking): Promise<Booking[]> {
  const existing = await getBookings();
  // de-dupe by confirmation code
  const next = [b, ...existing.filter((x) => x.confirmationCode !== b.confirmationCode)];
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.sort((a, b2) => b2.createdAt - a.createdAt);
}

export async function cancelBooking(id: string, reason: string): Promise<Booking[]> {
  const existing = await getBookings();
  const cancelled = existing.find((b) => b.id === id);
  const next = existing.map((b) => {
    if (b.id !== id) return b;
    // Refund the stay money + other fees; taxes are withheld (remitted to government).
    const refundAmount = Math.max(0, b.total - b.taxes);
    return {
      ...b,
      status: 'cancelled' as BookingStatus,
      cancelReason: reason,
      refundAmount,
    };
  });
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  // Bridge: flip the host's matching reservation to cancelled too (same code).
  if (cancelled?.confirmationCode) {
    try {
      const { setReservationStatusByCode } = await import('../host/data/reservations');
      await setReservationStatusByCode(cancelled.confirmationCode, 'cancelled');
    } catch { /* host store unavailable — ignore */ }
  }
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

/** Update a guest booking by confirmation CODE — the reverse bridge: when the
 * host accepts/declines/completes a reservation, the guest's trip follows. */
export async function setBookingStatusByCode(code: string, status: BookingStatus): Promise<Booking[]> {
  const existing = await getBookings();
  const next = existing.map((b) => (b.confirmationCode === code ? { ...b, status } : b));
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

/** Undo a cancellation — restores the booking to upcoming and re-confirms the
 * host's matching reservation. Powers the "Undo" snackbar. */
export async function restoreBooking(id: string): Promise<Booking[]> {
  const existing = await getBookings();
  const target = existing.find((b) => b.id === id);
  const next = existing.map((b) =>
    b.id === id ? { ...b, status: 'upcoming' as BookingStatus, cancelReason: undefined, refundAmount: undefined } : b
  );
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  if (target?.confirmationCode) {
    try {
      const { setReservationStatusByCode } = await import('../host/data/reservations');
      await setReservationStatusByCode(target.confirmationCode, 'confirmed');
    } catch { /* host store unavailable — ignore */ }
  }
  return next.sort((a, b) => b.createdAt - a.createdAt);
}

export async function removeBooking(id: string): Promise<Booking[]> {
  const existing = await getBookings();
  const next = existing.filter((b) => b.id !== id);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  return next;
}
