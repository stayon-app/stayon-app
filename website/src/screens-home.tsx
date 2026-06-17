import React, { useRef, useState } from 'react';
import { useApp } from './store';
import { Icon, StayCard, SectionHeader } from './ui';
import {
  SECTIONS, CATEGORIES, DESTINATIONS, COLLECTIONS, REELS, THINGS_TO_DO, STORIES, OFFERS, STAYS, stayById, stayMatches,
} from './data';

/* ───────────────────────── Hero ───────────────────────── */
function Hero() {
  const { navigate } = useApp();
  const [where, setWhere] = useState('');
  const search = () => navigate('explore', where ? { q: where } : undefined);
  return (
    <section className="hero">
      <div className="hero-bg" />
      <div className="hero-inner">
        <span className="hero-eyebrow">STAYON · STAY BEYOND ORDINARY</span>
        <h1 className="hero-title">Find a place you'll<br />never want to leave.</h1>
        <p className="hero-sub">Hand-picked homes, villas and hideaways in {DESTINATIONS.length}+ destinations — premium, fee-free, instantly bookable.</p>

        <div className="hero-search">
          <div className="hero-seg">
            <label>Where</label>
            <input value={where} onChange={(e) => setWhere(e.target.value)} placeholder="Search destinations"
              onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
          <div className="hero-seg sm">
            <label>Check in</label>
            <input type="date" />
          </div>
          <div className="hero-seg sm">
            <label>Check out</label>
            <input type="date" />
          </div>
          <div className="hero-seg sm">
            <label>Guests</label>
            <input placeholder="Add guests" />
          </div>
          <button className="hero-go" onClick={search} aria-label="Search"><Icon name="search" size={20} /></button>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Category pills ───────────────────────── */
function CategoryBar({ active, setActive }: { active: string; setActive: (id: string) => void }) {
  return (
    <div className="catbar">
      <div className="catbar-inner">
        {CATEGORIES.map((c) => (
          <button key={c.id} className={`catpill${active === c.id ? ' on' : ''}`} onClick={() => setActive(c.id)}>
            <span className="catpill-ico"><Icon name={c.icon} size={18} /></span>
            <span>{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ───────────────────────── Horizontal carousel ───────────────────────── */
function Carousel({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="carousel">
      <button className="car-arrow prev" onClick={() => scroll(-1)} aria-label="Left"><Icon name="chevL" size={18} /></button>
      <div className="car-track" ref={ref}>{children}</div>
      <button className="car-arrow next" onClick={() => scroll(1)} aria-label="Right"><Icon name="chevR" size={18} /></button>
    </div>
  );
}

/* ───────────────────────── Offer banner ───────────────────────── */
function OfferBanner() {
  const { navigate } = useApp();
  const o = OFFERS[0];
  return (
    <div className="offer" onClick={() => navigate('explore')}>
      <div className="offer-text">
        <h3>{o.title}</h3>
        <p>{o.description}</p>
      </div>
      <div className="offer-badge">{o.badge.replace(' OFF', '')}<small>OFF</small></div>
      <button className="offer-arrow" aria-label="Claim"><Icon name="arrow" size={20} /></button>
    </div>
  );
}

/* ───────────────────────── Home ───────────────────────── */
export function HomeScreen() {
  const { navigate } = useApp();
  const [cat, setCat] = useState('all');

  const sections = cat === 'all'
    ? SECTIONS
    : [{ id: cat, title: CATEGORIES.find((c) => c.id === cat)?.label + ' stays', subtitle: undefined, icon: CATEGORIES.find((c) => c.id === cat)?.icon, ids: STAYS.filter((s) => s.vibes.includes(cat)).map((s) => s.id) }];

  return (
    <>
      <Hero />
      <CategoryBar active={cat} setActive={setCat} />
      <main className="wrap">
        {/* Popular destinations */}
        <section className="block">
          <SectionHeader icon="globe" title="Popular destinations" subtitle="Trending cities to explore" action="See all" onAction={() => navigate('explore', { tab: 'destinations' })} />
          <Carousel>
            {DESTINATIONS.map((d) => (
              <button key={d.id} className="dest-card" onClick={() => navigate('explore', { q: d.city })}>
                <img src={d.image} alt={d.city} loading="lazy" />
                <span className="dest-tag">{d.stays} stays</span>
                <div className="dest-overlay">
                  <div className="dest-name">{d.city}</div>
                  <div className="dest-why">{d.why}</div>
                </div>
              </button>
            ))}
          </Carousel>
        </section>

        <OfferBanner />

        {/* Stay sections */}
        {sections.map((s) => (
          <section className="block" key={s.id}>
            <SectionHeader icon={s.icon} title={s.title} subtitle={s.subtitle} action="See all" onAction={() => navigate('explore')} />
            <Carousel>
              {s.ids.map((id) => { const st = stayById(id); return st ? <div className="car-cell" key={id}><StayCard stay={st} /></div> : null; })}
            </Carousel>
          </section>
        ))}

        {/* Curated collections */}
        <section className="block">
          <SectionHeader icon="sparkle" title="Curated collections" subtitle="Handpicked by our travel experts" />
          <div className="coll-grid">
            {COLLECTIONS.map((c) => (
              <button key={c.id} className="coll-card" onClick={() => navigate('explore')}>
                <img src={c.image} alt={c.title} loading="lazy" />
                <span className="coll-tag">{c.tag}</span>
                <div className="coll-overlay">
                  <h3>{c.title}</h3>
                  <span className="coll-count">{c.count} stays · Updated today</span>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* StayReels */}
        <section className="block">
          <SectionHeader icon="film" title="StayReels" subtitle="Real moments from real stays" action="Post a reel" onAction={() => navigate('explore', { tab: 'reels' })} />
          <Carousel>
            {REELS.map((r) => (
              <div className="reel-card" key={r.id}>
                <img src={r.thumbnail} alt={r.title} loading="lazy" />
                <span className="reel-play"><Icon name="play" size={16} fill /></span>
                <div className="reel-meta">
                  <div className="reel-title">{r.title}</div>
                  <div className="reel-views"><Icon name="play" size={11} fill /> {r.views} views</div>
                </div>
              </div>
            ))}
          </Carousel>
        </section>

        {/* Things to do */}
        <section className="block">
          <SectionHeader icon="map" title="Things to do" subtitle="Inspiration around the world" />
          <Carousel>
            {THINGS_TO_DO.map((t) => (
              <div className="todo-card" key={t.id}>
                <div className="todo-media"><img src={t.image} alt={t.title} loading="lazy" /><span className="todo-cat">{t.category}</span></div>
                <div className="todo-body">
                  <div className="todo-title">{t.title}</div>
                  <p className="todo-summary">{t.summary}</p>
                  <div className="todo-meta"><span><Icon name="pin" size={13} /> {t.location}</span><span><Icon name="clock" size={13} /> {t.duration}</span></div>
                </div>
              </div>
            ))}
          </Carousel>
        </section>

        {/* Travel stories */}
        <section className="block">
          <SectionHeader icon="book" title="Travel stories" subtitle="Inspiration from our community" action="Read more" />
          <div className="story-grid">
            {STORIES.map((s) => (
              <article className="story-card" key={s.id}>
                <div className="story-media"><img src={s.image} alt={s.title} loading="lazy" /></div>
                <div className="story-body">
                  <span className="story-cat">{s.category}</span>
                  <h3>{s.title}</h3>
                  <p>{s.excerpt}</p>
                  <div className="story-author">{s.author} · {s.date}</div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </>
  );
}

/* ───────────────────────── Explore ───────────────────────── */
export function ExploreScreen() {
  const { route, navigate } = useApp();
  const initialTab = (route.params?.tab as string) || 'stays';
  const [tab, setTab] = useState(initialTab);
  const [q, setQ] = useState(route.params?.q || '');
  const [filter, setFilter] = useState<string>('all');

  const QUICK = ['Instant book', 'Beachfront', 'Pool', 'Pets allowed', 'Under $200', 'Guest favourite'];
  const [chips, setChips] = useState<Set<string>>(new Set());
  const toggleChip = (c: string) => setChips((s) => { const n = new Set(s); n.has(c) ? n.delete(c) : n.add(c); return n; });

  let stays = STAYS;
  if (q.trim()) stays = stays.filter((s) => stayMatches(s, q));
  if (filter !== 'all') stays = stays.filter((s) => s.vibes.includes(filter));
  if (chips.has('Instant book')) stays = stays.filter((s) => s.instantBook);
  if (chips.has('Beachfront')) stays = stays.filter((s) => s.amenities.includes('Beachfront'));
  if (chips.has('Pool')) stays = stays.filter((s) => s.amenities.includes('Pool') || s.amenities.includes('Plunge pool'));
  if (chips.has('Pets allowed')) stays = stays.filter((s) => s.amenities.includes('Pets allowed'));
  if (chips.has('Under $200')) stays = stays.filter((s) => s.price < 200);
  if (chips.has('Guest favourite')) stays = stays.filter((s) => s.guestFavourite);

  return (
    <div className="explore">
      <div className="explore-top">
        <div className="explore-search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Where to? Try Paris, Goa, Malibu…" />
          {q && <button className="explore-clear" onClick={() => setQ('')}><Icon name="close" size={16} /></button>}
        </div>
        <div className="explore-tabs">
          {[['stays', 'Stays'], ['destinations', 'Destinations'], ['reels', 'Reels']].map(([id, label]) => (
            <button key={id} className={`etab${tab === id ? ' on' : ''}`} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
      </div>

      {tab === 'stays' && (
        <>
          <div className="quickbar">
            <div className="catbar-inner" style={{ padding: '10px 0' }}>
              {CATEGORIES.map((c) => (
                <button key={c.id} className={`chip${filter === c.id ? ' on' : ''}`} onClick={() => setFilter(c.id)}>
                  <Icon name={c.icon} size={15} /> {c.label}
                </button>
              ))}
            </div>
          </div>
          <div className="quickbar">
            <div className="catbar-inner" style={{ padding: '10px 0' }}>
              {QUICK.map((c) => (
                <button key={c} className={`chip${chips.has(c) ? ' on' : ''}`} onClick={() => toggleChip(c)}>{c}</button>
              ))}
            </div>
          </div>
          <main className="wrap">
            <div className="explore-count">{stays.length} {stays.length === 1 ? 'stay' : 'stays'} {q ? `in “${q}”` : 'worldwide'}</div>
            {stays.length === 0 ? (
              <div className="empty">
                <div className="empty-ico"><Icon name="search" size={42} /></div>
                <h3>No stays match “{q}”</h3>
                <p>Try a city, state or country — for example:</p>
                <div className="search-suggest">
                  {['New York', 'Goa', 'Paris', 'California', 'Spain', 'Beachfront'].map((s) => (
                    <button key={s} className="chip" onClick={() => { setQ(s); setFilter('all'); setChips(new Set()); }}>{s}</button>
                  ))}
                </div>
                <button className="btn-outline" onClick={() => { setQ(''); setFilter('all'); setChips(new Set()); }}>Clear all filters</button>
              </div>
            ) : (
              <div className="grid">{stays.map((s) => <StayCard key={s.id} stay={s} />)}</div>
            )}
          </main>
        </>
      )}

      {tab === 'destinations' && (
        <main className="wrap">
          <div className="grid dest-grid">
            {DESTINATIONS.map((d) => (
              <button key={d.id} className="dest-card tall" onClick={() => { setQ(d.city); setTab('stays'); }}>
                <img src={d.image} alt={d.city} loading="lazy" />
                <div className="dest-overlay">
                  <div className="dest-name">{d.city}, {d.country}</div>
                  <div className="dest-why">{d.why} · {d.bestSeason}</div>
                  <div className="dest-stays">{d.stays} stays available</div>
                </div>
              </button>
            ))}
          </div>
        </main>
      )}

      {tab === 'reels' && (
        <main className="wrap">
          <div className="reel-grid">
            {REELS.map((r) => (
              <div className="reel-card big" key={r.id}>
                <img src={r.thumbnail} alt={r.title} loading="lazy" />
                <span className="reel-play"><Icon name="play" size={20} fill /></span>
                <div className="reel-cap">{r.caption}</div>
                <div className="reel-meta">
                  <div className="reel-title">{r.title}</div>
                  <div className="reel-views">{r.location} · {r.views} views</div>
                </div>
              </div>
            ))}
          </div>
        </main>
      )}
    </div>
  );
}
