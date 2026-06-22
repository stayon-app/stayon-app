import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import type { Stay, HostListing } from './data';
import { HOST_LISTINGS } from './data';

/* ───────────────────────── Types ───────────────────────── */
export type RouteName =
  | 'home' | 'explore' | 'stay' | 'dest' | 'place' | 'auth' | 'book' | 'confirm' | 'trips' | 'profile'
  | 'experiences' | 'experience'
  | 'host-landing' | 'host-today' | 'host-listings' | 'host-reservations' | 'host-earnings' | 'host-calendar' | 'host-create';
export type Route = { name: RouteName; params?: Record<string, string> };

export type User = { name: string; identifier: string };

// A host account is created the first time a user verifies identity / publishes.
// Persisted in the browser so a returning host (same phone/email) opens their dashboard.
export type HostAccount = { identifier: string; name: string; verified: boolean; createdAt: number };
const HOST_ACCT_KEY = 'stayon_host_accounts';
function loadHostAccounts(): Record<string, HostAccount> {
  try { return JSON.parse(localStorage.getItem(HOST_ACCT_KEY) || '{}'); } catch { return {}; }
}
function saveHostAccounts(m: Record<string, HostAccount>) {
  try { localStorage.setItem(HOST_ACCT_KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

// Identity verification — MANDATORY before any guest can book or any host can publish.
// Verified once (at login), then persisted per identifier so a returning verified
// person skips it and works straight away with their existing details.
export type VerifiedUser = { identifier: string; name: string; idType: string; verifiedAt: number };
const VERIFIED_KEY = 'stayon_verified_users';
function loadVerified(): Record<string, VerifiedUser> {
  try { return JSON.parse(localStorage.getItem(VERIFIED_KEY) || '{}'); } catch { return {}; }
}
function saveVerified(m: Record<string, VerifiedUser>) {
  try { localStorage.setItem(VERIFIED_KEY, JSON.stringify(m)); } catch { /* storage unavailable */ }
}

// Generic localStorage persistence so a refresh keeps the session, bookings,
// favourites and listings (no backend — this is the durable layer).
function readLS<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); return raw ? (JSON.parse(raw) as T) : fallback; } catch { return fallback; }
}
function writeLS(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
}
const LS_USER = 'stayon_user';
const LS_BOOKINGS = 'stayon_bookings';
const LS_FAVS = 'stayon_favs';
const LS_LISTINGS = 'stayon_host_listings';

export type BookingDraft = {
  stayId: string;
  checkIn: string; // ISO
  checkOut: string;
  guests: number;
};

export type Confirmation = {
  code: string;
  stay: Stay;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  subtotal: number;
  cleaningFee: number;
  taxes: number;
  discount: number;
  total: number;
  instant: boolean;
  cardLast4: string;
  createdAt: number;
};

type Ctx = {
  route: Route;
  navigate: (name: RouteName, params?: Record<string, string>) => void;
  back: () => void;
  user: User | null;
  login: (u: User) => void;
  logout: () => void;
  // after-auth redirect
  pending: Route | null;
  setPending: (r: Route | null) => void;
  // booking draft carried into the wizard
  draft: BookingDraft | null;
  setDraft: (d: BookingDraft | null) => void;
  // confirmations / trips
  bookings: Confirmation[];
  addBooking: (c: Confirmation) => void;
  lastConfirmation: Confirmation | null;
  // favourites
  favs: Set<string>;
  toggleFav: (id: string) => void;
  // toast
  toast: string | null;
  showToast: (msg: string) => void;
  // host mode
  enterHost: () => void;
  exitHost: () => void;
  hostListings: HostListing[];
  addHostListing: (l: HostListing) => void;
  // host account (persisted per login identifier so existing hosts skip onboarding)
  hostAccount: HostAccount | null;
  getHostAccount: (identifier: string) => HostAccount | null;
  registerHost: (verified?: boolean) => void;
  verifyHost: () => void;
  // identity verification — required before booking / publishing
  isVerified: boolean;
  getVerified: (identifier: string) => VerifiedUser | null;
  verifyIdentity: (identifier: string, name: string, idType?: string) => void;
  // currency (USD by default; switches with login country)
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  money: (usdAmount: number) => string;
  // detected country (drives geo-personalised home content)
  country: string;
};

