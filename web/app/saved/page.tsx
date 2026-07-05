'use client';

// Saved stays — the website's version of the app's Wishlists tab. Hearts on
// any StayCard save ids to localStorage (lib/wishlist); this page resolves
// them against live listings and keeps in sync as hearts toggle.
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { StayCard } from '@/components/StayCard';
import { API } from '@/lib/stayonClient';
import { wishlistIds, onWishlistChange } from '@/lib/wishlist';
import type { Listing } from '@/lib/types';

export default function SavedPage() {
  const [ids, setIds] = useState<string[]>([]);
  const [all, setAll] = useState<Listing[] | null>(null);

  useEffect(() => {
    setIds(wishlistIds());
    return onWishlistChange(() => setIds(wishlistIds()));
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/search`)
      .then((r) => r.json())
      .then((j) => !cancelled && setAll(j.results || []))
      .catch(() => !cancelled && setAll([]));
    return () => { cancelled = true; };
  }, []);

  const saved = all?.filter((s) => ids.includes(s.id)) ?? null;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Saved stays</h2>
          {saved && <span className="muted">{saved.length} {saved.length === 1 ? 'stay' : 'stays'}</span>}
        </div>

        {saved === null ? (
          <div className="grid">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="skel-card">
                <div className="skeleton skel-photo" />
                <div className="skeleton skel-line" />
                <div className="skeleton skel-line skel-short" />
              </div>
            ))}
          </div>
        ) : saved.length > 0 ? (
          <div className="grid">
            {saved.map((s) => <StayCard key={s.id} stay={s} />)}
          </div>
        ) : (
          <div className="empty">
            <h2>Nothing saved yet</h2>
            <p>Tap the heart on any stay to keep it here for later.</p>
            <Link href="/search" className="btn btn-primary" style={{ marginTop: 16 }}>Browse stays</Link>
          </div>
        )}
      </div>
    </section>
  );
}
