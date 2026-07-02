'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useClerk } from '@clerk/nextjs';
import { useWishlist } from '@/components/WishlistProvider';
import { StayCard } from '@/components/StayCard';
import { API } from '@/lib/stayonClient';
import type { Listing } from '@/lib/types';

export default function WishlistsPage() {
  const { isLoaded, isSignedIn } = useAuth();
  const { openSignIn } = useClerk();
  const { ids, ready } = useWishlist();
  const [stays, setStays] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ready) return;
    const list = Array.from(ids);
    if (list.length === 0) {
      setStays([]);
      setLoading(false);
      return;
    }
    // Listing detail is public — fetch each saved stay
    Promise.all(
      list.map((id) =>
        fetch(`${API}/listings/${id}`).then((r) => (r.ok ? r.json() : null)).catch(() => null),
      ),
    ).then((rs) => {
      setStays(rs.filter((r): r is Listing => !!r && !!r.id));
      setLoading(false);
    });
  }, [ids, ready]);

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container empty">
        <h2>Log in to see your wishlists</h2>
        <p>Save stays you love — they sync across web and the app.</p>
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
          <h2>Wishlists</h2>
          <span className="muted">{ids.size} saved</span>
        </div>
        {loading || !ready ? (
          <p className="muted">Loading…</p>
        ) : stays.length === 0 ? (
          <div className="empty">
            <h2>No saved stays yet</h2>
            <p>Tap the heart on any stay to save it here.</p>
            <Link href="/search" className="btn btn-primary" style={{ marginTop: 16 }}>
              Explore stays
            </Link>
          </div>
        ) : (
          <div className="grid">
            {stays.map((s) => (
              <StayCard key={s.id} stay={s} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
