import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  CURRENCIES,
  CurrencyConfig,
  convertCurrency,
  convertToUSD,
  applyLiveRates,
  formatPrice,
  getCurrencyByCountry,
  getCurrencyCodeByDialCode,
} from '../utils/currency';
import { getCachedRates, fetchLiveRates, isStale } from '../services/exchangeRates';

const CURRENCY_KEY = '@stayon_currency';

// All stored/listed prices in the app are authored in USD. The currency
// context converts + formats them for display based on the guest's country
// (detected at login) or an explicit override from Settings.

interface CurrencyContextValue {
  currencyCode: string;
  currency: CurrencyConfig;
  /** Format a USD-denominated amount in the active currency, e.g. "₹8,312". */
  format: (amountUSD: number, showDecimals?: boolean) => string;
  /** Convert a USD amount to the active currency (number only, no symbol). */
  convert: (amountUSD: number) => number;
  /** Convert an amount entered in the active currency back to canonical USD. */
  toUSD: (amountLocal: number) => number;
  /** Explicitly set the active currency (e.g. from the Settings screen). */
  setCurrency: (code: string) => void;
  /** Set the active currency from an ISO country code (e.g. "IN" -> INR). */
  setCurrencyByCountry: (countryCode: string) => void;
  /** Set the active currency from a phone dial code (e.g. "+91" -> INR). */
  setCurrencyByDialCode: (dialCode: string) => void;
  /** Epoch ms the live FX rates were last fetched (null = static fallback). */
  ratesUpdatedAt: number | null;
  /** True while a live-rate fetch is in flight. */
  ratesLoading: boolean;
  /** Force a fresh live-rate fetch (e.g. pull-to-refresh / a Refresh button). */
  refreshRates: () => Promise<void>;
}

const CurrencyContext = createContext<CurrencyContextValue>({
  currencyCode: 'USD',
  currency: CURRENCIES.USD,
  format: (amount) => formatPrice(amount, 'USD'),
  convert: (amount) => amount,
  toUSD: (amount) => amount,
  setCurrency: () => {},
  setCurrencyByCountry: () => {},
  setCurrencyByDialCode: () => {},
  ratesUpdatedAt: null,
  ratesLoading: false,
  refreshRates: async () => {},
});

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [currencyCode, setCode] = useState<string>('USD');
  // Bumped whenever live rates change, so memoised convert/format recompute.
  const [ratesVersion, setRatesVersion] = useState(0);
  const [ratesUpdatedAt, setRatesUpdatedAt] = useState<number | null>(null);
  const [ratesLoading, setRatesLoading] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(CURRENCY_KEY).then((saved) => {
      if (saved && CURRENCIES[saved]) setCode(saved);
    });
  }, []);

  // Load cached FX rates immediately, then refresh from the network if stale.
  useEffect(() => {
    let active = true;
    (async () => {
      const cached = await getCachedRates();
      if (cached && active) {
        applyLiveRates(cached.rates);
        setRatesUpdatedAt(cached.ts);
        setRatesVersion((v) => v + 1);
      }
      if (isStale(cached)) {
        if (active) setRatesLoading(true);
        const fresh = await fetchLiveRates();
        if (fresh && active) {
          applyLiveRates(fresh.rates);
          setRatesUpdatedAt(fresh.ts);
          setRatesVersion((v) => v + 1);
        }
        if (active) setRatesLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const refreshRates = useCallback(async () => {
    setRatesLoading(true);
    const fresh = await fetchLiveRates();
    if (fresh) {
      applyLiveRates(fresh.rates);
      setRatesUpdatedAt(fresh.ts);
      setRatesVersion((v) => v + 1);
    }
    setRatesLoading(false);
  }, []);

  const setCurrency = useCallback((code: string) => {
    const next = CURRENCIES[code] ? code : 'USD';
    setCode(next);
    AsyncStorage.setItem(CURRENCY_KEY, next).catch(() => {});
  }, []);

  const setCurrencyByCountry = useCallback(
    (countryCode: string) => {
      setCurrency(getCurrencyByCountry(countryCode).code);
    },
    [setCurrency]
  );

  const setCurrencyByDialCode = useCallback(
    (dialCode: string) => {
      setCurrency(getCurrencyCodeByDialCode(dialCode));
    },
    [setCurrency]
  );

  const convert = useCallback(
    (amountUSD: number) => convertCurrency(amountUSD, currencyCode),
    [currencyCode, ratesVersion]
  );

  const toUSD = useCallback(
    (amountLocal: number) => convertToUSD(amountLocal, currencyCode),
    [currencyCode, ratesVersion]
  );

  const format = useCallback(
    (amountUSD: number, showDecimals = false) =>
      formatPrice(convertCurrency(amountUSD, currencyCode), currencyCode, showDecimals),
    [currencyCode, ratesVersion]
  );

  return (
    <CurrencyContext.Provider
      value={{
        currencyCode,
        currency: CURRENCIES[currencyCode] || CURRENCIES.USD,
        format,
        convert,
        toUSD,
        setCurrency,
        setCurrencyByCountry,
        setCurrencyByDialCode,
        ratesUpdatedAt,
        ratesLoading,
        refreshRates,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
