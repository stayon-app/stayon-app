import Link from 'next/link';
import { DESTINATION_GUIDES } from '@/lib/destinationGuides';

// Popular-destination tiles — each opens a DESTINATION GUIDE (places to visit,
// facts about the place), not a stays search.
export function DestinationRail() {
  return (
    <div className="dest-grid">
      {DESTINATION_GUIDES.slice(0, 8).map((g) => (
        <Link key={g.slug} href={`/destination/${g.slug}`} className="dest-tile">
          <span className="dest-tile-count">{g.attractions.length} places to visit</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={g.hero} alt={`${g.city}, ${g.country}`} loading="lazy" />
          <div className="dest-tile-label">
            <b>{g.city}</b>
            <span>{g.tagline}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
