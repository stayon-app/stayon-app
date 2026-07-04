// Prices are authored in USD on the backend. The website displays them in the
// viewer's chosen currency (default INR). Static rates keep it fast + dependency-free;
// swap for a live feed later if needed.

export interface Currency {
  code: string;
  label: string;
  symbol: string;
  rate: number; // 1 USD = rate units of this currency
}

// Major world currencies — the site is live globally, so a visitor anywhere
// sees a sensible default (auto-detected from their locale) and can switch.
export const CURRENCIES: Currency[] = [
  { code: 'USD', label: 'US Dollar', symbol: '$', rate: 1 },
  { code: 'EUR', label: 'Euro', symbol: '€', rate: 0.92 },
  { code: 'GBP', label: 'British Pound', symbol: '£', rate: 0.79 },
  { code: 'INR', label: 'Indian Rupee', symbol: '₹', rate: 83.5 },
  { code: 'AED', label: 'UAE Dirham', symbol: 'د.إ', rate: 3.67 },
  { code: 'CAD', label: 'Canadian Dollar', symbol: 'C$', rate: 1.36 },
  { code: 'AUD', label: 'Australian Dollar', symbol: 'A$', rate: 1.52 },
  { code: 'SGD', label: 'Singapore Dollar', symbol: 'S$', rate: 1.35 },
  { code: 'JPY', label: 'Japanese Yen', symbol: '¥', rate: 157 },
  { code: 'CNY', label: 'Chinese Yuan', symbol: '¥', rate: 7.24 },
  { code: 'CHF', label: 'Swiss Franc', symbol: 'CHF', rate: 0.88 },
  { code: 'HKD', label: 'Hong Kong Dollar', symbol: 'HK$', rate: 7.8 },
  { code: 'NZD', label: 'New Zealand Dollar', symbol: 'NZ$', rate: 1.64 },
  { code: 'SAR', label: 'Saudi Riyal', symbol: '﷼', rate: 3.75 },
  { code: 'ZAR', label: 'South African Rand', symbol: 'R', rate: 18.4 },
  { code: 'BRL', label: 'Brazilian Real', symbol: 'R$', rate: 5.4 },
  { code: 'MXN', label: 'Mexican Peso', symbol: 'MX$', rate: 17.1 },
  { code: 'THB', label: 'Thai Baht', symbol: '฿', rate: 36.5 },
  { code: 'KRW', label: 'South Korean Won', symbol: '₩', rate: 1360 },
  { code: 'IDR', label: 'Indonesian Rupiah', symbol: 'Rp', rate: 16200 },
];

// Global-neutral default before locale detection / a stored choice kicks in.
export const DEFAULT_CURRENCY = 'USD';

// Locale region → supported currency. Eurozone regions map to EUR.
const REGION_CURRENCY: Record<string, string> = {
  US: 'USD', GB: 'GBP', IN: 'INR', AE: 'AED', CA: 'CAD', AU: 'AUD', SG: 'SGD',
  JP: 'JPY', CN: 'CNY', CH: 'CHF', HK: 'HKD', NZ: 'NZD', SA: 'SAR', ZA: 'ZAR',
  BR: 'BRL', MX: 'MXN', TH: 'THB', KR: 'KRW', ID: 'IDR',
  DE: 'EUR', FR: 'EUR', ES: 'EUR', IT: 'EUR', NL: 'EUR', IE: 'EUR', PT: 'EUR',
  AT: 'EUR', BE: 'EUR', FI: 'EUR', GR: 'EUR', LU: 'EUR',
};

/** Best-effort currency for the visitor, from their browser locale. */
export function detectCurrency(): string {
  try {
    const loc = (navigator.languages && navigator.languages[0]) || navigator.language || 'en-US';
    const region = (new Intl.Locale(loc) as any).maximize?.().region as string | undefined;
    if (region && REGION_CURRENCY[region]) return REGION_CURRENCY[region];
  } catch {
    /* fall through to default */
  }
  return DEFAULT_CURRENCY;
}

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
