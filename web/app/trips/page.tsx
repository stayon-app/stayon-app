'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useClerk } from '@clerk/nextjs';
import { usePrefs } from '@/components/PrefsProvider';
import { ensureStayonSession, stayon } from '@/lib/stayonClient';

interface Booking {
  id: string;
  code: string;
  listingId: string;
  listingTitle: string;
  checkIn: string;
  checkOut: string;
  nights: number;
  guests: number;
  totalUSD: number;
  status: string;
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Pending host approval',
  confirmed: 'Confirmed',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export default function TripsPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { format } = usePrefs();
  const [trips, setTrips] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const ok = await ensureStayonSession(() => getToken());
        if (!ok) {
          setError('Could not load your session.');
          return;
        }
        const res = await stayon.myBookings();
        setTrips(res.items || []);
      } catch {
        setError('Could not load your trips.');
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="container section">
        <p className="muted">Loading your trips…</p>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="container empty">
        <h2>Log in to see your trips</h2>
        <p>Your bookings travel with your account — on web and in the app.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openSignIn()}>
          Log in
        </button>
      </div>
    );
  }

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>My trips</h2>
          <span className="muted">{trips.length} {trips.length === 1 ? 'booking' : 'bookings'}</span>
        </div>

        {error && <p className="modal-error">{error}</p>}

        {trips.length === 0 && !error ? (
          <div className="empty">
            <h2>No trips yet</h2>
            <p>When you book a stay, it&apos;ll show up here.</p>
            <Link href="/search" className="btn btn-primary" style={{ marginTop: 16 }}>
              Find a stay
            </Link>
          </div>
        ) : (
          <div className="trips-list">
            {trips.map((t) => (
              <Link key={t.id} href={`/stay/${t.listingId}`} className="trip-card">
                <div className="trip-main">
                  <span className={`trip-status trip-${t.status}`}>{STATUS_LABEL[t.status] || t.status}</span>
                  <h3>{t.listingTitle}</h3>
                  <p className="trip-dates">
                    {t.checkIn} → {t.checkOut} · {t.nights} {t.nights === 1 ? 'night' : 'nights'} · {t.guests} guests
                  </p>
                  <p className="trip-code">Code {t.code}</p>
                </div>
                <div className="trip-total">{format(t.totalUSD)}</div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
