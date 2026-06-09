// Currency utilities for multi-country support

export interface CurrencyConfig {
  code: string;
  symbol: string;
  name: string;
  exchangeRate: number; // Rate relative to USD
  locale: string;
}

// Major currencies with their exchange rates (sample rates)
export const CURRENCIES: { [key: string]: CurrencyConfig } = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar', exchangeRate: 1, locale: 'en-US' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro', exchangeRate: 0.92, locale: 'de-DE' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound', exchangeRate: 0.79, locale: 'en-GB' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee', exchangeRate: 83.12, locale: 'en-IN' },
  AED: { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham', exchangeRate: 3.67, locale: 'ar-AE' },
  QAR: { code: 'QAR', symbol: 'ر.ق', name: 'Qatari Riyal', exchangeRate: 3.64, locale: 'ar-QA' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen', exchangeRate: 149.50, locale: 'ja-JP' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', exchangeRate: 1.52, locale: 'en-AU' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar', exchangeRate: 1.36, locale: 'en-CA' },
  CHF: { code: 'CHF', symbol: 'Fr', name: 'Swiss Franc', exchangeRate: 0.88, locale: 'de-CH' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', exchangeRate: 7.24, locale: 'zh-CN' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', exchangeRate: 1.34, locale: 'en-SG' },
  THB: { code: 'THB', symbol: '฿', name: 'Thai Baht', exchangeRate: 35.80, locale: 'th-TH' },
  MXN: { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', exchangeRate: 17.20, locale: 'es-MX' },
  BRL: { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', exchangeRate: 5.02, locale: 'pt-BR' },
  ZAR: { code: 'ZAR', symbol: 'R', name: 'South African Rand', exchangeRate: 18.95, locale: 'en-ZA' },
  TRY: { code: 'TRY', symbol: '₺', name: 'Turkish Lira', exchangeRate: 32.15, locale: 'tr-TR' },
  KRW: { code: 'KRW', symbol: '₩', name: 'South Korean Won', exchangeRate: 1320.50, locale: 'ko-KR' },
  IDR: { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', exchangeRate: 15650, locale: 'id-ID' },
  MYR: { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', exchangeRate: 4.72, locale: 'ms-MY' },
  NZD: { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', exchangeRate: 1.64, locale: 'en-NZ' },
};

/**
 * Overlay live exchange rates (USD-based) onto the currency table. Unknown or
 * non-positive rates are ignored so the static fallback rate stays in place.
 * Mutates CURRENCIES in place; callers should bump React state to re-render.
 */
export const applyLiveRates = (rates: Record<string, number>): number => {
  let updated = 0;
  Object.keys(CURRENCIES).forEach((code) => {
    const r = rates[code];
    if (typeof r === 'number' && r > 0) {
      CURRENCIES[code].exchangeRate = r;
      updated += 1;
    }
  });
  return updated;
};

// Country code to currency mapping
export const COUNTRY_CURRENCY_MAP: { [key: string]: string } = {
  US: 'USD', CA: 'CAD', GB: 'GBP', FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR',
  IN: 'INR', AE: 'AED', QA: 'QAR', JP: 'JPY', AU: 'AUD', CH: 'CHF', CN: 'CNY', SG: 'SGD',
  TH: 'THB', MX: 'MXN', BR: 'BRL', ZA: 'ZAR', TR: 'TRY', KR: 'KRW', ID: 'IDR',
  MY: 'MYR', NZ: 'NZD', NL: 'EUR', BE: 'EUR', AT: 'EUR', PT: 'EUR', GR: 'EUR',
  IE: 'EUR', SE: 'EUR', DK: 'EUR', NO: 'EUR', FI: 'EUR', PL: 'EUR', CZ: 'EUR',
};

// Phone dial code (e.g. "+91") to ISO country code. Used at login to pick a
// sensible default currency from the number the guest signed in with.
export const DIAL_CODE_COUNTRY_MAP: { [dial: string]: string } = {
  '+1': 'US', '+44': 'GB', '+33': 'FR', '+49': 'DE', '+39': 'IT', '+34': 'ES',
  '+91': 'IN', '+971': 'AE', '+974': 'QA', '+81': 'JP', '+61': 'AU', '+41': 'CH', '+86': 'CN',
  '+65': 'SG', '+66': 'TH', '+52': 'MX', '+55': 'BR', '+27': 'ZA', '+90': 'TR',
  '+82': 'KR', '+62': 'ID', '+60': 'MY', '+64': 'NZ', '+31': 'NL', '+32': 'BE',
  '+43': 'AT', '+351': 'PT', '+30': 'GR', '+353': 'IE', '+46': 'SE', '+45': 'DK',
  '+47': 'NO', '+358': 'FI', '+48': 'PL', '+420': 'CZ',
};

/**
 * Resolve a currency code from a phone dial code (defaults to USD).
 */
export const getCurrencyCodeByDialCode = (dialCode: string): string => {
  const country = DIAL_CODE_COUNTRY_MAP[dialCode];
  if (!country) return 'USD';
  return COUNTRY_CURRENCY_MAP[country] || 'USD';
};

/**
 * Convert price from USD to target currency
 */
export const convertCurrency = (
  amountUSD: number,
  targetCurrencyCode: string
): number => {
  const currency = CURRENCIES[targetCurrencyCode];
  if (!currency) return amountUSD;
  return Math.round(amountUSD * currency.exchangeRate);
};

/**
 * Convert a price entered in a local currency back to USD (the canonical
 * storage currency). Keeps 2 decimals so a round-trip (author in INR → store
 * USD → display in INR) stays visually stable. Inverse of convertCurrency.
 */
export const convertToUSD = (
  amountLocal: number,
  fromCurrencyCode: string
): number => {
  const currency = CURRENCIES[fromCurrencyCode];
  if (!currency || !currency.exchangeRate) return amountLocal;
  return Math.round((amountLocal / currency.exchangeRate) * 100) / 100;
};

/**
 * Format price with currency symbol
 */
export const formatPrice = (
  amount: number,
  currencyCode: string = 'USD',
  showDecimals: boolean = false
): string => {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD;
  
  // Special formatting for certain currencies
  if (currencyCode === 'JPY' || currencyCode === 'KRW' || currencyCode === 'IDR') {
    // These currencies don't use decimals
    return `${currency.symbol}${amount.toLocaleString(currency.locale, { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    })}`;
  }
  
  if (showDecimals) {
    return `${currency.symbol}${amount.toLocaleString(currency.locale, { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`;
  }
  
  return `${currency.symbol}${amount.toLocaleString(currency.locale, { 
    minimumFractionDigits: 0, 
    maximumFractionDigits: 0 
  })}`;
};

/**
 * Get currency by country code
 */
export const getCurrencyByCountry = (countryCode: string): CurrencyConfig => {
  const currencyCode = COUNTRY_CURRENCY_MAP[countryCode.toUpperCase()] || 'USD';
  return CURRENCIES[currencyCode];
};

/**
 * Format price based on user's country
 */
export const formatPriceForUser = (
  priceUSD: number,
  userCountryCode?: string,
  showDecimals: boolean = false
): string => {
  if (!userCountryCode) {
    // Default to USD if not logged in
    return formatPrice(priceUSD, 'USD', showDecimals);
  }
  
  const currency = getCurrencyByCountry(userCountryCode);
  const convertedPrice = convertCurrency(priceUSD, currency.code);
  return formatPrice(convertedPrice, currency.code, showDecimals);
};
