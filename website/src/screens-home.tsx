import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from './store';
import { Icon, StayCard, SectionHeader, Calendar, GradientButton, WikiImage } from './ui';
import { StayMap } from './map';
import {
  SECTIONS, CATEGORIES, DESTINATIONS, COLLECTIONS, REELS, THINGS_TO_DO, STORIES, OFFERS, STAYS, stayById, stayMatches,
  generateStaysFor, AMENITY_ICON, contentFor, type Stay,
} from './data';

/* ───────────────────────── Hero + branded search ───────────────────────── */
const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : null;

function HeroSearch() {
  const { navigate, country } = useApp();
  const geoDests = contentFor(country).destinations;
  const [where, setWhere] = useState('');
  const [open, setOpen] = useState<null | 'where' | 'dates' | 'guests'>(null);
  const [checkIn, setCheckIn] = useState<string | null>(null);
  const [checkOut, setCheckOut] = useState<string | null>(null);
  const [g, setG] = useState({ adults: 0, children: 0, infants: 0, pets: 0 });
  const guests = g.adults + g.children;
  const stepG = (k: keyof typeof g, d: 1 | -1) => setG((p) => ({ ...p, [k]: Math.max(0, Math.min(16, p[k] + d)) }));
  const GUEST_ROWS: [keyof typeof g, string, string][] = [
    ['adults', 'Adults', 'Ages 13 or above'], ['children', 'Children', 'Ages 2 – 12'],
    ['infants', 'Infants', 'Under 2'], ['pets', 'Pets', 'Service animals welcome'],
  ];

  const sugg = geoDests.filter((d) => !where.trim() || (d.city + d.region + d.why).toLowerCase().includes(where.toLowerCase().trim()));

  const pick = (id: string) => {
    if (!checkIn || (checkIn && checkOut)) { setCheckIn(id); setCheckOut(null); }
    else if (id < checkIn) { setCheckIn(id); }
    else { setCheckOut(id); }
  };

  const search = () => { setOpen(null); navigate('explore', where.trim() ? { q: where.trim() } : undefined); };

  return (
    <div className="hero-search-wrap">
      <div className="hero-search">
        <div className={`hero-seg${open === 'where' ? ' active' : ''}`} onClick={() => setOpen('where')}>
          <label>Where</label>
          <input value={where} onChange={(e) => { setWhere(e.target.value); setOpen('where'); }}
            placeholder="Search destinations" onKeyDown={(e) => e.key === 'Enter' && search()} />
        </div>
        <div className={`hero-seg sm${open === 'dates' ? ' active' : ''}`} onClick={() => setOpen('dates')}>
          <label>Check in</label>
          <span className={`hero-val${checkIn ? '' : ' ph'}`}>{fmtDate(checkIn) || 'Add dates'}</span>
        </div>
        <div className={`hero-seg sm${open === 'dates' ? ' active' : ''}`} onClick={() => setOpen('dates')}>
          <label>Check out</label>
          <span className={`hero-val${checkOut ? '' : ' ph'}`}>{fmtDate(checkOut) || 'Add dates'}</span>
        </div>
        <div className={`hero-seg sm${open === 'guests' ? ' active' : ''}`} onClick={() => setOpen('guests')}>
          <label>Guests</label>
          <span className={`hero-val${guests ? '' : ' ph'}`}>{guests ? `${guests} guest${guests > 1 ? 's' : ''}` : 'Add guests'}</span>
        </div>
        <button className="hero-go" onClick={search} aria-label="Search"><Icon name="search" size={20} /></button>
      </div>

      {open && <div className="hero-pop-bg" onClick={() => setOpen(null)} />}

      {open === 'where' && (
        <div className="hero-pop where">
          <div className="pop-h">{where.trim() ? 'Destinations' : 'Popular destinations'}</div>
          {sugg.length ? (
            <div className="sugg-grid">
              {sugg.map((d) => (
                <button key={d.city} className="sugg" onClick={() => { setWhere(d.city); setOpen('dates'); }}>
                  <WikiImage title={d.city} fallback={d.img} className="sugg-img" />
                  <div><b>{d.city}, {d.region}</b><span>{d.why}</span></div>
                </button>
              ))}
            </div>
          ) : (
            <button className="sugg search-row" onClick={search}>
              <span className="sugg-ico"><Icon name="search" size={18} /></span>
              <div><b>Search “{where}”</b><span>Try a city, state or country</span></div>
            </button>
          )}
        </div>
      )}
      {open === 'dates' && (
        <div className="hero-pop cal">
          <Calendar start={checkIn} end={checkOut} onPick={pick} />
          <div className="cal-foot">
            <button className="link-btn" onClick={() => { setCheckIn(null); setCheckOut(null); }}>Clear dates</button>
            <button className="btn-outline sm" style={{ marginTop: 0 }} onClick={() => setOpen('guests')}>Next</button>
          </div>
        </div>
      )}
      {open === 'guests' && (
        <div className="hero-pop guests">
          {GUEST_ROWS.map(([k, label, sub]) => (
            <div className="guest-row" key={k}>
              <div><b>{label}</b><span>{sub}</span></div>
              <div className="stepper">
                <button onClick={() => stepG(k, -1)} disabled={g[k] <= 0}><Icon name="minus" size={16} /></button>
                <span>{g[k]}</span>
                <button onClick={() => stepG(k, 1)}><Icon name="plus" size={16} /></button>
              </div>
            </div>
          ))}
          <button className="gbtn full" style={{ marginTop: 16 }} onClick={search}><Icon name="search" size={18} /> Search</button>
        </div>
      )}
    </div>
  );
}

