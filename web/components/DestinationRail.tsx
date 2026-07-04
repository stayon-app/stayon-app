import Link from 'next/link';
import { POPULAR_DESTINATIONS } from '@/lib/destinations';

// Popular-destination tiles — photo with a stay-count badge and a city label.
// Links into search for that city.
export function DestinationRail() {
  return (
    <div className="dest-grid">
      {POPULAR_DESTINATIONS.slice(0, 8).map((d) => (
        <Link key={d.city} href={`/search?q=${encodeURIComponent(d.city)}`} className="dest-tile">
          <span className="dest-tile-count">{d.stays} stays</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={d.image} alt={`${d.city}, ${d.country}`} loading="lazy" />
          <div className="dest-tile-label">
            <b>{d.city}</b>
            <span>{d.tagline}</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
