'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { usePrefs } from './PrefsProvider';
import { getQuote, ensureStayonSession, stayon, API } from '@/lib/stayonClient';
import { RangeCalendar, isoDay, fmtDay } from './RangeCalendar';

interface Quote {
  nights: number;
  nightlyUSD: number;
  subtotalUSD: number;
  discountUSD?: number;
  promo?: { code: string; valid: boolean; reason?: string; label?: string } | null;
  cleaningUSD: number;
  taxesUSD: number;
  totalUSD: number;
}

// "2026-07-31" → Date (local midnight); invalid/absent → null.
const parseIso = (s?: string) => {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  return Number.isNaN(+d) ? null : d;
};

export function BookingWidget({
  stayId,
  priceUSD,
  maxGuests,
  baseGuests,
  instantBook,
  initialCheckIn,
  initialCheckOut,
  initialGuests,
}: {
  stayId: string;
  priceUSD: number;
  maxGuests: number;
  baseGuests: number;
  instantBook: boolean;
  /** Optional ?checkIn/?checkOut/?guests carried from search (Airbnb-style deep link). */
  initialCheckIn?: string;
  initialCheckOut?: string;
  initialGuests?: string;
}) {
  const { isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { format } = usePrefs();

  const [ci, setCi] = useState<Date | null>(() => parseIso(initialCheckIn));
  const [co, setCo] = useState<Date | null>(() => parseIso(initialCheckOut));
  const [calOpen, setCalOpen] = useState(false);
  const calRef = useRef<HTMLDivElement>(null);
  const [guests, setGuests] = useState(
    String(Math.max(1, parseInt(initialGuests || '', 10) || baseGuests || 1)),
  );
  const [promo, setPromo] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ code: string; status: string } | null>(null);

  const checkIn = ci ? isoDay(ci) : '';
  const checkOut = co ? isoDay(co) : '';
  const datesValid = !!(ci && co && co > ci);

  // Reserved dates for THIS stay — struck out in the calendar so the guest
  // can see exactly which days are already taken.
  const [unavailable, setUnavailable] = useState<Set<string>>(new Set());
  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/listings/${stayId}/availability`)
      .then((r) => r.json())
      .then((a) => {
        if (cancelled) return;
        const set = new Set<string>();
        for (const b of a.booked || []) {
          for (let d = new Date(b.from + 'T00:00:00'); isoDay(d) < b.to; d.setDate(d.getDate() + 1)) set.add(isoDay(d));
        }
        for (const day of a.blocked || []) set.add(day);
        setUnavailable(set);
      })
      .catch(() => { /* calendar just won't grey days */ });
    return () => { cancelled = true; };
  }, [stayId]);
  const isBlocked = useMemo(() => (d: Date) => unavailable.has(isoDay(d)), [unavailable]);

  const pickDay = (d: Date) => {
    if (!ci || (ci && co)) { setCi(d); setCo(null); }
    else if (d > ci) setCo(d);
    else setCi(d);
  };

  // Close the calendar on outside click / Escape.
  useEffect(() => {
    if (!calOpen) return;
    const onDown = (e: MouseEvent) => {
      if (calRef.current && !calRef.current.contains(e.target as Node)) setCalOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setCalOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [calOpen]);

  useEffect(() => {
    if (!datesValid) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setError('');
    const qsObj: Record<string, string> = { checkIn, checkOut, guests };
    if (promo.trim()) qsObj.promo = promo.trim().toUpperCase();
    const qs = new URLSearchParams(qsObj).toString();
    getQuote(stayId, qs)
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setError('Could not get a price for those dates.'))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [stayId, checkIn, checkOut, guests, promo, datesValid]);

  const reserve = async () => {
    if (!datesValid) {
      setError('Pick your check-in and check-out dates.');
      return;
    }
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setBooking(true);
    setError('');
    try {
      const ok = await ensureStayonSession(() => getToken());
      if (!ok) {
        setError('Could not start your session. Please try again.');
        return;
      }
      const res = await stayon.book({
        listingId: stayId, checkIn, checkOut, guests: Number(guests),
        ...(promo.trim() && quote?.promo?.valid ? { promo: promo.trim().toUpperCase() } : {}),
      } as any);
      setConfirmed({ code: res.code, status: res.status });
    } catch (e: any) {
      setError(e?.message || 'Could not complete the booking.');
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <aside className="book-card" id="book-card">
        <div className="booked-check">✓</div>
        <h3 className="booked-title">
          {confirmed.status === 'confirmed' ? 'Booking confirmed!' : 'Request sent!'}
        </h3>
        <p className="booked-sub">
          {confirmed.status === 'confirmed'
            ? 'Your stay is booked.'
            : 'The host will confirm your request shortly.'}
        </p>
        <div className="booked-code">
          Confirmation code <b>{confirmed.code}</b>
        </div>
        <a href="/trips" className="btn btn-primary book-btn">
          View my trips
        </a>
      </aside>
    );
  }

  return (
    <aside className="book-card" id="book-card">
      <div className="price-lg">
        <b>{format(priceUSD)}</b> <span>/ night</span>
      </div>
      <div className="fee-note">No booking fees · the price you see is what you pay</div>

      {/* Custom StayOn calendar (not the browser default) — reserved dates
          are struck out so you can see exactly what's taken. */}
      <div className="bw-cal-wrap" ref={calRef}>
        <button type="button" className="bw-dates bw-dates-btn" onClick={() => setCalOpen((o) => !o)}>
          <span className="bw-field">
            <span>Check in</span>
            <b className={ci ? '' : 'bw-empty'}>{ci ? fmtDay(ci) : 'Add date'}</b>
          </span>
          <span className="bw-field">
            <span>Check out</span>
            <b className={co ? '' : 'bw-empty'}>{co ? fmtDay(co) : 'Add date'}</b>
          </span>
        </button>
        {calOpen && (
          <div className="sb-pop bw-cal-pop" role="dialog" aria-label="Choose dates">
            <RangeCalendar checkIn={ci} checkOut={co} onPick={pickDay} isBlocked={isBlocked} months={1} />
            <div className="cal-foot">
              <button type="button" className="cal-clear" onClick={() => { setCi(null); setCo(null); }}>Clear dates</button>
              <button type="button" className="btn btn-primary hf-sm" onClick={() => setCalOpen(false)} disabled={!datesValid}>Done</button>
            </div>
          </div>
        )}
      </div>
      <label className="bw-field bw-guests">
        <span>Guests</span>
        <input type="number" min={1} max={maxGuests || undefined} value={guests} onChange={(e) => setGuests(e.target.value)} />
      </label>

      {/* Promo code */}
      <label className="bw-field bw-promo">
        <span>Promo code</span>
        <input
          value={promo}
          onChange={(e) => setPromo(e.target.value.toUpperCase())}
          placeholder="e.g. STAYON10"
          autoComplete="off"
        />
      </label>
      {quote?.promo && !quote.promo.valid && (
        <p className="bw-promo-bad">“{quote.promo.code}” isn&apos;t a valid code.</p>
      )}

      {quote && (
        <div className="bw-breakdown">
          <div className="bw-row">
            <span>{format(quote.nightlyUSD)} × {quote.nights} {quote.nights === 1 ? 'night' : 'nights'}</span>
            <span>{format(quote.subtotalUSD + (quote.discountUSD || 0))}</span>
          </div>
          {(quote.discountUSD || 0) > 0 && quote.promo?.valid && (
            <div className="bw-row bw-discount">
              <span>{quote.promo.code} — {quote.promo.label || 'discount'}</span>
              <span>−{format(quote.discountUSD || 0)}</span>
            </div>
          )}
          {quote.cleaningUSD > 0 && (
            <div className="bw-row">
              <span>Cleaning fee</span>
              <span>{format(quote.cleaningUSD)}</span>
            </div>
          )}
          <div className="bw-row">
            <span>Taxes</span>
            <span>{format(quote.taxesUSD)}</span>
          </div>
          <div className="bw-row bw-total">
            <span>Total</span>
            <span>{format(quote.totalUSD)}</span>
          </div>
        </div>
      )}

      {error && <p className="modal-error" style={{ marginTop: 12 }}>{error}</p>}

      <button className="btn btn-primary book-btn" onClick={reserve} disabled={booking || quoting}>
        {booking ? 'Reserving…' : quoting ? 'Checking price…' : isSignedIn ? 'Reserve' : 'Log in to reserve'}
      </button>
      <p className="disclaimer">{instantBook ? 'Instant book · ' : ''}You won&apos;t be charged yet</p>
    </aside>
  );
}
