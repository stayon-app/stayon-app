import { searchStays } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { SearchResults } from '@/components/SearchResults';
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
        <div className="search-sticky">
          <SearchBar
            initialQ={searchParams.q || ''}
            initialGuests={searchParams.guests || ''}
            initialCheckIn={searchParams.checkIn || ''}
            initialCheckOut={searchParams.checkOut || ''}
          />
        </div>

        <SearchResults stays={results} query={searchParams.q} total={total} />
      </div>
    </section>
  );
}
