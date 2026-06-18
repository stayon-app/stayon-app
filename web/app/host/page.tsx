import Link from 'next/link';

export const metadata = {
  title: 'Become a host · StayOn',
  description: 'List your place on StayOn and keep 100% — zero commission, ever.',
};

export default function HostPage() {
  return (
    <section className="hero">
      <div className="container">
        <h1>
          Host on StayOn. <span className="accent">Keep 100%.</span>
        </h1>
        <p className="lede">
          Most platforms take 3–15% of every booking. StayOn takes <b>nothing</b>. List your
          place, set your price, and every rupee your guests pay is yours.
        </p>
        <div className="host-cta">
          <Link href="/search" className="btn btn-ghost">
            Browse stays
          </Link>
          <span className="host-note">
            Hosting tools (listings, calendar, payouts) live in the StayOn app — web hosting is coming soon.
          </span>
        </div>

        <div className="host-points">
          <div className="host-point">
            <span className="host-num">0%</span>
            <h3>Zero commission</h3>
            <p>No host fee, no guest fee. Keep every booking in full.</p>
          </div>
          <div className="host-point">
            <span className="host-num">★</span>
            <h3>One identity</h3>
            <p>Verified guests via one-person-one-ID — safer bookings.</p>
          </div>
          <div className="host-point">
            <span className="host-num">⚡</span>
            <h3>Instant payouts</h3>
            <p>Direct payouts with no platform middleman skimming the top.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
