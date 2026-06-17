import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Stay, HostListing } from './data';
import { HOST_LISTINGS } from './data';

/* ───────────────────────── Types ───────────────────────── */
export type RouteName =
  | 'home' | 'explore' | 'stay' | 'auth' | 'book' | 'confirm' | 'trips' | 'profile'
  | 'host-today' | 'host-listings' | 'host-reservations' | 'host-earnings' | 'host-calendar' | 'host-create';
export type Route = { name: RouteName; params?: Record<string, string> };

export type User = { name: string; identifier: string };

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
  // currency (USD by default; switches with login country)
  currency: CurrencyCode;
  setCurrency: (c: CurrencyCode) => void;
  money: (usdAmount: number) => string;
};

export type CurrencyCode = 'USD' | 'INR' | 'GBP' | 'EUR';
const RATE: Record<CurrencyCode, number> = { USD: 1, INR: 83, GBP: 0.79, EUR: 0.92 };
const SYMBOL: Record<CurrencyCode, string> = { USD: '$', INR: '₹', GBP: '£', EUR: '€' };
const LOCALE: Record<CurrencyCode, string> = { USD: 'en-US', INR: 'en-IN', GBP: 'en-GB', EUR: 'en-IE' };
// Dial code → currency, so login country drives the displayed currency.
export const DIAL_CURRENCY: Record<string, CurrencyCode> = { '+1': 'USD', '+91': 'INR', '+44': 'GBP', '+33': 'EUR', '+49': 'EUR' };

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
  const valid: RouteName[] = ['home', 'explore', 'stay', 'auth', 'book', 'confirm', 'trips', 'profile',
    'host-today', 'host-listings', 'host-reservations', 'host-earnings', 'host-calendar', 'host-create'];
  if (!valid.includes(name)) return { name: 'home' };
  if ((name === 'stay' || name === 'book') && seg[1]) params.id = seg[1];
  return { name, params };
}

function toHash(name: RouteName, params?: Record<string, string>): string {
  let h = `#/${name}`;
  const p = { ...(params || {}) };
  if ((name === 'stay' || name === 'book') && p.id) { h += `/${p.id}`; delete p.id; }
  const q = Object.entries(p).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join('&');
  if (q) h += `?${q}`;
  return h;
}

/* ───────────────────────── Provider ───────────────────────── */
export function AppProvider({ children }: { children: React.ReactNode }) {
  const [route, setRoute] = useState<Route>(() => parseHash());
  const [user, setUser] = useState<User | null>(null);
  const [pending, setPending] = useState<Route | null>(null);
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [bookings, setBookings] = useState<Confirmation[]>([]);
  const [lastConfirmation, setLast] = useState<Confirmation | null>(null);
  const [favs, setFavs] = useState<Set<string>>(new Set());
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const onHash = () => { setRoute(parseHash()); window.scrollTo({ top: 0, behavior: 'auto' }); };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

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

  const enterHost = () => navigate('host-today');
  const exitHost = () => navigate('home');
  const [hostListings, setHostListings] = useState<HostListing[]>(HOST_LISTINGS);
  const addHostListing = (l: HostListing) => setHostListings((s) => [l, ...s]);

  const [currency, setCurrency] = useState<CurrencyCode>('USD');
  const money = (usdAmount: number) => {
    const v = Math.round(usdAmount * RATE[currency]);
    return SYMBOL[currency] + v.toLocaleString(LOCALE[currency]);
  };

  const value: Ctx = {
    route, navigate, back, user, login, logout, pending, setPending,
    draft, setDraft, bookings, addBooking, lastConfirmation, favs, toggleFav, toast, showToast,
    enterHost, exitHost, hostListings, addHostListing, currency, setCurrency, money,
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
