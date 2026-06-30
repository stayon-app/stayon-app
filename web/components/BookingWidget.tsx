'use client';

import { useEffect, useState } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { usePrefs } from './PrefsProvider';
import { getQuote, ensureStayonSession, stayon } from '@/lib/stayonClient';

interface Quote {
  nights: number;
  nightlyUSD: number;
  subtotalUSD: number;
  cleaningUSD: number;
  taxesUSD: number;
  totalUSD: number;
}

export function BookingWidget({
  stayId,
  priceUSD,
  maxGuests,
  baseGuests,
  instantBook,
}: {
  stayId: string;
  priceUSD: number;
  maxGuests: number;
  baseGuests: number;
  instantBook: boolean;
}) {
  const { isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { format } = usePrefs();

  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(String(baseGuests || 1));
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoting, setQuoting] = useState(false);
  const [error, setError] = useState('');
  const [booking, setBooking] = useState(false);
  const [confirmed, setConfirmed] = useState<{ code: string; status: string } | null>(null);

  const datesValid = checkIn && checkOut && new Date(checkOut) > new Date(checkIn);

  useEffect(() => {
    if (!datesValid) {
      setQuote(null);
      return;
    }
    let cancelled = false;
    setQuoting(true);
    setError('');
    const qs = new URLSearchParams({ checkIn, checkOut, guests }).toString();
    getQuote(stayId, qs)
      .then((q) => !cancelled && setQuote(q))
      .catch(() => !cancelled && setError('Could not get a price for those dates.'))
      .finally(() => !cancelled && setQuoting(false));
    return () => {
      cancelled = true;
    };
  }, [stayId, checkIn, checkOut, guests, datesValid]);

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
      const res = await stayon.book({ listingId: stayId, checkIn, checkOut, guests: Number(guests) });
      setConfirmed({ code: res.code, status: res.status });
    } catch (e: any) {
      setError(e?.message || 'Could not complete the booking.');
    } finally {
      setBooking(false);
    }
  };

  if (confirmed) {
    return (
      <aside className="book-card">
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
    <aside className="book-card">
      <div className="price-lg">
        <b>{format(priceUSD)}</b> <span>/ night</span>
      </div>
      <div className="fee-note">0% platform fee · host keeps 100%</div>

      <div className="bw-dates">
        <label className="bw-field">
          <span>Check in</span>
          <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
        </label>
        <label className="bw-field">
          <span>Check out</span>
          <input type="date" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
        </label>
      </div>
      <label className="bw-field bw-guests">
        <span>Guests</span>
        <input type="number" min={1} max={maxGuests || undefined} value={guests} onChange={(e) => setGuests(e.target.value)} />
      </label>

      {quote && (
        <div className="bw-breakdown">
          <div className="bw-row">
            <span>{format(quote.nightlyUSD)} × {quote.nights} {quote.nights === 1 ? 'night' : 'nights'}</span>
            <span>{format(quote.subtotalUSD)}</span>
          </div>
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
