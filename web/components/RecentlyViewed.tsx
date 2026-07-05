'use client';

// "Recently viewed" rail for the home page (mirrors the app). Client-only:
// reads localStorage ids, resolves them against live listings, renders a
// carousel. Renders nothing until there's something to show.
import { useEffect, useState } from 'react';
import { StayCarousel } from './StayCarousel';
import { API } from '@/lib/stayonClient';
import { recentlyViewedIds } from '@/lib/recentlyViewed';
import type { Listing } from '@/lib/types';

export function RecentlyViewed() {
  const [stays, setStays] = useState<Listing[]>([]);

  useEffect(() => {
    const ids = recentlyViewedIds();
    if (ids.length === 0) return;
    let cancelled = false;
    fetch(`${API}/search`)
      .then((r) => r.json())
      .then((j) => {
        if (cancelled) return;
        const byId = new Map<string, Listing>((j.results || []).map((s: Listing) => [s.id, s]));
        setStays(ids.map((id) => byId.get(id)).filter(Boolean) as Listing[]);
      })
      .catch(() => { /* rail simply doesn't render */ });
    return () => { cancelled = true; };
  }, []);

  if (stays.length < 2) return null;

  return (
    <section className="section" style={{ paddingBottom: 0 }}>
      <div className="container">
        <StayCarousel title="Recently viewed" stays={stays} href="/search" />
      </div>
    </section>
  );
}

/** Invisible recorder — drop into the stay-detail page. */
export function RecordStayView({ id }: { id: string }) {
  useEffect(() => {
    import('@/lib/recentlyViewed').then((m) => m.recordView(id));
  }, [id]);
  return null;
}