export type CurrencyCode = string;
// Approx FX vs USD for ~50 world currencies (swap for a live rate API via backend).
const RATE: Record<string, number> = {
  USD: 1, EUR: 0.92, GBP: 0.79, INR: 83, AED: 3.67, SAR: 3.75, QAR: 3.64, KWD: 0.31, BHD: 0.38, OMR: 0.38,
  SGD: 1.35, AUD: 1.52, CAD: 1.36, JPY: 150, CNY: 7.2, HKD: 7.8, TWD: 32, KRW: 1350, THB: 36, MYR: 4.7,
  IDR: 15800, PHP: 56, VND: 25000, NZD: 1.64, CHF: 0.88, SEK: 10.5, NOK: 10.7, DKK: 6.9, PLN: 4, CZK: 23,
  HUF: 360, RON: 4.6, TRY: 32, RUB: 92, ZAR: 18.5, EGP: 48, NGN: 1500, KES: 130, GHS: 15, MAD: 10,
  BRL: 5.4, MXN: 17, ARS: 900, CLP: 950, COP: 4000, PEN: 3.7, ILS: 3.7, PKR: 280, BDT: 110, LKR: 300, NPR: 133,
};
export const CURRENCIES: CurrencyCode[] = Object.keys(RATE);
// Dial code → currency, so login country drives the displayed currency.
export const DIAL_CURRENCY: Record<string, CurrencyCode> = { '+1': 'USD', '+91': 'INR', '+971': 'AED', '+65': 'SGD', '+44': 'GBP', '+33': 'EUR', '+49': 'EUR' };

let _curNames: Intl.DisplayNames | null = null;
try { _curNames = new Intl.DisplayNames(['en'], { type: 'currency' }); } catch { _curNames = null; }
export function currencyName(code: string): string {
  try { return _curNames?.of(code) || code; } catch { return code; }
}
export function currencySymbol(code: string): string {
  try {
    const parts = new Intl.NumberFormat('en', { style: 'currency', currency: code, currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 }).formatToParts(0);
    return parts.find((p) => p.type === 'currency')?.value || code;
  } catch { return code; }
}

// Auto-detect the visitor's currency from the browser timezone, then locale region. USD fallback.
export function detectCurrency(): CurrencyCode {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const TZ: Record<string, CurrencyCode> = {
      'Asia/Kolkata': 'INR', 'Asia/Calcutta': 'INR',
      'Asia/Dubai': 'AED', 'Asia/Muscat': 'AED',
      'Asia/Singapore': 'SGD',
      'Europe/London': 'GBP',
    };
    if (TZ[tz]) return TZ[tz];
    if (tz.startsWith('America/')) return 'USD';
    if (tz.startsWith('Europe/')) return 'EUR';
    if (tz.startsWith('Australia/')) return 'USD';
    const region = (navigator.language || '').split('-')[1]?.toUpperCase() || '';
    const REG: Record<string, CurrencyCode> = {
      US: 'USD', IN: 'INR', AE: 'AED', SG: 'SGD', GB: 'GBP', UK: 'GBP',
      FR: 'EUR', DE: 'EUR', ES: 'EUR', IT: 'EUR', IE: 'EUR', NL: 'EUR',
    };
    if (REG[region]) return REG[region];
  } catch { /* ignore */ }
  return 'USD';
}

// ISO-2 country code → currency, for IP-based detection.
export const COUNTRY_CURRENCY: Record<string, CurrencyCode> = {
  US: 'USD', IN: 'INR', GB: 'GBP', AE: 'AED', SG: 'SGD', JP: 'JPY', AU: 'AUD', CA: 'CAD', CN: 'CNY', TH: 'THB',
  QA: 'QAR', SA: 'SAR', KW: 'KWD', BH: 'BHD', OM: 'OMR', HK: 'HKD', TW: 'TWD', KR: 'KRW', MY: 'MYR', ID: 'IDR',
  PH: 'PHP', VN: 'VND', NZ: 'NZD', CH: 'CHF', SE: 'SEK', NO: 'NOK', DK: 'DKK', PL: 'PLN', CZ: 'CZK', HU: 'HUF',
  RO: 'RON', TR: 'TRY', RU: 'RUB', ZA: 'ZAR', EG: 'EGP', NG: 'NGN', KE: 'KES', GH: 'GHS', MA: 'MAD', BR: 'BRL',
  MX: 'MXN', AR: 'ARS', CL: 'CLP', CO: 'COP', PE: 'PEN', IL: 'ILS', PK: 'PKR', BD: 'BDT', LK: 'LKR', NP: 'NPR',
  FR: 'EUR', DE: 'EUR', IT: 'EUR', ES: 'EUR', IE: 'EUR', NL: 'EUR', PT: 'EUR', GR: 'EUR', AT: 'EUR', BE: 'EUR', FI: 'EUR',
};

export const CURRENCY_REGION: Record<CurrencyCode, string> = {
  USD: 'United States', INR: 'India', AED: 'UAE', SGD: 'Singapore', GBP: 'United Kingdom', EUR: 'Europe',
  AUD: 'Australia', CAD: 'Canada', JPY: 'Japan', CNY: 'China', THB: 'Thailand',
};