const HERO_SLIDES = [
  { img: 'photo-1613490493576-7fde63acd811', word: 'private villa', place: 'Assagao, Goa' },
  { img: 'photo-1571896349842-33c89424de2d', word: 'poolside retreat', place: 'Oia, Santorini' },
  { img: 'photo-1520250497591-112f2f40a3f4', word: 'beachfront escape', place: 'Malibu, California' },
  { img: 'photo-1566073771259-6a8506099945', word: 'city loft', place: 'New York, USA' },
  { img: 'photo-1540541338287-41700207dee6', word: 'mountain cabin', place: 'Aspen, Colorado' },
];

function Hero() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((n) => (n + 1) % HERO_SLIDES.length), 4500);
    return () => clearInterval(t);
  }, [paused]);
  const slide = HERO_SLIDES[i];
  return (
    <section className="hero">
      <div className="hero-media">
        {HERO_SLIDES.map((s, n) => (
          <img key={s.img} src={`https://images.unsplash.com/${s.img}?w=3840&q=90&auto=format&fit=crop`} className={n === i ? 'on' : ''} alt="" />
        ))}
      </div>
      <div className="hero-inner">
        <span className="hero-eyebrow"><Icon name="sparkle" size={13} /> STAY BEYOND ORDINARY</span>
        <h1 className="hero-title">Find your perfect<br /><span key={i} className="hero-rot">{slide.word}.</span></h1>
        <HeroSearch />
        <div className="hero-foot">
          <div className="hero-dots" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
            {HERO_SLIDES.map((_, n) => (
              <button key={n} className={n === i ? 'on' : ''} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} />
            ))}
          </div>
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

