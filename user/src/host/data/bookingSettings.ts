// Per-listing booking & availability settings (trip length, advance notice,
// preparation time, availability window, length-of-stay discounts, instant book).
// Persisted to AsyncStorage. Frontend-only mock.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface BookingSettings {
  minNights: number;
  maxNights: number;          // 31 cap if unset
  advanceNotice: number;      // days needed before arrival: 0 (same day),1,2,3,7
  prepBefore: number;         // nights blocked before a booking: 0,1,2
  prepAfter: number;          // nights blocked after a booking: 0,1,2
  windowMonths: number;       // how far ahead guests can book: 1,3,6,12,24
  weeklyDiscount: number;     // % off for 7+ nights
  monthlyDiscount: number;    // % off for 28+ nights
  instantBook: boolean;
}

const KEY = '@stayon_host_bookingsettings';

export const DEFAULTS: BookingSettings = {
  minNights: 1, maxNights: 31, advanceNotice: 1, prepBefore: 0, prepAfter: 1,
  windowMonths: 12, weeklyDiscount: 0, monthlyDiscount: 0, instantBook: true,
};

export const ADVANCE_OPTIONS = [
  { v: 0, label: 'Same day' }, { v: 1, label: '1 day' }, { v: 2, label: '2 days' },
  { v: 3, label: '3 days' }, { v: 7, label: '7 days' },
];
export const PREP_OPTIONS = [{ v: 0, label: 'None' }, { v: 1, label: '1 night' }, { v: 2, label: '2 nights' }];
export const WINDOW_OPTIONS = [
  { v: 1, label: '1 month' }, { v: 3, label: '3 months' }, { v: 6, label: '6 months' },
  { v: 12, label: '12 months' }, { v: 24, label: '24 months' },
];

export async function getBookingSettings(listingId: string, fallbackMinNights = 1): Promise<BookingSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const m = JSON.parse(raw); if (m && m[listingId]) return { ...DEFAULTS, ...m[listingId] }; }
  } catch {}
  return { ...DEFAULTS, minNights: fallbackMinNights || 1 };
}

export async function setBookingSettings(listingId: string, s: BookingSettings): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? JSON.parse(raw) : {};
    m[listingId] = s;
    await AsyncStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
}
