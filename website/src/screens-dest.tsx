import React, { useEffect, useState } from 'react';
import { useApp } from './store';
import { Icon, GradientButton, WikiImage } from './ui';
import { attractionsFor } from './data';

const FALLBACK = 'https://images.unsplash.com/photo-1500835556837-99ac94a94552?w=1400&q=80&auto=format&fit=crop';

export function DestPage() {
  const { route, navigate } = useApp();
  const place = route.params?.place || '';
  const attractions = attractionsFor(place);
  const [intro, setIntro] = useState('');

  useEffect(() => {
    setIntro('');
    if (!place) return;
    let alive = true;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (alive && d && d.extract) setIntro(d.extract); })
      .catch(() => { /* ignore */ });
    return () => { alive = false; };
  }, [place]);

  const goStays = () => navigate('explore', { q: place });

  return (
    <div className="destpage">
      <div className="dp-hero">
        <WikiImage title={place} fallback={FALLBACK} alt={place} className="dp-hero-img" />
        <div className="dp-scrim" />
        <button className="dp-back" onClick={() => navigate('home')}><Icon name="chevL" size={18} /> Back</button>
        <div className="dp-hero-in">
          <span className="dp-eyebrow"><Icon name="pin" size={13} /> DESTINATION</span>
          <h1>{place}</h1>
        </div>
      </div>

      <main className="wrap dp-body">
        {intro && <p className="dp-intro">{intro}</p>}
        <div className="dp-cta"><GradientButton icon="search" onClick={goStays}>Search stays in {place}</GradientButton></div>

        {attractions.length > 0 && (
          <>
            <h2 className="stay-h2 dp-h2">Top places to visit</h2>
            <div className="dp-grid">
              {attractions.map((a) => (
                <article className="dp-card" key={a.name} onClick={() => navigate('place', { name: a.name, near: place })}>
                  <div className="dp-card-media"><WikiImage title={a.name} fallback={FALLBACK} alt={a.name} /></div>
                  <div className="dp-card-b"><b>{a.name}</b><span>{a.blurb}</span></div>
                </article>
              ))}
            </div>
          </>
        )}

        <div className="dp-final">
          <h3>Ready to stay in {place}?</h3>
          <p>Browse fee-free homes and villas right where you want to be.</p>
          <GradientButton icon="arrow" onClick={goStays}>Find stays in {place}</GradientButton>
        </div>
      </main>
    </div>
  );
}

/* ───────────────────────── Attraction detail (real info via Wikipedia) ───────────────────────── */
export function AttractionPage() {
  const { route, navigate } = useApp();
  const name = route.params?.name || '';
  const near = route.params?.near || '';
  const [data, setData] = useState<{ extract?: string; desc?: string; img?: string; url?: string } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setData(null); setLoading(true);
    if (!name) return;
    let alive = true;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        setData(d ? { extract: d.extract, desc: d.description, img: d.originalimage?.source || d.thumbnail?.source, url: d.content_urls?.desktop?.page } : {});
        setLoading(false);
      })
      .catch(() => { if (alive) { setData({}); setLoading(false); } });
    return () => { alive = false; };
  }, [name]);

  return (
    <div className="destpage">
      <div className="dp-hero">
        <WikiImage title={name} fallback={FALLBACK} alt={name} className="dp-hero-img" />
        <div className="dp-scrim" />
        <button className="dp-back" onClick={() => (near ? navigate('dest', { place: near }) : navigate('home'))}><Icon name="chevL" size={18} /> Back</button>
        <div className="dp-hero-in">
          <span className="dp-eyebrow"><Icon name="pin" size={13} /> {near ? near.toUpperCase() : 'PLACE TO VISIT'}</span>
          <h1>{name}</h1>
          {data?.desc && <p className="dp-hero-desc">{data.desc}</p>}
        </div>
      </div>

      <main className="wrap dp-body">
        {loading && <p className="dp-intro">Loading details…</p>}
        {!loading && data?.extract && <p className="dp-intro">{data.extract}</p>}
        {!loading && !data?.extract && <p className="dp-intro">A must-visit highlight of {near || 'the area'}. Explore it, then find a great place to stay nearby.</p>}

        <div className="ap-actions">
          {data?.url && <a className="btn-outline" href={data.url} target="_blank" rel="noreferrer"><Icon name="book" size={15} /> Read more on Wikipedia</a>}
          {near && <GradientButton icon="search" onClick={() => navigate('explore', { q: near })}>Search stays in {near}</GradientButton>}
        </div>

        <div className="dp-final">
          <h3>Plan your trip{near ? ` to ${near}` : ''}</h3>
          <p>Find a premium, fee-free stay close to {name}.</p>
          <GradientButton icon="arrow" onClick={() => navigate('explore', near ? { q: near } : undefined)}>Browse stays</GradientButton>
        </div>
      </main>
    </div>
  );
}
