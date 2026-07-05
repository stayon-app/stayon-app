import Link from 'next/link';
import { searchStays } from '@/lib/api';
import type { Listing } from '@/lib/types';
import { SearchBar } from '@/components/SearchBar';
import { StayCard } from '@/components/StayCard';
<<<<<<< Updated upstream
import { CategoryRail } from '@/components/CategoryRail';
import { StayCarousel } from '@/components/StayCarousel';
import { DestinationRail } from '@/components/DestinationRail';
import { StoryCard } from '@/components/StoryCard';
import { Reveal } from '@/components/Reveal';
import { RotatingBg } from '@/components/RotatingBg';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { PromoPopup } from '@/components/PromoPopup';
import { WizIcon } from '@/components/WizIcon';
import { TRAVEL_STORIES } from '@/lib/stories';

// Soft, slowly-cycling travel backdrop behind the home search (under a light
// teal-tinted veil). Scenic, aspirational picks — water villas, island domes,
// tropical pools, alpine lakes.
const HOME_TOP_BG = [
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1600&q=80&auto=format&fit=crop',
];

const HOW = [
  { icon: 'search', title: 'Search & compare', body: 'Browse hand-picked homes with full photos, real prices and honest reviews — nothing hidden until checkout.' },
  { icon: 'flash', title: 'Book in a tap', body: 'Reserve instantly. Verified stays, secure payments, and the price you see is the price you pay.' },
  { icon: 'key', title: 'Arrive & unwind', body: 'Self check-in details, host messaging and 24/7 support — everything you need for a smooth stay.' },
];

// Group live stays by city, largest cities first, for the Airbnb-style rows.
function cityRows(stays: Listing[], max = 3) {
  const byCity = new Map<string, Listing[]>();
  for (const s of stays) {
    if (!s.city) continue;
    (byCity.get(s.city) ?? byCity.set(s.city, []).get(s.city)!).push(s);
  }
  return [...byCity.entries()]
    .filter(([, list]) => list.length >= 3)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, max)
    .map(([city, list]) => ({ city, list }));
}
=======
import { Reveal } from '@/components/Reveal';
import { TiltCard } from '@/components/TiltCard';
import { Price } from '@/components/Price';
>>>>>>> Stashed changes

