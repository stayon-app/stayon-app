import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getGuide, DESTINATION_GUIDES } from '@/lib/destinationGuides';
import { Reveal } from '@/components/Reveal';
import type { Metadata } from 'next';

export function generateStaticParams() {
  return DESTINATION_GUIDES.map((g) => ({ slug: g.slug }));
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const g = getGuide(params.slug);
  if (!g) return { title: 'Destination · StayOn' };
  return { title: `${g.city}, ${g.country} — things to do · StayOn`, description: g.about.slice(0, 150) };
}

// Real, key-free travel data: Wikipedia's REST summary API gives a live,
// sourced description of the place. Server-side, cached a day, with the curated
// text as a fallback if it's unavailable. (Paid sources like Google Places /
// TripAdvisor can be swapped in here later behind the same shape.)
async function wikiExtract(city: string, country: string): Promise<string | null> {
  const titles = [`${city}`, `${city}, ${country}`];
  for (const t of titles) {
    try {
      const r = await fetch(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t)}?redirect=true`,
        { next: { revalidate: 86400 }, headers: { accept: 'application/json' } },
      );
      if (!r.ok) continue;
      const j = await r.json();
      if (j?.extract && j.type !== 'disambiguation' && j.extract.length > 80) return j.extract as string;
    } catch { /* fall through to curated */ }
  }
  return null;
}

export default async function DestinationPage({ params }: { params: { slug: string } }) {
  const g = getGuide(params.slug);
  if (!g) notFound();

  const live = await wikiExtract(g.city, g.country);
  const about = live || g.about;

  return (
    <>
      {/* Hero */}
      <section className="dg-hero">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={g.hero} alt={`${g.city}, ${g.country}`} />
        <div className="dg-hero-veil" />
        <div className="container dg-hero-copy">
          <span className="dg-eyebrow">Destination guide</span>
          <h1>{g.city}</h1>
          <p className="dg-sub">{g.country} · {g.tagline}</p>
        </div>
      </section>

      <div className="container dg-body">
        {/* About + facts */}
        <Reveal>
          <section className="dg-about">
            <div>
              <h2>About {g.city}</h2>
              <p>{about}</p>
              {live && <p className="dg-source">Description from Wikipedia</p>}
              <div className="dg-tags">
                {g.knownFor.map((k) => <span key={k} className="dg-tag">{k}</span>)}
              </div>
            </div>
            <aside className="dg-facts">
              <div className="dg-fact"><span>Population</span><b>{g.population}</b></div>
              <div className="dg-fact"><span>Best time to visit</span><b>{g.bestTime}</b></div>
              <div className="dg-fact"><span>Language</span><b>{g.language}</b></div>
              <div className="dg-fact"><span>Currency</span><b>{g.currency}</b></div>
            </aside>
          </section>
        </Reveal>

        {/* Popular places to visit */}
        <section className="dg-places">
          <Reveal>
            <div className="section-head">
              <h2>Popular places to visit</h2>
              <span className="muted">Top things to see &amp; do in {g.city}</span>
            </div>
          </Reveal>
          <div className="dg-grid">
            {g.attractions.map((a, i) => (
              <Reveal key={a.name} delay={i * 60}>
                <article className="dg-card">
                  <div className="dg-card-img">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={a.image} alt={a.name} loading="lazy" />
                    <span className="dg-card-cat">{a.category}</span>
                  </div>
                  <div className="dg-card-body">
                    <h3>{a.name}</h3>
                    <p>{a.blurb}</p>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Cross-link to stays (only place stays are mentioned) */}
        <Reveal>
          <div className="dg-cta">
            <div>
              <h3>Planning a trip to {g.city}?</h3>
              <p>When you&apos;re ready, find a place to stay — no booking fees.</p>
            </div>
            <Link href={`/search?q=${encodeURIComponent(g.city)}`} className="btn btn-primary">
              Find stays in {g.city}
            </Link>
          </div>
        </Reveal>

        <Link href="/" className="back-link">← Back to destinations</Link>
      </div>
    </>
  );
}
