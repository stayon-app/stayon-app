'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth, useClerk } from '@clerk/nextjs';
import { usePrefs } from '@/components/PrefsProvider';
import { CreateListingForm } from '@/components/CreateListingForm';
import { ensureStayonSession, host } from '@/lib/stayonClient';

export default function HostPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const { format } = usePrefs();

  const [listings, setListings] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string>('');

  const load = useCallback(async () => {
    const ok = await ensureStayonSession(() => getToken());
    if (!ok) {
      setError('Could not start your session.');
      setLoading(false);
      return;
    }
    try {
      const [l, r] = await Promise.all([host.myListings(), host.reservations()]);
      setListings(l.items || []);
      setReservations(r.items || []);
    } catch {
      setError('Could not load your host data.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [isLoaded, isSignedIn, load]);

  const act = async (id: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') => {
    setActing(id + action);
    try {
      await host.reservationAction(id, action);
      await load();
    } catch {
      setError('Action failed. Try again.');
    } finally {
      setActing('');
    }
  };

  // ── Signed-out: the pitch ────────────────────────────────
  if (!isLoaded || !isSignedIn) {
    return (
      <section className="hero">
        <div className="container">
          <h1>Host on StayOn. <span className="accent">Keep 100%.</span></h1>
          <p className="lede">
            Most platforms take 3–15% of every booking. StayOn takes <b>nothing</b>. List your place,
            set your price, and every rupee your guests pay is yours.
          </p>
          <div className="host-cta">
            <button className="btn btn-primary" onClick={() => openSignIn()} disabled={!isLoaded}>
              Log in to start hosting
            </button>
            <Link href="/search" className="btn btn-ghost">Browse stays</Link>
          </div>
          <div className="host-points">
            <div className="host-point"><span className="host-num">0%</span><h3>Zero commission</h3><p>No host fee, no guest fee. Keep every booking in full.</p></div>
            <div className="host-point"><span className="host-num">★</span><h3>One identity</h3><p>Verified guests — safer bookings.</p></div>
            <div className="host-point"><span className="host-num">⚡</span><h3>Instant payouts</h3><p>Direct payouts, no middleman skimming the top.</p></div>
          </div>
        </div>
      </section>
    );
  }

  // ── Signed-in: the dashboard ─────────────────────────────
  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Host dashboard</h2>
          {!creating && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New listing</button>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        {creating && (
          <CreateListingForm
            onCancel={() => setCreating(false)}
            onCreated={() => { setCreating(false); setLoading(true); load(); }}
          />
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {/* Reservations */}
            <h3 className="host-h3">Reservations</h3>
            {reservations.length === 0 ? (
              <p className="muted" style={{ marginBottom: 28 }}>No reservations yet.</p>
            ) : (
              <div className="trips-list" style={{ marginBottom: 32 }}>
                {reservations.map((r) => (
                  <div key={r.id} className="trip-card">
                    <div className="trip-main">
                      <span className={`trip-status trip-${r.status}`}>{r.status}</span>
                      <h3>{r.listingTitle}</h3>
                      <p className="trip-dates">{r.guestName} · {r.checkIn} → {r.checkOut} · {r.nights} nights</p>
                      <p className="trip-code">Code {r.code}</p>
                    </div>
                    <div className="host-actions-cell">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-primary hf-sm" disabled={acting === r.id + 'accept'} onClick={() => act(r.id, 'accept')}>Accept</button>
                          <button className="btn btn-ghost hf-sm" disabled={acting === r.id + 'decline'} onClick={() => act(r.id, 'decline')}>Decline</button>
                        </>
                      )}
                      {r.status === 'confirmed' && (
                        <button className="btn btn-ghost hf-sm" disabled={acting === r.id + 'checkout'} onClick={() => act(r.id, 'checkout')}>Check out</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Listings */}
            <h3 className="host-h3">Your listings ({listings.length})</h3>
            {listings.length === 0 ? (
              <p className="muted">No listings yet — create your first one above.</p>
            ) : (
              <div className="grid">
                {listings.map((l) => (
                  <Link key={l.id} href={`/stay/${l.id}`} className="card">
                    <div className="photo">
                      {l.images?.[0] ? <img src={l.images[0]} alt={l.title} /> : <div className="g-empty" style={{ height: '100%' }}>No photo</div>}
                      <span className="badge">{l.status}</span>
                    </div>
                    <div className="meta">
                      <div className="row"><span className="title">{l.title}</span></div>
                      <div className="place">{l.city}{l.country ? `, ${l.country}` : ''}</div>
                      <div className="price"><b>{format(l.priceUSD)}</b> <span>night</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