export default async function HomePage() {
  const { results } = await searchStays();
  const rows = cityRows(results);
  const favourites = results.filter((s) => s.ratingCount > 0 && (s.ratingAvg ?? 0) >= 4.8).slice(0, 12);
  const featured = results.slice(0, 8);
  const heroPhotos = featured.filter((s) => s.images?.[0]).slice(0, 3);

  return (
    <>
<<<<<<< Updated upstream
      {/* Welcome offer — once per session */}
      <PromoPopup />

      {/* ── Search-forward top (Airbnb-style) ────────────── */}
      <section className="home-top">
        <RotatingBg images={HOME_TOP_BG} interval={6500} className="home-top-bg" />
        <div className="container">
          <div className="home-hero-mini">
            <h1>Find your next stay</h1>
            <p>Beach villas, mountain cabins and city lofts — nearby weekend escapes or across the world. No booking fees, ever.</p>
          </div>
          <div className="home-search">
            <SearchBar />
          </div>
=======
      <section className="hero">
        <div className="hero-blob hero-blob-a" />
        <div className="hero-blob hero-blob-b" />
        <div className="container">
          <Reveal>
            <h1>
              Extraordinary stays, <span className="accent">zero platform fees.</span>
            </h1>
            <p className="lede">
              Book direct on StayOn — guests pay less and hosts keep 100%. No commission, ever.
            </p>
            <SearchBar />
            <Link href="/map" className="map-link hero-map-link">
              🗺 Explore on the map — search any area with a custom radius
            </Link>
            <div className="hero-trust">
              <span className="hero-trust-item">0% platform fee</span>
              <span className="hero-trust-item">Verified guests &amp; hosts</span>
              <span className="hero-trust-item">Direct payouts, no middleman</span>
            </div>
          </Reveal>
          {heroPhotos.length >= 2 && (
            <Reveal delay={150}>
              <div className="hero-visual">
                {heroPhotos.map((stay) => (
                  <TiltCard className="hero-photo-card" maxTilt={4} key={stay.id}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={stay.images[0]} alt={stay.title} />
                    <div className="hpc-meta">
                      <div>
                        <div className="hpc-place">{stay.city}</div>
                        <div className="hpc-sub"><Price usd={stay.priceUSD} suffix="night" /></div>
                      </div>
                      {stay.ratingCount > 0 && (
                        <span className="hpc-rating">★ {stay.ratingAvg?.toFixed(2)}</span>
                      )}
                    </div>
                  </TiltCard>
                ))}
                <div className="hero-float-badge float-el">
                  <span className="hfb-icon">%</span>
                  <div>
                    <b>0% commission</b>
                    <span>Guests pay less, always</span>
                  </div>
                </div>
              </div>
            </Reveal>
          )}
>>>>>>> Stashed changes
        </div>
      </section>

      {/* ── Category rail (sticky-style row) ─────────────── */}
      <div className="cat-bar">
        <div className="container">
          <CategoryRail />
        </div>
      </div>

      {/* ── Recently viewed (client, renders only when present) ── */}
      <RecentlyViewed />

      {/* ── City carousels (live, grouped) ───────────────── */}
      {rows.length > 0 ? (
        <section className="section">
          <div className="container" style={{ display: 'grid', gap: 44 }}>
            {rows.map((row, i) => (
              <Reveal key={row.city} delay={i * 60}>
                <StayCarousel
                  title={`Stays in ${row.city}`}
                  stays={row.list.slice(0, 12)}
                  href={`/search?q=${encodeURIComponent(row.city)}`}
                />
              </Reveal>
            ))}
          </div>
        </section>
      ) : (
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Featured stays</h2>
                <span className="muted">{results.length} places live now</span>
              </div>
            </Reveal>
            {featured.length > 0 ? (
              <div className="grid">
                {featured.map((stay) => (
                  <StayCard key={stay.id} stay={stay} />
                ))}
              </div>
            ) : (
              <div className="empty">
                <h2>No stays to show yet</h2>
                <p>Make sure the StayOn backend is running, then refresh.</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* ── Guest favourites ─────────────────────────────── */}
      {favourites.length >= 3 && (
        <section className="section section-alt">
          <div className="container">
            <Reveal>
              <StayCarousel title="Guest favourites" stays={favourites} href="/search" />
            </Reveal>
          </div>
        </section>
      )}

      {/* ── Popular destinations ─────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head">
<<<<<<< Updated upstream
              <h2>Popular destinations</h2>
              <span className="muted">Trending places to explore right now</span>
            </div>
          </Reveal>
          <Reveal delay={80}>
            <DestinationRail />
          </Reveal>
        </div>
      </section>

      {/* ── Travel stories ───────────────────────────────── */}
      <section className="section section-alt">
        <div className="container">
          <Reveal>
            <div className="section-head">
              <h2>Travel stories</h2>
              <span className="muted">Guides &amp; inspiration for your next trip</span>
            </div>
          </Reveal>
          <div className="story-grid">
            {TRAVEL_STORIES.map((s, i) => (
              <Reveal key={s.title} delay={i * 80}>
                <StoryCard story={s} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="section-head center">
              <h2>How StayOn works</h2>
              <p>Everything the big platforms do — clean, quick and honest, from search to check-in.</p>
=======
              <h2>Featured stays</h2>
              <span className="muted">{results.length} places live now</span>
            </div>
          </Reveal>
          {featured.length > 0 ? (
            <div className="grid">
              {featured.map((stay) => (
                <StayCard key={stay.id} stay={stay} />
              ))}
>>>>>>> Stashed changes
            </div>
          </Reveal>
          <div className="feature-3up">
            {HOW.map((f, i) => (
              <Reveal key={f.title} delay={i * 90}>
                <div className="feature-card">
                  <div className="feature-icon"><WizIcon name={f.icon} size={26} /></div>
                  <h3>{f.title}</h3>
                  <p>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trust band ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="trust-band">
              <div className="trust-band-item">
                <div className="tbi-icon"><WizIcon name="shield" size={26} /></div>
                <h4>Verified &amp; secure</h4>
                <p>Every stay is checked and every payment stays safely on-platform.</p>
              </div>
              <div className="trust-band-item">
                <div className="tbi-icon"><WizIcon name="tag" size={26} /></div>
                <h4>No booking fees</h4>
                <p>The nightly price is the price — nothing sneaks in at checkout.</p>
              </div>
              <div className="trust-band-item">
                <div className="tbi-icon"><WizIcon name="clock" size={26} /></div>
                <h4>24/7 support</h4>
                <p>Real help before, during and after your stay, whenever you need a hand.</p>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CTA → host ───────────────────────────────────── */}
      <section className="section">
        <div className="container">
          <Reveal>
            <div className="cta-band">
              <h2>Have a place of your own?</h2>
              <p>List it on StayOn and reach travellers looking for stays just like yours.</p>
              <Link href="/host" className="btn btn-primary btn-lg">Become a host</Link>
            </div>
          </Reveal>
        </div>
      </section>
    </>
  );
}
