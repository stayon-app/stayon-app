'use client';

// Holds the viewer's display preferences (currency + language). Currency drives
// every price on the site; language is English-only for now (seam for i18n later).

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { DEFAULT_CURRENCY, detectCurrency, formatPrice } from '@/lib/currency';
import { translate } from '@/lib/i18n';

interface PrefsValue {
  currency: string;
  language: string;
  setCurrency: (code: string) => void;
  setLanguage: (code: string) => void;
  format: (usd: number) => string;
  t: (s: string) => string;
}

const PrefsContext = createContext<PrefsValue | undefined>(undefined);

const CUR_KEY = 'stayon_currency';
const LANG_KEY = 'stayon_language';

export function PrefsProvider({ children }: { children: React.ReactNode }) {
  const [currency, setCurrencyState] = useState(DEFAULT_CURRENCY);
  const [language, setLanguageState] = useState('en');

  useEffect(() => {
    const c = localStorage.getItem(CUR_KEY);
    const l = localStorage.getItem(LANG_KEY);
    // Stored choice wins; otherwise pick the visitor's local currency by locale.
    if (c) setCurrencyState(c);
    else setCurrencyState(detectCurrency());
    if (l) setLanguageState(l);
  }, []);

  const setCurrency = useCallback((code: string) => {
    setCurrencyState(code);
    localStorage.setItem(CUR_KEY, code);
  }, []);

  const setLanguage = useCallback((code: string) => {
    setLanguageState(code);
    localStorage.setItem(LANG_KEY, code);
  }, []);

  const format = useCallback((usd: number) => formatPrice(usd, currency), [currency]);
  const t = useCallback((s: string) => translate(language, s), [language]);

  return (
    <PrefsContext.Provider value={{ currency, language, setCurrency, setLanguage, format, t }}>
      {children}
    </PrefsContext.Provider>
  );
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used within PrefsProvider');
  return ctx;
}