// Auto-detect the visitor's country (timezone first, then locale region) → key into COUNTRY_CONTENT.
export function detectCountry(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const TZ: Record<string, string> = {
      'Asia/Kolkata': 'IN', 'Asia/Calcutta': 'IN', 'Asia/Dubai': 'AE', 'Asia/Muscat': 'AE', 'Asia/Qatar': 'QA',
      'Asia/Tokyo': 'JP', 'Asia/Singapore': 'SG', 'Asia/Bangkok': 'TH', 'Asia/Kuala_Lumpur': 'SG',
      'Europe/London': 'GB', 'Europe/Paris': 'FR', 'Europe/Rome': 'IT', 'Europe/Madrid': 'ES',
    };
    if (TZ[tz]) return TZ[tz];
    if (tz.startsWith('America/')) return 'US';
    if (tz.startsWith('Australia/')) return 'AU';
    if (tz.startsWith('Europe/')) return 'FR';
    const region = (navigator.language || '').split('-')[1]?.toUpperCase();
    if (region) return region;
  } catch { /* ignore */ }
  return 'global';
}

const AppContext = createContext<Ctx>(null as any);
export const useApp = () => useContext(AppContext);

/* ───────────────────────── Hash routing ───────────────────────── */
function parseHash(): Route {
  const raw = window.location.hash.replace(/^#\/?/, '');
  const [path, query] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const params: Record<string, string> = {};
  if (query) for (const kv of query.split('&')) { const [k, v] = kv.split('='); params[k] = decodeURIComponent(v || ''); }
  const name = (seg[0] || 'home') as RouteName;
  const valid: RouteName[] = ['home', 'explore', 'stay', 'dest', 'place', 'auth', 'book', 'confirm', 'trips', 'profile',
    'experiences', 'experience',
    'host-landing', 'host-today', 'host-listings', 'host-reservations', 'host-earnings', 'host-calendar', 'host-create'];
  if (!valid.includes(name)) return { name: 'home' };
  if ((name === 'stay' || name === 'book' || name === 'experience') && seg[1]) params.id = seg[1];
  return { name, params };
}

function toHash(name: RouteName, params?: Record<string, string>): string {
  let h = `#/${name}`;
  const p = { ...(params || {}) };
  if ((name === 'stay' || name === 'book' || name === 'experience') && p.id) { h += `/${p.id}`; delete p.id; }
  const q = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  if (q) h += `?${q}`;
  return h;
}

/* ───────────────────────── Provider ───────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [user, setUser] = useState<User | null>(() => readLS<User | null>(LS_USER, null));
  const [pending, setPending] = useState<Route | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [bookings, setBookings] = useState<Confirmation[]>(() => readLS<Confirmation[]>(LS_BOOKINGS, []));
  const [lastConfirmation, setLast] = useState<Confirmation | null>(null);
  const [favs, setFavs] = useState<Set<string>>(() => new Set(readLS<string[]>(LS_FAVS, [])));
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo({ top: 0, behavior: 'auto' }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  // Persist session, bookings and favourites across refreshes.
  useEffect(() => { writeLS(LS_USER, user); }, [user]);
  useEffect(() => { writeLS(LS_BOOKINGS, bookings); }, [bookings]);
  useEffect(() => { writeLS(LS_FAVS, [...favs]); }, [favs]);

  const navigate = (name: RouteName, params?: Record<string, string>) => {
    window.location.hash = toHash(name, params);
    // hashchange handles state; but set immediately for snappy feel
    setRoute({ name, params });
    window.scrollTo({ top: 0, behavior: 'auto' });
  };
  const back = () => window.history.back();

  const login = (u: User) => setUser(u);
  const logout = () => { setUser(null); navigate('home'); };

  const addBooking = (c: Confirmation) => { setBookings((b) => [c, ...b]); setLast(c); };

  const toggleFav = (id: string) =>
    setFavs((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const showToast = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2600);
  };

  const enterHost = () => navigate('host-landing'); // marketing/onboarding first, not the dashboard
  const exitHost = () => navigate('home');
  // Seed listings + any the host has published (persisted across refreshes).
  const [hostListings, setHostListings] = useState<HostListing[]>(() => readLS<HostListing[] | null>(LS_LISTINGS, null) ?? HOST_LISTINGS);
  const addHostListing = (l: HostListing) => setHostListings((s) => [l, ...s]);
  useEffect(() => { writeLS(LS_LISTINGS, hostListings); }, [hostListings]);

  // Host accounts keyed by login identifier (phone/email), persisted in the browser.
  const [hostAccounts, setHostAccounts] = useState<Record<string, HostAccount>>(loadHostAccounts);
  const hostAccount = user ? hostAccounts[user.identifier] || null : null;
  const getHostAccount = (identifier: string) => loadHostAccounts()[identifier] || null;
  const upsertHost = (verified: boolean) => {
    if (!user) return;
    setHostAccounts((prev) => {
      const cur = prev[user.identifier];
      const next = {
        ...prev,
        [user.identifier]: {
          identifier: user.identifier,
          name: user.name,
          verified: verified || !!cur?.verified,
          createdAt: cur?.createdAt || Date.now(),
        },
      };
      saveHostAccounts(next);
      return next;
    });
  };
  const registerHost = (verified = false) => upsertHost(verified);
  const verifyHost = () => upsertHost(true);

  // Identity verification (shared by guests + hosts), persisted per identifier.
  const [verifiedUsers, setVerifiedUsers] = useState<Record<string, VerifiedUser>>(loadVerified);
  const isVerified = user ? !!verifiedUsers[user.identifier] : false;
  const getVerified = (identifier: string) => loadVerified()[identifier] || null;
  const verifyIdentity = (identifier: string, name: string, idType = 'passport') => {
    setVerifiedUsers((prev) => {
      const next = { ...prev, [identifier]: { identifier, name, idType, verifiedAt: Date.now() } };
      saveVerified(next);
      return next;
    });
  };

  const [currency, setCurrencyState] = useState<CurrencyCode>(detectCurrency);
  const [country, setCountry] = useState<string>(detectCountry);
  const currencyTouched = useRef(false);
  const setCurrency = (c: CurrencyCode) => { currencyTouched.current = true; setCurrencyState(c); };

  // Live FX rates (keyless, CORS-ok) — refine the static approximations once loaded.
  const [rates, setRates] = useState<Record<string, number>>(RATE);
  useEffect(() => {
    let alive = true;
    fetch('https://open.er-api.com/v6/latest/USD')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (alive && d && d.result === 'success' && d.rates) setRates((prev) => ({ ...prev, ...d.rates }));
      })
      .catch(() => { /* keep static rates */ });
    return () => { alive = false; };
  }, []);

  // IP-based geolocation (keyless, CORS-ok) — the real physical country.
  // Overrides the instant timezone guess once it resolves.
  useEffect(() => {
    let alive = true;
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const code = d && (d.country as string | undefined)?.toUpperCase();
        if (!alive || !code) return;
        setCountry(code);
        if (!currencyTouched.current && COUNTRY_CURRENCY[code]) setCurrencyState(COUNTRY_CURRENCY[code]);
      })
      .catch(() => { /* keep timezone-based guess */ });
    return () => { alive = false; };
  }, []);
  const money = (usdAmount: number) => {
    const v = Math.round(usdAmount * (rates[currency] || RATE[currency] || 1));
    try {
      return new Intl.NumberFormat('en', { style: 'currency', currency, maximumFractionDigits: 0, currencyDisplay: 'narrowSymbol' }).format(v);
    } catch {
      return '$' + v.toLocaleString();
    }
  };

  const value: Ctx = {
    route, navigate, back, user, login, logout, pending, setPending,
    draft, setDraft, bookings, addBooking, lastConfirmation, favs, toggleFav, toast, showToast,
    enterHost, exitHost, hostListings, addHostListing,
    hostAccount, getHostAccount, registerHost, verifyHost,
    isVerified, getVerified, verifyIdentity,
    currency, setCurrency, money, country,
  };
  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

/* ───────────────────────── Pricing (mirrors the app exactly) ───────────────────────── */
export function nightsBetween(checkIn: string, checkOut: string): number {
  const a = new Date(checkIn).getTime();
  const b = new Date(checkOut).getTime();
  return Math.max(1, Math.round((b - a) / 86_400_000));
}

export function priceBreakdown(pricePerNight: number, nights: number, promoApplied: boolean) {
  const subtotal = nights * pricePerNight;
  const cleaningFee = Math.round(subtotal * 0.12); // 12% — matches BookingScreen
  const taxes = Math.round(subtotal * 0.08); // location-aware in app; flat 8% here
  const discount = promoApplied ? Math.round(subtotal * 0.1) : 0; // STAY10 → 10%
  const total = subtotal + cleaningFee + taxes - discount;
  return { subtotal, cleaningFee, taxes, discount, total };
}

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function makeBookingCode(): string {
  // Deterministic-free randomness is fine on web (Math.random allowed here, not in workflows).
  let s = '';
  for (let i = 0; i < 8; i++) s += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  return `STY-${s}`;
}

export const usd = (n: number) => `$${n.toLocaleString('en-US')}`;
