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

  // Availability is WHERE + WHEN + WHO. Until all three are provided, we do
  // not query the backend at all — the guest is prompted to complete the trio.
  const complete = !!(params.q && params.checkIn && params.checkOut && params.guests);
  const { results, total } = complete ? await searchStays(params) : { results: [], total: 0 };

  // Carried onto each stay link (Airbnb-style ?checkIn=…&checkOut=…&guests=…)
  // so the booking card opens pre-filled with the searched trip.
  const dateQs = new URLSearchParams(
    Object.entries({ checkIn: params.checkIn, checkOut: params.checkOut, guests: params.guests })
      .filter(([, v]) => !!v) as [string, string][],
  ).toString();

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

        {complete ? (
          <SearchResults stays={results} query={searchParams.q} total={total} dateQs={dateQs} />
        ) : (
          <div className="empty search-incomplete">
            <h2>Start your search</h2>
            <p>
              Pick a <b>destination</b>, your <b>dates</b> and <b>number of guests</b> above,
              then hit Search — we&apos;ll show only the stays that are actually available.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
