import AsyncStorage from '@react-native-async-storage/async-storage';

// ---------------------------------------------------------------------------
// "Resume your booking" — the in-progress checkout a guest reached but didn't
// finish. Saved when they land on the Pay step, cleared when they confirm (or
// dismiss). The Home screen reads this to show a floating "complete your stay"
// suggestion, like Airbnb's "Complete your reservation" card.
// Frontend-only, persisted via AsyncStorage.
// ---------------------------------------------------------------------------

const KEY = '@stayon_pending_booking';

export interface PendingBooking {
  property: any;            // full property object, so Booking can re-open with it
  checkInDate?: string;     // raw YYYY-MM-DD for re-initialising the picker
  checkOutDate?: string;
  guests?: number;
  // Display fields for the Home suggestion card
  image?: string;
  title?: string;
  location?: string;
  nights?: number;
  total?: number;           // USD
  checkInLabel?: string;    // e.g. "Jun 11"
  checkOutLabel?: string;   // e.g. "Jun 12"
  savedAt: number;
}

export async function setPendingBooking(b: Omit<PendingBooking, 'savedAt'>): Promise<void> {
  try {
    await AsyncStorage.setItem(KEY, JSON.stringify({ ...b, savedAt: Date.now() }));
  } catch {
    // best-effort; ignore storage failures
  }
}

export async function getPendingBooking(): Promise<PendingBooking | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PendingBooking;
  } catch {
    return null;
  }
}

export async function clearPendingBooking(): Promise<void> {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}
