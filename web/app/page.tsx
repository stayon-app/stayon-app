import { searchStays } from '@/lib/api';
import { SearchBar } from '@/components/SearchBar';
import { StayCard } from '@/components/StayCard';

export default async function HomePage() {
  const { results } = await searchStays();
  const featured = results.slice(0, 8);

  return (
    <>
      <section className="hero">
        <div className="container">
          <h1>
            Extraordinary stays, <span className="accent">zero platform fees.</span>
          </h1>
          <p className="lede">
            Book direct on StayOn — guests pay less and hosts keep 100%. No commission, ever.
          </p>
          <SearchBar />
        </div>
      </section>

      <section className="section">
        <div className="container">
          <div className="section-head">
            <h2>Featured stays</h2>
            <span className="muted">{results.length} places live now</span>
          </div>
          {featured.length > 0 ? (
            <div className="grid">
              {featured.map((stay) => (
                <StayCard key={stay.id} stay={stay} />
              ))}
            </div>
          ) : (
            <div className="empty">
              <h2>No stays to show yet</h2>
              <p>Make sure the StayOn backend is running on its API base, then refresh.</p>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
