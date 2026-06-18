// Prices are authored in USD on the backend. The website displays them in the
// viewer's chosen currency (default INR). Static rates keep it fast + dependency-free;
// swap for a live feed later if needed.

export interface Currency {
  code: string;
  label: string;
  symbol: string;
  rate: number; // 1 USD = rate units of this currency
}

export const CURRENCIES: Currency[] = [
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', rate: 83.5 },
  { code: 'USD', label: 'US Dollar', symbol: '$', rate: 1 },
  { code: 'EUR', label: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'GBP', label: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ', rate: 3.67 },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', rate: 1.35 },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
];

export const DEFAULT_CURRENCY = 'INR';

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) || CURRENCIES[0];
}

/** Format a USD amount in the target currency. */
export function formatPrice(usd: number, code: string): string {
  const c = getCurrency(code);
  const value = (usd || 0) * c.rate;
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: c.code,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${c.symbol}${Math.round(value).toLocaleString()}`;
  }
}

export const LANGUAGES = [
  { code: 'en', label: 'English', active: true },
  { code: 'hi', label: 'हिन्दी (Hindi)', active: false },
  { code: 'fr', label: 'Français', active: false },
  { code: 'es', label: 'Español', active: false },
];
