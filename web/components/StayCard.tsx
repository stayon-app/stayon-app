import Link from 'next/link';
import type { Listing } from '@/lib/types';
import { Price } from './Price';

export function StayCard({ stay }: { stay: Listing }) {
  const photo = stay.images?.[0];
  return (
    <Link href={`/stay/${stay.id}`} className="card">
      <div className="photo">
        {photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photo} alt={stay.title} loading="lazy" />
        ) : null}
        {stay.instantBook ? <span className="badge">⚡ Instant book</span> : null}
      </div>
      <div className="meta">
        <div className="row">
          <span className="title">{stay.title}</span>
          {stay.ratingCount > 0 ? (
            <span className="rating">★ {stay.ratingAvg?.toFixed(2)}</span>
          ) : (
            <span className="rating">★ New</span>
          )}
        </div>
        <div className="place">
          {stay.city}
          {stay.country ? `, ${stay.country}` : ''}
        </div>
        <div className="price">
          <Price usd={stay.priceUSD} bold suffix="night · 0% fee" />
        </div>
      </div>
    </Link>
  );
}
