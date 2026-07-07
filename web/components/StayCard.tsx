'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { Listing } from '@/lib/types';
import { Price } from './Price';
import { useWishlist } from '@/lib/wishlist';

// Mirrors the mobile app's PropertyCard: swipeable image carousel with dots,
// a saved-heart (Rausch #FF385C when active), a verified shield, star rating,
// review count, and "+ taxes" pricing. `active`/`onHover`/`id` drive the split
// search view's list ↔ map sync.
export function StayCard({
  stay,
  active = false,
  onHover,
  id,
  linkQs,
}: {
  stay: Listing;
  active?: boolean;
  onHover?: (id: string | null) => void;
  id?: string;
  /** Optional query string (e.g. "checkIn=…&checkOut=…&guests=2") carried to the stay page. */
  linkQs?: string;
}) {
  const router = useRouter();
  const images = (stay.images || []).slice(0, 8);
  const [idx, setIdx] = useState(0);
  const [saved, toggle] = useWishlist(stay.id);
  const [pop, setPop] = useState(false);

  const isFav = stay.ratingCount > 0 && (stay.ratingAvg ?? 0) >= 4.8;
  const verified = stay.ratingCount > 0 || stay.instantBook;
  const count = images.length;
  const go = (n: number) => setIdx((p) => (n + count) % count);

  const onHeart = (e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation();
    toggle();
    setPop(true);
    setTimeout(() => setPop(false), 320);
  };

  return (
    <Link
      href={`/stay/${stay.id}${linkQs ? `?${linkQs}` : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`card${active ? ' is-active' : ''}`}
      id={id}
      onMouseEnter={onHover ? () => onHover(stay.id) : undefined}
      onMouseLeave={onHover ? () => onHover(null) : undefined}
    >
      <div className="photo">
        {/* Carousel track */}
        <div className="card-track" style={{ transform: `translateX(-${idx * 100}%)` }}>
          {images.length > 0 ? (
            images.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt={`${stay.title} photo ${i + 1}`} loading={i === 0 ? 'eager' : 'lazy'} draggable={false} />
            ))
          ) : (
            <div className="g-empty" style={{ height: '100%', width: '100%' }}>No photo</div>
          )}
        </div>

        {/* Save heart */}
        <button
          type="button"
          className={`card-heart${saved ? ' is-saved' : ''}${pop ? ' is-pop' : ''}`}
          onClick={onHeart}
          aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" aria-hidden>
            <path d="M12 20.5S3.5 14.6 3.5 8.9A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.5 2.3c0 5.7-8.5 11.6-8.5 11.6Z" />
          </svg>
        </button>

        {/* Badge (top-left) */}
        {isFav ? (
          <span className="card-badge">Guest favourite</span>
        ) : stay.instantBook ? (
          <span className="card-badge">Instant book</span>
        ) : null}

        {/* Carousel controls + dots (only when >1 photo) */}
        {count > 1 && (
          <>
            <button type="button" className="card-nav card-prev" aria-label="Previous photo"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(idx - 1); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
            <button type="button" className="card-nav card-next" aria-label="Next photo"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); go(idx + 1); }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
            <div className="card-dots">
              {images.map((_, i) => (
                <span key={i} className={`card-dot${i === idx ? ' is-on' : ''}`} />
              ))}
            </div>
          </>
        )}
      </div>

      <div className="meta">
        <div className="row">
          <span className="title-wrap">
            <span className="title">{stay.title}</span>
            {verified && (
              <svg className="verified-ic" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                <path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /><path d="m9 12 2 2 4-4" />
              </svg>
            )}
          </span>
          {stay.ratingCount > 0 ? (
            <span className="rating">★ {stay.ratingAvg?.toFixed(2)}</span>
          ) : (
            <span className="rating">★ New</span>
          )}
        </div>
        <div className="place">{stay.city}{stay.country ? `, ${stay.country}` : ''}</div>
        {stay.ratingCount > 0 && <div className="card-reviews">{stay.ratingCount} review{stay.ratingCount > 1 ? 's' : ''}</div>}
        <div className="price">
          <Price usd={stay.priceUSD} bold suffix="night" /> <span className="price-taxes">+ taxes</span>
        </div>
      </div>
    </Link>
  );
}