/* ───────────────────────── Horizontal carousel (header arrows, never over cards) ───────────────────────── */
function Carousel({ children, seeAll, onSeeAll }: { children: React.ReactNode; seeAll?: string; onSeeAll?: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const scroll = (dir: 1 | -1) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.85, behavior: 'smooth' });
  return (
    <div className="carousel">
      <div className="car-ctrl">
        {onSeeAll && <button className="car-seeall" onClick={onSeeAll}>{seeAll || 'See all'} <Icon name="chevR" size={14} /></button>}
        <button className="car-arrow" onClick={() => scroll(-1)} aria-label="Scroll left"><Icon name="chevL" size={18} /></button>
        <button className="car-arrow" onClick={() => scroll(1)} aria-label="Scroll right"><Icon name="chevR" size={18} /></button>
      </div>
      <div className="car-track" ref={ref}>{children}</div>
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
const COUNTRY_STAY_LABEL: Record<string, string> = { IN: 'India', US: 'United States', GB: 'Britain', AE: 'Dubai', FR: 'France', JP: 'Japan', SG: 'Singapore' };

export function HomeScreen() {
  const { navigate, country } = useApp();
  const [cat, setCat] = useState('all');
  const geo = contentFor(country);
  const geoQuery = COUNTRY_STAY_LABEL[country] || 'worldwide';

  // Stays for the home carousels — located in the visitor's country (no other-country listings).
  const geoStays = useMemo(() => generateStaysFor(geoQuery, undefined, 16), [geoQuery]);
  const pool = cat === 'all' ? geoStays : geoStays.filter((s) => s.vibes.includes(cat));
  const staySections = cat === 'all'
    ? [
        { id: 'nearby', title: `Stays near you in ${geo.name}`, subtitle: 'Handpicked places around you', icon: 'pin', stays: pool.slice(0, 6) },
        { id: 'fav', title: 'Guest favourites', subtitle: `Most loved across ${geo.name}`, icon: 'gem', stays: pool.slice(6, 12) },
      ]
    : [{ id: cat, title: `${CATEGORIES.find((c) => c.id === cat)?.label} stays in ${geo.name}`, subtitle: undefined as string | undefined, icon: CATEGORIES.find((c) => c.id === cat)?.icon, stays: pool.slice(0, 12) }];

  return (
    <>
      <Hero />
      <CategoryBar active={cat} setActive={setCat} />
      <main className="wrap">
        {/* Popular destinations — geo-personalised */}
        <section className="block">
          <SectionHeader icon="globe" title={`Popular in ${geo.name}`} subtitle="Trending destinations near you" />
          <Carousel seeAll="See all" onSeeAll={() => navigate('explore', { tab: 'destinations' })}>
            {geo.destinations.map((d) => (
              <button key={d.city} className="dest-card" onClick={() => navigate('dest', { place: d.city })}>
                <WikiImage title={d.city} fallback={d.img} alt={d.city} />
                <span className="dest-tag">{d.region}</span>
                <div className="dest-overlay">
                  <div className="dest-name">{d.city}</div>
                  <div className="dest-why">{d.why}</div>
                </div>
              </button>
            ))}
          </Carousel>
        </section>

        <OfferBanner />

        {/* Stay sections — located in the visitor's country */}
        {staySections.map((s) => (
          <section className="block" key={s.id}>
            <SectionHeader icon={s.icon} title={s.title} subtitle={s.subtitle} />
            <Carousel seeAll="See all" onSeeAll={() => navigate('explore', { q: geoQuery })}>
              {s.stays.map((st) => <div className="car-cell" key={st.id}><StayCard stay={st} /></div>)}
            </Carousel>
          </section>
        ))}

        {/* StayReels */}
        <section className="block">
          <SectionHeader icon="film" title="StayReels" subtitle="Real moments from real stays" />
          <Carousel seeAll="Post a reel" onSeeAll={() => navigate('explore', { tab: 'reels' })}>
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

        {/* Things to do — geo-personalised */}
        <section className="block">
          <SectionHeader icon="map" title="Things to do" subtitle={`Experiences across ${geo.name}`} />
          <Carousel>
            {geo.thingsToDo.map((t) => (
              <div className="todo-card" key={t.title}>
                <div className="todo-media"><img src={t.img} alt={t.title} loading="lazy" /><span className="todo-cat">{t.category}</span></div>
                <div className="todo-body">
                  <div className="todo-title">{t.title}</div>
                  <p className="todo-summary">{t.summary}</p>
                  <div className="todo-meta"><span><Icon name="pin" size={13} /> {t.location}</span><span><Icon name="clock" size={13} /> {t.duration}</span></div>
                </div>
              </div>
            ))}
          </Carousel>
        </section>

        {/* Travel stories — geo-personalised */}
        <section className="block">
          <SectionHeader icon="book" title="Travel stories" subtitle={`Inspiration from ${geo.name}`} action="Read more" />
          <div className="story-grid">
            {geo.stories.map((s) => (
              <article className="story-card" key={s.title}>
                <div className="story-media"><img src={s.img} alt={s.title} loading="lazy" /></div>
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
const GEO_CACHE = new Map<string, { lat: number; lng: number } | null>();

export type Filters = {
  recommended: string[]; placeType: 'Any' | 'Room' | 'Entire home';
  minPrice: number; maxPrice: number; bedrooms: number; beds: number; baths: number;
  types: string[]; amenities: string[]; instant: boolean; selfCheckin: boolean; pets: boolean;
  accessibility: string[]; languages: string[];
};
const DEFAULT_FILTERS: Filters = { recommended: [], placeType: 'Any', minPrice: 10, maxPrice: 1000, bedrooms: 0, beds: 0, baths: 0, types: [], amenities: [], instant: false, selfCheckin: false, pets: false, accessibility: [], languages: [] };

// property-type label → keywords matched against a stay's type/title
const TYPE_KW: Record<string, string[]> = {
  House: ['house', 'home', 'bungalow'], Apartment: ['apartment', 'flat'], Villa: ['villa'], Cabin: ['cabin'],
  Loft: ['loft'], Cottage: ['cottage', 'farmhouse'], Hotel: ['hotel', 'resort'], Condo: ['condo', 'condominium'],
  Studio: ['studio'], Penthouse: ['penthouse', 'townhouse'],
};
const TYPE_IMG: Record<string, string> = {
  House: 'photo-1568605114967-8130f3a36994', Apartment: 'photo-1502672260266-1c1ef2d93688', Villa: 'photo-1613490493576-7fde63acd811',
  Cabin: 'photo-1449158743715-0a90ebb6d2d8', Loft: 'photo-1560448204-e02f11c3d0e2', Cottage: 'photo-1505691938895-1758d7feb511',
  Hotel: 'photo-1566073771259-6a8506099945', Condo: 'photo-1545324418-cc1a3fa10c00',
  Studio: 'photo-1493809842364-78817add7ffb', Penthouse: 'photo-1512917774080-9991f1c4c750',
};

function passFilters(s: Stay, f: Filters): boolean {
  if (s.price < f.minPrice || s.price > f.maxPrice) return false;
  if (f.placeType === 'Room' && !/room/i.test(s.type)) return false;
  if (f.placeType === 'Entire home' && /room/i.test(s.type)) return false;
  if (f.bedrooms && s.bedrooms < f.bedrooms) return false;
  if (f.beds && s.beds < f.beds) return false;
  if (f.baths && s.baths < f.baths) return false;
  if (f.types.length) {
    const hay = (s.type + ' ' + s.title).toLowerCase();
    if (!f.types.some((t) => (TYPE_KW[t] || [t.toLowerCase()]).some((k) => hay.includes(k)))) return false;
  }
  if (f.amenities.length && !f.amenities.every((a) => s.amenities.includes(a))) return false;
  if (f.recommended.includes('Guest favourite') && !s.guestFavourite) return false;
  if (f.recommended.includes('Instant Book') && !s.instantBook) return false;
  if (f.recommended.includes('Superhost') && !s.host.superhost) return false;
  if (f.instant && !s.instantBook) return false;
  if (f.pets && !s.amenities.includes('Pets allowed')) return false;
  return true;
}
function countActive(f: Filters): number {
  let n = 0;
  n += f.recommended.length;
  if (f.placeType !== 'Any') n++;
  if (f.minPrice !== 10 || f.maxPrice !== 1000) n++;
  if (f.bedrooms) n++; if (f.beds) n++; if (f.baths) n++;
  n += f.types.length + f.amenities.length + f.accessibility.length + f.languages.length;
  if (f.instant) n++; if (f.selfCheckin) n++; if (f.pets) n++;
  return n;
}

export function ExploreScreen() {
  const { route, navigate, money, country } = useApp();
  const geo = contentFor(country);
  const [tab, setTab] = useState((route.params?.tab as string) || 'stays');
  const [q, setQ] = useState(route.params?.q || '');
  const [filter, setFilter] = useState<string>('all');
  const [view, setView] = useState<'list' | 'map'>('list');
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setCenter(null); return; }
    const key = term.toLowerCase();
    if (GEO_CACHE.has(key)) { setCenter(GEO_CACHE.get(key)!); return; }
    let cancelled = false;
    const t = setTimeout(() => {
      fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(term)}`)
        .then((r) => r.json())
        .then((d) => { const hit = d && d[0] ? { lat: +d[0].lat, lng: +d[0].lon } : null; GEO_CACHE.set(key, hit); if (!cancelled) setCenter(hit); })
        .catch(() => { if (!cancelled) setCenter(null); });
    }, 350);
    return () => { cancelled = true; clearTimeout(t); };
  }, [q]);

  const results = useMemo(() => {
    let base: Stay[];
    if (q.trim()) base = [...STAYS.filter((s) => stayMatches(s, q)), ...generateStaysFor(q, center || undefined)];
    else base = STAYS;
    let list = base;
    if (filter !== 'all') list = list.filter((s) => s.vibes.includes(filter));
    list = list.filter((s) => passFilters(s, filters));
    return list;
  }, [q, center, filter, filters]);

  const reset = () => { setQ(''); setFilter('all'); setFilters(DEFAULT_FILTERS); };
  const activeCount = countActive(filters);

  return (
    <div className="explore">
      <div className="explore-top">
        <div className="explore-search">
          <Icon name="search" size={18} />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search any city, state or country — Los Angeles, Goa, Japan…" />
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
          <main className="wrap">
            <div className="explore-bar">
              <div className="explore-count">{results.length} {results.length === 1 ? 'stay' : 'stays'} {q ? `in “${q}”` : 'worldwide'}</div>
              <div className="explore-actions">
                <button className={`filters-btn${activeCount ? ' on' : ''}`} onClick={() => setShowFilters(true)}>
                  <Icon name="sliders" size={16} /> Filters {activeCount > 0 && <i>{activeCount}</i>}
                </button>
                <div className="view-toggle">
                  <button className={view === 'list' ? 'on' : ''} onClick={() => setView('list')}><Icon name="grid" size={15} /> List</button>
                  <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}><Icon name="map" size={15} /> Map</button>
                </div>
              </div>
            </div>

            {results.length === 0 && (
              <div className="empty">
                <div className="empty-ico"><Icon name="search" size={42} /></div>
                <h3>No stays match your filters</h3>
                <p>Try a different search or clear your filters.</p>
                <button className="btn-outline" onClick={reset}>Clear all filters</button>
              </div>
            )}
            {results.length > 0 && view === 'list' && (
              <div className="grid">{results.map((s) => <StayCard key={s.id} stay={s} />)}</div>
            )}
            {results.length > 0 && view === 'map' && (
              <div className="explore-split">
                <div className="explore-listcol">
                  {results.map((s) => (
                    <div key={s.id} onMouseEnter={() => setActiveId(s.id)} onMouseLeave={() => setActiveId(null)}>
                      <StayCard stay={s} />
                    </div>
                  ))}
                </div>
                <div className="explore-mapcol">
                  <StayMap stays={results} center={center} money={money} activeId={activeId} onPick={(id) => navigate('stay', { id })} />
                </div>
              </div>
            )}
          </main>

          {showFilters && (
            <FiltersModal filters={filters} setFilters={setFilters} count={results.length} money={money} onClose={() => setShowFilters(false)} onClear={() => setFilters(DEFAULT_FILTERS)} />
          )}
        </>
      )}

      {tab === 'destinations' && (
        <main className="wrap">
          <div className="explore-count" style={{ margin: '22px 0 18px' }}>Popular destinations in {geo.name}</div>
          <div className="grid dest-grid">
            {geo.destinations.map((d) => (
              <button key={d.city} className="dest-card tall" onClick={() => navigate('dest', { place: d.city })}>
                <WikiImage title={d.city} fallback={d.img} alt={d.city} />
                <div className="dest-overlay">
                  <div className="dest-name">{d.city}</div>
                  <div className="dest-why">{d.region} · {d.why}</div>
                  <div className="dest-stays">Explore stays →</div>
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

/* ───────────────────────── Filters modal (mirrors the user app's filter sheet) ───────────────────────── */
const F_RECOMMENDED = ['Guest favourite', 'Instant Book', 'Superhost', 'Free cancellation'];
const F_TYPES = Object.keys(TYPE_KW);
const F_AMEN_ESSENTIAL = ['Wifi', 'Kitchen', 'Washer', 'Dryer', 'Air conditioning', 'Heating', 'Dedicated workspace', 'TV'];
const F_AMEN_MORE = ['Pool', 'Hot tub', 'Free parking', 'EV charger', 'Crib', 'Gym', 'BBQ grill', 'Breakfast', 'Indoor fireplace', 'Smoking allowed', 'Beachfront', 'Waterfront'];
const F_AMEN_ALL = [...F_AMEN_ESSENTIAL, ...F_AMEN_MORE];
const F_ACCESS = ['Step-free entrance', 'Wide entrance', 'Step-free bedroom', 'Accessible parking', 'Step-free bathroom', 'Shower grab bar'];
const F_LANGS = ['English', 'Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Chinese', 'Japanese', 'Arabic', 'Hindi'];
// histogram heights (a smooth right-skewed distribution), 32 bars
const HISTO = Array.from({ length: 32 }, (_, i) => { const x = (i - 8) / 7; return Math.max(0.12, Math.exp(-x * x / 2)); });

function FStepper({ label, val, set }: { label: string; val: number; set: (n: number) => void }) {
  return (
    <div className="fm-stepper">
      <span>{label}</span>
      <div className="stepper">
        <button onClick={() => set(Math.max(0, val - 1))} disabled={val <= 0}><Icon name="minus" size={16} /></button>
        <span>{val === 0 ? 'Any' : val >= 8 ? '8+' : String(val)}</span>
        <button onClick={() => set(Math.min(8, val + 1))}><Icon name="plus" size={16} /></button>
      </div>
    </div>
  );
}

function FAccordion({ title, openKey, open, setOpen, children }: { title: string; openKey: string; open: Set<string>; setOpen: (s: Set<string>) => void; children: React.ReactNode }) {
  const isOpen = open.has(openKey);
  return (
    <section>
      <button className="fm-acc" onClick={() => { const n = new Set(open); isOpen ? n.delete(openKey) : n.add(openKey); setOpen(n); }}>
        <h4 style={{ margin: 0 }}>{title}</h4><Icon name={isOpen ? 'chevU' : 'chevD'} size={20} />
      </button>
      {isOpen && <div className="fm-acc-body">{children}</div>}
    </section>
  );
}

function FiltersModal({ filters, setFilters, count, money, onClose, onClear }: {
  filters: Filters; setFilters: (f: Filters) => void; count: number; money: (n: number) => string; onClose: () => void; onClear: () => void;
}) {
  const f = filters;
  const [open, setOpen] = useState<Set<string>>(new Set(['amenities']));
  const [showAllAmen, setShowAllAmen] = useState(false);
  const upd = (patch: Partial<Filters>) => setFilters({ ...f, ...patch });
  const toggleArr = (key: 'recommended' | 'types' | 'amenities' | 'accessibility' | 'languages', v: string) => {
    const arr = f[key]; upd({ [key]: arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v] } as any);
  };
  const inRange = (i: number) => { const p = 10 + (i / HISTO.length) * 990; return p >= f.minPrice && p <= f.maxPrice; };

  return (
    <div className="fm-bg" onClick={onClose}>
      <div className="fm" onClick={(e) => e.stopPropagation()}>
        <div className="fm-head"><button onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button><b>Filters</b><span /></div>
        <div className="fm-body">
          <section><h4>Recommended for you</h4><div className="fm-chips">
            {F_RECOMMENDED.map((r) => <button key={r} className={`fm-chip${f.recommended.includes(r) ? ' on' : ''}`} onClick={() => toggleArr('recommended', r)}>{r}</button>)}
          </div></section>

          <section><h4>Type of place</h4><div className="fm-seg">
            {(['Any', 'Room', 'Entire home'] as const).map((p) => <button key={p} className={f.placeType === p ? 'on' : ''} onClick={() => upd({ placeType: p })}>{p === 'Any' ? 'Any type' : p}</button>)}
          </div></section>

          <section>
            <h4>Price range</h4>
            <p className="fm-sub">Nightly prices before fees and taxes</p>
            <div className="fm-histo">{HISTO.map((h, i) => <span key={i} className={inRange(i) ? 'on' : ''} style={{ height: `${h * 100}%` }} />)}</div>
            <div className="fm-range">
              <input type="range" min={10} max={1000} step={10} value={f.minPrice} onChange={(e) => upd({ minPrice: Math.min(+e.target.value, f.maxPrice - 50) })} />
              <input type="range" min={10} max={1000} step={10} value={f.maxPrice} onChange={(e) => upd({ maxPrice: Math.max(+e.target.value, f.minPrice + 50) })} />
            </div>
            <div className="fm-pricelabels"><span>{money(f.minPrice)}</span><span>{money(f.maxPrice)}{f.maxPrice >= 1000 ? '+' : ''}</span></div>
          </section>

          <section><h4>Rooms and beds</h4>
            <FStepper label="Bedrooms" val={f.bedrooms} set={(n) => upd({ bedrooms: n })} />
            <FStepper label="Beds" val={f.beds} set={(n) => upd({ beds: n })} />
            <FStepper label="Bathrooms" val={f.baths} set={(n) => upd({ baths: n })} />
          </section>

          <section><h4>Property type</h4><div className="fm-tiles">
            {F_TYPES.map((t) => (
              <button key={t} className={`fm-tile${f.types.includes(t) ? ' on' : ''}`} onClick={() => toggleArr('types', t)}>
                <img src={`https://images.unsplash.com/${TYPE_IMG[t]}?w=300&q=70&auto=format&fit=crop`} alt="" />
                {f.types.includes(t) && <span className="fm-tile-check"><Icon name="check" size={14} /></span>}
                <span className="fm-tile-label">{t}</span>
              </button>
            ))}
          </div></section>

          <FAccordion title="Amenities" openKey="amenities" open={open} setOpen={setOpen}>
            <div className="fm-amen">
              {(showAllAmen ? F_AMEN_ALL : F_AMEN_ESSENTIAL).map((a) => <button key={a} className={`fm-amenchip${f.amenities.includes(a) ? ' on' : ''}`} onClick={() => toggleArr('amenities', a)}><Icon name={AMENITY_ICON[a] || 'check'} size={18} /> {a}</button>)}
            </div>
            <button className="fm-showmore" onClick={() => setShowAllAmen((v) => !v)}>
              {showAllAmen ? 'Show less' : `Show all ${F_AMEN_ALL.length} amenities`}
              <Icon name={showAllAmen ? 'chevU' : 'chevD'} size={16} />
            </button>
          </FAccordion>

          <FAccordion title="Booking options" openKey="booking" open={open} setOpen={setOpen}>
            <label className="fm-toggle"><span><b>Instant Book</b><small>Book without waiting for host approval</small></span><input type="checkbox" checked={f.instant} onChange={(e) => upd({ instant: e.target.checked })} /></label>
            <label className="fm-toggle"><span><b>Self check-in</b><small>Easy access to the property</small></span><input type="checkbox" checked={f.selfCheckin} onChange={(e) => upd({ selfCheckin: e.target.checked })} /></label>
            <label className="fm-toggle"><span><b>Allows pets</b><small>Bringing a furry friend?</small></span><input type="checkbox" checked={f.pets} onChange={(e) => upd({ pets: e.target.checked })} /></label>
          </FAccordion>

          <FAccordion title="Accessibility features" openKey="access" open={open} setOpen={setOpen}>
            <div className="fm-chips">{F_ACCESS.map((a) => <button key={a} className={`fm-chip${f.accessibility.includes(a) ? ' on' : ''}`} onClick={() => toggleArr('accessibility', a)}>{a}</button>)}</div>
          </FAccordion>

          <FAccordion title="Host language" openKey="lang" open={open} setOpen={setOpen}>
            <div className="fm-chips">{F_LANGS.map((l) => <button key={l} className={`fm-chip${f.languages.includes(l) ? ' on' : ''}`} onClick={() => toggleArr('languages', l)}>{l}</button>)}</div>
          </FAccordion>
        </div>
        <div className="fm-foot">
          <button className="fm-clear" onClick={onClear}>Clear all</button>
          <GradientButton onClick={onClose}>Show {count} {count === 1 ? 'stay' : 'stays'}</GradientButton>
        </div>
      </div>
    </div>
  );
}
