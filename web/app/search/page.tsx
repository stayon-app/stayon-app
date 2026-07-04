import Link from 'next/link';
import { searchStays } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { StayCard } from '@/components/StayCard';
import type { SearchParams } from '@/lib/types';

export const metadata = {
  title: 'Search stays · StayOn',
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | undefined };
}) {
  const params: SearchParams = {
    q: searchParams.q,
    guests: searchParams.guests,
    checkIn: searchParams.checkIn,
    checkOut: searchParams.checkOut,
    minPrice: searchParams.minPrice,
    maxPrice: searchParams.maxPrice,
  };
  const { results, total } = await searchStays(params);

  return (
    <section className="section">
      <div className="container">
        <div style={{ marginBottom: 32 }}>
          <SearchBar
            initialQ={searchParams.q || ''}
            initialGuests={searchParams.guests || ''}
            initialCheckIn={searchParams.checkIn || ''}
            initialCheckOut={searchParams.checkOut || ''}
          />
        </div>

        <div className="section-head">
          <h2>
            {searchParams.q ? `Stays in “${searchParams.q}”` : 'All stays'}
          </h2>
          <span className="muted">
            {total} {total === 1 ? 'place' : 'places'} ·{' '}
            <Link href="/map" className="map-link">🗺 Map view</Link>
          </span>
        </div>

        {results.length > 0 ? (
          <div className="grid">
            {results.map((stay) => (
              <StayCard key={stay.id} stay={stay} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>No stays match your search</h2>
            <p>Try a different destination or fewer filters.</p>
          </div>
        )}
      </div>
    </section>
  );
}
