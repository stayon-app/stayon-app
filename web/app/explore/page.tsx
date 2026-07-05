'use client';

// Explore — the website's version of the app's Explore tab: a place search on
// top, Stays / Experiences / Destinations tabs, then "Stay near <city>" rails
// built from live inventory.
import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { StayCard } from '@/components/StayCard';
import { DestinationRail } from '@/components/DestinationRail';
import { WizIcon } from '@/components/WizIcon';
import { API } from '@/lib/stayonClient';
import type { Listing } from '@/lib/types';

type Tab = 'stays' | 'experiences' | 'destinations';

export default function ExplorePage() {
  const [all, setAll] = useState<Listing[] | null>(null);
  const [tab, setTab] = useState<Tab>('stays');
  const [q, setQ] = useState('');
  const [city, setCity] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API}/search`)
      .then((r) => r.json())
      .then((j) => !cancelled && setAll(j.results || []))
      .catch(() => !cancelled && setAll([]));
    return () => { cancelled = true; };
  }, []);

  // Cities ranked by inventory; the biggest is the default focus.
  const cities = useMemo(() => {
    const m = new Map<string, { city: string; country?: string; count: number }>();
    for (const s of all || []) {
      if (!s.city) continue;
      const k = s.city.toLowerCase();
      const cur = m.get(k);
      if (cur) cur.count += 1; else m.set(k, { city: s.city, country: s.country, count: 1 });
    }
    return [...m.values()].sort((a, b) => b.count - a.count);
  }, [all]);

  const focus = city || cities[0]?.city || null;
  const stays = useMemo(
    () => (all || []).filter((s) => focus && s.city?.toLowerCase() === focus.toLowerCase()),
    [all, focus],
  );
  const others = useMemo(
    () => (all || []).filter((s) => !focus || s.city?.toLowerCase() !== focus.toLowerCase()).slice(0, 8),
    [all, focus],
  );

  const suggestions = useMemo(() => {
    if (!q.trim()) return [];
    const n = q.trim().toLowerCase();
    return cities.filter((c) => c.city.toLowerCase().startsWith(n)).slice(0, 6);
  }, [q, cities]);

  return (
    <section className="section" style={{ paddingTop: 24 }}>
      <div className="container">
        {/* Place search */}
        <div className="explore-search">
          <WizIcon name="search" size={18} />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={focus ? `Exploring ${focus} — search another place…` : 'Search a place…'}
            aria-label="Search a place"
          />
          {suggestions.length > 0 && (
            <div className="explore-suggest">
              {suggestions.map((c) => (
                <button key={c.city} type="button" onClick={() => { setCity(c.city); setQ(''); }}>
                  <WizIcon name="location" size={15} /> {c.city}{c.country ? `, ${c.country}` : ''} <span>{c.count} stays</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tabs — like the app's Explore */}
        <div className="explore-tabs">
          {([['stays', 'Stays', 'home'], ['experiences', 'Experiences', 'sparkles'], ['destinations', 'Destinations', 'map']] as const).map(([id, label, ic]) => (
            <button key={id} type="button" className={`explore-tab${tab === id ? ' is-on' : ''}`} onClick={() => setTab(id)}>
              <WizIcon name={ic} size={20} />
              <span>{label}</span>
            </button>
          ))}
        </div>

        {tab === 'stays' && (
          <>
            <div className="section-head" style={{ marginTop: 26 }}>
              <h2>Explore stays</h2>
              {focus && <span className="muted explore-loc"><WizIcon name="location" size={14} /> {focus}{stays[0]?.country ? `, ${stays[0].country}` : ''}</span>}
            </div>

            {all === null ? (
              <div className="grid">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="skel-card"><div className="skeleton skel-photo" /><div className="skeleton skel-line" /><div className="skeleton skel-line skel-short" /></div>
                ))}
              </div>
            ) : stays.length > 0 ? (
              <>
                <h3 className="explore-sub">Stay near {focus}</h3>
                <div className="grid">
                  {stays.map((s) => <StayCard key={s.id} stay={s} />)}
                </div>
              </>
            ) : (
              <div className="empty">
                <h2>No stays in {focus || 'this area'} yet — coming soon</h2>
                <p>New places are added every week. Try another city below.</p>
              </div>
            )}

            {others.length > 0 && (
              <>
                <h3 className="explore-sub" style={{ marginTop: 40 }}>More places to explore</h3>
                <div className="grid">
                  {others.map((s) => <StayCard key={s.id} stay={s} />)}
                </div>
              </>
            )}

            <div className="explore-mapline">
              <Link href="/map" className="btn btn-outline">Open the map — search any area with a radius</Link>
            </div>
          </>
        )}

        {tab === 'experiences' && (
          <div className="empty" style={{ marginTop: 30 }}>
            <h2>Experiences are coming soon</h2>
            <p>Local tours, food walks and activities — launching here shortly. Stays are live now.</p>
            <button type="button" className="btn btn-primary" style={{ marginTop: 14 }} onClick={() => setTab('stays')}>Explore stays instead</button>
          </div>
        )}

        {tab === 'destinations' && (
          <div style={{ marginTop: 30 }}>
            <div className="section-head"><h2>Popular destinations</h2></div>
            <DestinationRail />
          </div>
        )}
      </div>
    </section>
  );
}
