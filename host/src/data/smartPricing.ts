// Smart Pricing — suggests optimized nightly rates from simple demand/seasonal
// heuristics (no real market data), plus per-listing settings. Prices are in the
// listing's own currency (priceCurrency); suggestions are percentage-based so
// they stay in that currency. StayOn takes 0%, so the host keeps whatever it sets.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SmartSettings {
  enabled: boolean;
  minPrice: number;   // floor, listing currency (0 = none)
  maxPrice: number;   // ceiling, listing currency (0 = none)
}

const KEY = '@stayon_host_smartpricing';

export async function getSmartSettings(listingId: string): Promise<SmartSettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const m = JSON.parse(raw); if (m && m[listingId]) return m[listingId]; }
  } catch {}
  return { enabled: false, minPrice: 0, maxPrice: 0 };
}

export async function setSmartSettings(listingId: string, s: SmartSettings): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    const m = raw ? JSON.parse(raw) : {};
    m[listingId] = s;
    await AsyncStorage.setItem(KEY, JSON.stringify(m));
  } catch {}
}

// Seasonal demand multiplier by month (0-based). Peak summer + year-end holidays.
const SEASONAL = [0.0, 0.0, 0.02, 0.04, 0.06, 0.10, 0.12, 0.10, 0.04, 0.02, 0.05, 0.12];

export interface PricingSuggestion {
  suggestedBase: number;       // recommended weekday rate (listing currency)
  weekendPremiumPct: number;   // recommended weekend uplift
  range: { min: number; max: number };
  deltaPct: number;            // vs current base
  reasons: string[];
  next7: { dateLabel: string; price: number; weekend: boolean; tag?: string }[];
}

function clamp(v: number, min: number, max: number) {
  let r = v;
  if (min > 0) r = Math.max(r, min);
  if (max > 0) r = Math.min(r, max);
  return Math.round(r);
}

/**
 * Build a pricing suggestion. `currentBase` is the listing's weekday rate in its
 * currency; `occupancyPct` is the next-30-day occupancy used as a demand signal.
 */
export function suggestPricing(currentBase: number, occupancyPct: number, now: Date, settings: SmartSettings): PricingSuggestion {
  const reasons: string[] = [];

  // Demand from occupancy
  let demand = 0;
  if (occupancyPct >= 70) { demand += 0.10; reasons.push('High demand — your next 30 days are filling up, so you can charge more.'); }
  else if (occupancyPct <= 30) { demand -= 0.08; reasons.push('Light demand — a small drop helps win bookings and early reviews.'); }
  else { reasons.push('Steady demand — your rate is in a healthy range.'); }

  // Seasonal
  const seasonal = SEASONAL[now.getMonth()] ?? 0;
  if (seasonal >= 0.08) reasons.push('Peak season — guests expect (and pay) higher rates this month.');
  else if (seasonal > 0) reasons.push('Shoulder season — a modest uplift suits this time of year.');

  const factor = 1 + demand + seasonal;
  const suggestedBase = clamp(currentBase * factor, settings.minPrice, settings.maxPrice);
  const weekendPremiumPct = seasonal >= 0.08 || occupancyPct >= 70 ? 20 : 15;
  const deltaPct = currentBase > 0 ? Math.round(((suggestedBase - currentBase) / currentBase) * 100) : 0;

  const range = {
    min: clamp(currentBase * 0.85, settings.minPrice, 0),
    max: clamp(currentBase * 1.3, 0, settings.maxPrice),
  };

  // 7-day preview
  const next7 = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date(now); d.setDate(d.getDate() + i);
    const weekend = d.getDay() === 5 || d.getDay() === 6;
    const price = clamp(suggestedBase * (weekend ? 1 + weekendPremiumPct / 100 : 1), settings.minPrice, settings.maxPrice);
    const labels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return { dateLabel: i === 0 ? 'Today' : `${labels[d.getDay()]} ${d.getDate()}`, price, weekend, tag: weekend ? 'Weekend' : undefined };
  });

  return { suggestedBase, weekendPremiumPct, range, deltaPct, reasons, next7 };
}
