'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { Listing } from '@/lib/types';
import { StayCard } from './StayCard';

// Airbnb-style horizontal row: scroll-snap track + prev/next chevrons that
// appear only when there's overflow to scroll. Title with an optional "see all"
// link. Cards are the shared StayCard.
export function StayCarousel({
  title,
  stays,
  href,
}: {
  title: string;
  stays: Listing[];
  href?: string;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const update = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 8);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }, []);

  useEffect(() => {
    update();
    const el = trackRef.current;
    if (!el) return;
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = trackRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  if (stays.length === 0) return null;

  return (
    <div className="carousel">
      <div className="carousel-head">
        <h2>
          {href ? <Link href={href}>{title} <span className="carousel-arrow" aria-hidden>→</span></Link> : title}
        </h2>
        <div className="carousel-nav">
          <button type="button" aria-label="Previous" disabled={!canPrev} onClick={() => scrollBy(-1)}>
            <Chevron dir="left" />
          </button>
          <button type="button" aria-label="Next" disabled={!canNext} onClick={() => scrollBy(1)}>
            <Chevron dir="right" />
          </button>
        </div>
      </div>
      <div className="carousel-track" ref={trackRef}>
        {stays.map((stay) => (
          <div className="carousel-item" key={stay.id}>
            <StayCard stay={stay} />
          </div>
        ))}
      </div>
    </div>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}
