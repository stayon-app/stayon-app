import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useApp, CURRENCIES, currencyName, currencySymbol } from './store';
import type { Stay } from './data';
import { COUNTRIES, POPULAR_ISO2, flagUrl, countryByIso2 } from './countries';
import { api } from './api';

/* ───────────────────────── Backend status pill (live vs local mode) ───────────────────────── */
export function BackendStatus() {
  const [status, setStatus] = useState<'checking' | 'live' | 'local'>('checking');
  const [hidden, setHidden] = useState(false);
  useEffect(() => { let alive = true; api.health().then((ok) => alive && setStatus(ok ? 'live' : 'local')); return () => { alive = false; }; }, []);
  if (status === 'checking' || hidden) return null;
  return (
    <button className={`be-status ${status}`} onClick={() => setHidden(true)} title="Click to dismiss">
      <i /> {status === 'live' ? 'Live backend' : 'Local mode'}
    </button>
  );
}

/* ───────────────────────── Brand logos (real, multi-colour) ───────────────────────── */
export function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

/* ───────────────────────── Phone country picker — real flags, all countries, searchable ───────────────────────── */
export function CountrySelect({ value, onChange }: { value: string; onChange: (iso2: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const sel = countryByIso2(value) || countryByIso2('us')!;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const query = q.trim().toLowerCase();
  const matches = query
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(query) || c.dial.includes(query) || c.iso2 === query)
    : null;
  const popular = POPULAR_ISO2.map((i) => countryByIso2(i)).filter(Boolean) as typeof COUNTRIES;

  const pick = (iso2: string) => { onChange(iso2); setOpen(false); setQ(''); };
  const Row = (c: { name: string; iso2: string; dial: string }) => (
    <button type="button" key={c.iso2 + c.dial} className={`cs-row${c.iso2 === value ? ' on' : ''}`} onClick={() => pick(c.iso2)}>
      <img className="cs-flag" src={flagUrl(c.iso2)} alt="" loading="lazy" />
      <span className="cs-name">{c.name}</span>
      <span className="cs-dial">{c.dial}</span>
    </button>
  );

  return (
    <div className="cs" ref={wrap}>
      <button type="button" className="cs-btn" onClick={() => setOpen((o) => !o)} aria-label="Select country">
        <img className="cs-flag" src={flagUrl(sel.iso2)} alt={sel.name} />
        <span className="cs-dial">{sel.dial}</span>
        <Icon name="chevD" size={14} />
      </button>
      {open && (
        <div className="cs-pop">
          <div className="cs-search">
            <Icon name="search" size={15} />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search country or code" />
          </div>
          <div className="cs-list">
            {matches ? (
              matches.length ? matches.map(Row) : <p className="cs-empty">No matches</p>
            ) : (
              <>
                <p className="cs-label">Popular</p>
                {popular.map(Row)}
                <p className="cs-label">All countries</p>
                {COUNTRIES.map(Row)}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ───────────────────────── Real place photos via Wikipedia REST (keyless, CORS-ok) ───────────────────────── */
const wikiCache = new Map<string, string>();
export function WikiImage({ title, fallback, alt, className }: { title?: string; fallback: string; alt?: string; className?: string }) {
  const [src, setSrc] = useState(fallback);
  useEffect(() => {
    setSrc(fallback);
    if (!title) return;
    if (wikiCache.has(title)) { setSrc(wikiCache.get(title)!); return; }
    let alive = true;
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const url = d && (d.originalimage?.source || d.thumbnail?.source);
        if (url) { wikiCache.set(title, url); if (alive) setSrc(url); }
      })
      .catch(() => { /* keep fallback */ });
    return () => { alive = false; };
  }, [title, fallback]);
  return <img src={src} alt={alt || ''} className={className} loading="lazy" draggable={false} />;
}

/* ───────────────────────── Monochrome line-icon set (single colour, currentColor) ───────────────────────── */
const PATHS: Record<string, React.ReactNode> = {
  // chrome
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
  star: <path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9L12 2Z" />,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  chevL: <path d="m15 18-6-6 6-6" />, chevR: <path d="m9 18 6-6-6-6" />,
  chevD: <path d="m6 9 6 6 6-6" />, chevU: <path d="m6 15 6-6 6 6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />, check: <path d="M20 6 9 17l-5-5" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  sparkle: <path d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-4.5L14 10m-4 4-2.5 2.5m9 0L14 14m-4-4L7.5 7.5" />,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  users: <><circle cx="9" cy="8" r="3.2" /><path d="M3 21a6 6 0 0 1 12 0" /><path d="M16 5.2a3.2 3.2 0 0 1 0 5.6M21 21a6 6 0 0 0-4-5.6" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />, minus: <path d="M5 12h14" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  play: <path d="M7 5v14l12-7Z" />,
  sliders: <><path d="M4 6h10M4 12h4M4 18h13" /><circle cx="18" cy="6" r="2.3" /><circle cx="11" cy="12" r="2.3" /><circle cx="20" cy="18" r="2.3" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  moon2: <path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8Z" />,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
  camera: <><path d="M3 8a2 2 0 0 1 2-2h2l1.5-2h7L19 6h2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" /><circle cx="12" cy="13" r="3.5" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></>,
  edit: <><path d="M4 20h4L18 10l-4-4L4 16Z" /><path d="m14 6 4 4" /></>,
  logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5M21 12H9" /></>,
  // categories / nav
  home: <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1Z" />,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5Z" /></>,
  film: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M8 4v16M16 4v16M3 9h5M3 15h5M16 9h5M16 15h5" /></>,
  umbrella: <><path d="M12 12v8a2 2 0 0 0 4 0" /><path d="M2.5 12a9.5 6 0 0 1 19 0Z" /><path d="M12 3v2" /></>,
  gem: <><path d="M6 3h12l3 5-9 12L3 8Z" /><path d="M3 8h18M9 3 6 8l6 12 6-12-3-5" /></>,
  mountain: <path d="m3 20 6-11 4 6 2-3 6 8Z" />,
  building: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>,
  waves: <path d="M2 7c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2M2 13c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 4 2" />,
  sunset: <><path d="M12 3v6M5.6 9.6 7 11M2 16h4M18 16h4m-5.4-5 1.4-1.4M2 20h20" /><path d="M8 16a4 4 0 0 1 8 0" /></>,
  snow: <path d="M12 2v20M4 6l16 12M20 6 4 18M12 6l-3 3m3-3 3 3m-3 9-3-3m3 3 3-3" />,
  tag: <><path d="M3 12V5a2 2 0 0 1 2-2h7l9 9-9 9Z" /><circle cx="8" cy="8" r="1.6" /></>,
  coin: <><circle cx="12" cy="12" r="9" /><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4" /></>,
  // amenities
  wifi: <><path d="M5 12.5a10 10 0 0 1 14 0M8 15.5a6 6 0 0 1 8 0" /><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none" /></>,
  utensils: <><path d="M7 3v8m-2-8v8a2 2 0 0 0 4 0V3M7 11v10" /><path d="M17 3c-1.5 0-3 2-3 5s1.5 4 3 4v9" /></>,
  parking: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 17V8h3.5a2.5 2.5 0 0 1 0 5H9" /></>,
  bath: <><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4Z" /><path d="M6 12V6a2 2 0 0 1 4 0M7 19l-1 2M18 19l1 2" /></>,
  flame: <path d="M12 2s5 4 5 9a5 5 0 0 1-10 0c0-2 1-3 1-3s0 2 2 2c1.5 0 1-3-1-5 2 0 3 1 3 1s-1-3-3-5Z" />,
  dumbbell: <path d="M3 9v6M6 7v10M18 7v10M21 9v6M6 12h12" />,
  laptop: <><rect x="4" y="5" width="16" height="11" rx="1.5" /><path d="M2 20h20" /></>,
  elevator: <><rect x="5" y="3" width="14" height="18" rx="1" /><path d="m9 9 1.5-2L12 9M12 15l1.5 2L15 15" /></>,
  paw: <><circle cx="7" cy="9" r="1.6" /><circle cx="12" cy="7" r="1.6" /><circle cx="17" cy="9" r="1.6" /><path d="M12 12c-3 0-5 2.5-5 4.5S9 19 12 19s5-.5 5-2.5S15 12 12 12Z" /></>,
  tree: <><path d="M12 2 7 9h3l-4 6h12l-4-6h3Z" /><path d="M12 15v6" /></>,
  thermo: <><path d="M10 4a2 2 0 0 1 4 0v9a4 4 0 1 1-4 0Z" /><circle cx="12" cy="17" r="1.5" fill="currentColor" stroke="none" /></>,
  coffee: <><path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5Z" /><path d="M17 9h2a2 2 0 0 1 0 5h-2M6 2v2M10 2v2M14 2v2" /></>,
  tv: <><rect x="3" y="5" width="18" height="12" rx="2" /><path d="M8 21h8M12 17v4" /></>,
  bed: <><path d="M3 18V7M3 11h12a4 4 0 0 1 4 4v3M21 18v-3" /><path d="M7 11V9a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v2" /></>,
  id: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="11" r="2" /><path d="M5.5 16a3 3 0 0 1 6 0M14 9h4M14 13h4" /></>,
  // sections / misc
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  book: <><path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2Z" /><path d="M4 19a2 2 0 0 1 2-2h13" /></>,
  gift: <><rect x="3" y="8" width="18" height="4" rx="1" /><path d="M5 12v9h14v-9M12 8v13" /><path d="M12 8S10 3 7.5 4.5 9 8 12 8Zm0 0s2-5 4.5-3.5S15 8 12 8Z" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 13h18" /></>,
  card: <><rect x="2" y="5" width="20" height="14" rx="2" /><path d="M2 10h20M6 15h4" /></>,
  buoy: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="3.5" /><path d="m5 5 4.5 4.5M14.5 14.5 19 19M19 5l-4.5 4.5M9.5 14.5 5 19" /></>,
  trending: <path d="m3 17 6-6 4 4 8-8M21 7v5h-5" />,
  wallet: <><rect x="3" y="6" width="18" height="14" rx="2" /><path d="M3 10h18M16 14h2" /></>,
  key: <><circle cx="8" cy="8" r="4" /><path d="m11 11 9 9-2 2-2-2 1-1-2-2 1-1" /></>,
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  clipboard: <><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4a3 3 0 0 1 6 0M9 11h6M9 15h4" /></>,
  inbox: <><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M3 13h5l1 2h6l1-2h5" /></>,
  chart: <><path d="M4 20V4M4 20h16" /><rect x="7" y="12" width="3" height="5" /><rect x="12" y="8" width="3" height="9" /><rect x="17" y="5" width="3" height="12" /></>,
  navigation: <path d="M3 11 21 3l-8 18-2-7-8-3Z" />,
  dollar: <path d="M12 2v20M16 6.5C16 4.5 14 4 12 4s-4 .8-4 3 2 2.8 4 3 4 1 4 3-2 3-4 3-4-.5-4-2.5" />,
  percent: <><path d="m5 19 14-14" /><circle cx="7" cy="7" r="2.2" /><circle cx="17" cy="17" r="2.2" /></>,
  moon: <path d="M21 12.8A8 8 0 1 1 11.2 3a6 6 0 0 0 9.8 9.8Z" />,
  // payment marks (monochrome)
  apple: <path d="M16 13c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1-.04 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.2ZM14 6.5c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2Z" fill="currentColor" stroke="none" />,
  paypal: <path d="M7 20 9 4h6c2.5 0 4 1.5 3.6 4-.5 3-2.6 4.2-5.6 4.2H10L9 20Z" />,
  google: <><path d="M21 12a9 9 0 1 1-2.6-6.3" /><path d="M21 12h-8" /></>,
};

export function Icon({ name, size = 20, fill = false, className, color }: { name: string; size?: number; fill?: boolean; className?: string; color?: string }) {
  const node = PATHS[name] || PATHS.check;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
      fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" style={color ? { color } : undefined} aria-hidden>
      {node}
    </svg>
  );
}

/* ───────────────────────── Wordmark (logo image to be added later) ───────────────────────── */
// Rotating brand motif — "StayOn travelling / experiencing / vibing …"
const STAYON_WORDS = ['travelling', 'experiencing', 'vibing', 'exploring', 'unwinding', 'wandering'];
function RotatingWord() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % STAYON_WORDS.length), 2400);
    return () => clearInterval(t);
  }, []);
  return <span className="brand-rot" key={i}>{STAYON_WORDS[i]}</span>;
}

export function Logo({ onClick, host, tagline }: { onClick?: () => void; host?: boolean; tagline?: boolean }) {
  return (
    <button className="brand" onClick={onClick} aria-label="StayOn home">
      <span className="brand-name">Stay<span className="brand-on">On</span></span>
      {tagline && <span className="brand-tag"><i className="brand-dot" /><RotatingWord /></span>}
      {host && <span className="brand-host">HOST</span>}
    </button>
  );
}

/* ───────────────────────── Gradient button ───────────────────────── */
export function GradientButton({ children, onClick, icon, full, disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; icon?: string; full?: boolean; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`gbtn${full ? ' full' : ''}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/* ───────────────────────── Rating ───────────────────────── */
export function Rating({ value, reviews, className }: { value: number; reviews?: number; className?: string }) {
  return (
    <span className={`rating${className ? ' ' + className : ''}`}>
      <Icon name="star" size={13} fill color="#F59E0B" />
      <b>{value.toFixed(2)}</b>
      {reviews != null && <span className="muted"> ({reviews})</span>}
    </span>
  );
}

/* ───────────────────────── Header / navbar (guest) ───────────────────────── */
export function Header() {
  const { navigate, user, route, enterHost, currency } = useApp();
  const [menu, setMenu] = useState(false);
  const [region, setRegion] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  // On home, the hero holds the big search; once it scrolls away, show a compact
  // search pill in the header so search is always reachable.
  useEffect(() => {
    if (route.name !== 'home') { setScrolled(true); return; }
    const onScroll = () => setScrolled(window.scrollY > 420);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, [route.name]);
  const tabs: { name: any; label: string; icon: string }[] = [
    { name: 'home', label: 'Stays', icon: 'home' },
    { name: 'experiences', label: 'Experiences', icon: 'sparkles' },
    { name: 'explore', label: 'Explore', icon: 'compass' },
  ];
  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo onClick={() => navigate('home')} tagline />

        {scrolled ? (
          <button className="nav-search" onClick={() => navigate('explore')} aria-label="Search stays">
            <span className="nav-search-seg">Anywhere</span>
            <span className="nav-search-div" />
            <span className="nav-search-seg">Any week</span>
            <span className="nav-search-div" />
            <span className="nav-search-seg dim">Add guests</span>
            <span className="nav-search-go"><Icon name="search" size={16} /></span>
          </button>
        ) : (
          <nav className="nav-tabs">
            {tabs.map((t) => (
              <button key={t.name} className={`nav-tab${route.name === t.name ? ' on' : ''}`} onClick={() => navigate(t.name)}>
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            ))}
            <button className="nav-tab" onClick={() => navigate('explore', { tab: 'reels' })}>
              <Icon name="film" size={18} /> Reels <i className="tag-new">NEW</i>
            </button>
          </nav>
        )}

        <div className="nav-right">
          <button className="nav-ghost" onClick={enterHost}>Become a host</button>
          <button className="nav-globe" aria-label="Language & currency" onClick={() => setRegion(true)}>
            <Icon name="globe" size={18} /> <span className="nav-cur">{currency}</span>
          </button>
          {region && <RegionModal onClose={() => setRegion(false)} />}
          <button className="nav-acct" onClick={() => setMenu((m) => !m)}>
            <Icon name="menu" size={16} />
            <span className="nav-av">{user ? user.name[0].toUpperCase() : <Icon name="user" size={15} />}</span>
          </button>
          {menu && (
            <>
              <div className="menu-bg" onClick={() => setMenu(false)} />
              <div className="acct-menu">
                {user ? (
                  <>
                    <div className="acct-hello">Hi, {user.name.split(' ')[0]}</div>
                    <button onClick={() => { setMenu(false); navigate('trips'); }}>My trips</button>
                    <button onClick={() => { setMenu(false); navigate('profile'); }}>Profile</button>
                    <div className="acct-sep" />
                    <button className="acct-strong" onClick={() => { setMenu(false); navigate('host-today'); }}>Switch to hosting</button>
                    <LogoutItem onDone={() => setMenu(false)} />
                  </>
                ) : (
                  <>
                    <button className="acct-strong" onClick={() => { setMenu(false); navigate('auth'); }}>Log in</button>
                    <button onClick={() => { setMenu(false); navigate('auth'); }}>Sign up</button>
                    <div className="acct-sep" />
                    <button onClick={() => { setMenu(false); enterHost(); }}>Become a host</button>
                    <button onClick={() => { setMenu(false); navigate('home'); }}>Help centre</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
function LogoutItem({ onDone }: { onDone: () => void }) {
  const { logout } = useApp();
  return <button className="acct-danger" onClick={() => { logout(); onDone(); }}>Log out</button>;
}

/* ───────────────────────── Region modal (globe → language + currency) ───────────────────────── */
const RM_LANGS = [
  { lang: 'English', region: 'United States' }, { lang: 'English', region: 'United Kingdom' }, { lang: 'English', region: 'India' }, { lang: 'English', region: 'Australia' },
  { lang: 'हिन्दी', region: 'भारत' }, { lang: 'తెలుగు', region: 'భారత్' }, { lang: 'தமிழ்', region: 'இந்தியா' }, { lang: 'বাংলা', region: 'ভারত' }, { lang: 'मराठी', region: 'भारत' },
  { lang: 'Français', region: 'France' }, { lang: 'Español', region: 'España' }, { lang: 'Español', region: 'México' }, { lang: 'Deutsch', region: 'Deutschland' },
  { lang: 'Italiano', region: 'Italia' }, { lang: 'Português', region: 'Brasil' }, { lang: 'Português', region: 'Portugal' }, { lang: 'Nederlands', region: 'Nederland' },
  { lang: '日本語', region: '日本' }, { lang: '한국어', region: '대한민국' }, { lang: '中文', region: '中国' }, { lang: '繁體中文', region: '台灣' },
  { lang: 'العربية', region: 'الإمارات' }, { lang: 'العربية', region: 'السعودية' }, { lang: 'Türkçe', region: 'Türkiye' }, { lang: 'Русский', region: 'Россия' },
  { lang: 'ไทย', region: 'ประเทศไทย' }, { lang: 'Tiếng Việt', region: 'Việt Nam' }, { lang: 'Bahasa', region: 'Indonesia' }, { lang: 'Bahasa', region: 'Malaysia' },
  { lang: 'Polski', region: 'Polska' }, { lang: 'Svenska', region: 'Sverige' }, { lang: 'Ελληνικά', region: 'Ελλάδα' }, { lang: 'עברית', region: 'ישראל' },
];

export function RegionModal({ onClose }: { onClose: () => void }) {
  const { currency, setCurrency, showToast } = useApp();
  const [tab, setTab] = useState<'lang' | 'cur'>('cur');
  const [lang, setLang] = useState('English · India');
  const [translate, setTranslate] = useState(true);
  // Portal to <body> — the nav's backdrop-filter would otherwise trap position:fixed.
  return createPortal((
    <div className="rm-bg" onClick={onClose}>
      <div className="rm" onClick={(e) => e.stopPropagation()}>
        <div className="rm-head">
          <button className="rm-x" onClick={onClose} aria-label="Close"><Icon name="close" size={20} /></button>
          <div className="rm-tabs">
            <button className={tab === 'lang' ? 'on' : ''} onClick={() => setTab('lang')}>Language &amp; region</button>
            <button className={tab === 'cur' ? 'on' : ''} onClick={() => setTab('cur')}>Currency</button>
          </div>
        </div>
        <div className="rm-body">
          {tab === 'cur' ? (
            <>
              <h3 className="rm-h">Choose a currency</h3>
              <div className="rm-grid">
                {CURRENCIES.map((c) => (
                  <button key={c} className={`rm-cur${currency === c ? ' on' : ''}`} onClick={() => { setCurrency(c); showToast(`Prices now shown in ${c}`); }}>
                    <span className="rm-sym">{currencySymbol(c)}</span>
                    <span className="rm-cur-t"><b>{currencyName(c)}</b><small>{c}</small></span>
                    {currency === c && <Icon name="check" size={16} className="rm-check" />}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="rm-translate">
                <div><b>Translation</b><span>Automatically translate descriptions &amp; reviews to your language.</span></div>
                <button className={`rm-toggle${translate ? ' on' : ''}`} onClick={() => setTranslate((t) => !t)} aria-label="Toggle translation"><i /></button>
              </div>
              <h3 className="rm-h">Choose a language and region</h3>
              <div className="rm-grid">
                {RM_LANGS.map((l) => { const key = `${l.lang} · ${l.region}`; return (
                  <button key={key} className={`rm-lang${lang === key ? ' on' : ''}`} onClick={() => { setLang(key); showToast(`Language set to ${l.lang}`); }}>
                    <b>{l.lang}</b><small>{l.region}</small>
                  </button>
                ); })}
              </div>
              <p className="rm-note">Language is a display preference — content stays available in English.</p>
            </>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}

/* ───────────────────────── Stay card ───────────────────────── */
export function StayCard({ stay }: { stay: Stay }) {
  const { navigate, favs, toggleFav, money } = useApp();
  const [idx, setIdx] = useState(0);
  const total = stay.images.length;
  const fav = favs.has(stay.id);
  const go = (e: React.MouseEvent, dir: 1 | -1) => { e.stopPropagation(); setIdx((i) => (i + dir + total) % total); };
  return (
    <article className="scard" onClick={() => navigate('stay', { id: stay.id })}>
      <div className="scard-media">
        <img src={stay.images[idx]} alt={stay.title} loading="lazy" draggable={false} />
        {stay.guestFavourite && <span className="scard-badge">Guest favourite</span>}
        {!stay.guestFavourite && stay.badge && <span className="scard-badge alt">{stay.badge}</span>}
        <button className={`scard-heart${fav ? ' on' : ''}`} aria-label="Save"
          onClick={(e) => { e.stopPropagation(); toggleFav(stay.id); }}>
          <Icon name="heart" size={18} fill={fav} />
        </button>
        {total > 1 && (
          <>
            <button className="scard-nav prev" onClick={(e) => go(e, -1)} aria-label="Previous"><Icon name="chevL" size={16} /></button>
            <button className="scard-nav next" onClick={(e) => go(e, 1)} aria-label="Next"><Icon name="chevR" size={16} /></button>
            <div className="scard-dots">{stay.images.map((_, i) => <span key={i} className={i === idx ? 'on' : ''} />)}</div>
          </>
        )}
        {stay.instantBook && <span className="scard-instant"><Icon name="bolt" size={12} fill /> Instant</span>}
      </div>
      <div className="scard-body">
        <div className="scard-line">
          <span className="scard-title">{stay.title}</span>
          <Rating value={stay.rating} />
        </div>
        <div className="scard-loc">{stay.location}</div>
        <div className="scard-price"><b>{money(stay.price)}</b> <span className="muted">night</span></div>
      </div>
    </article>
  );
}

/* ───────────────────────── Branded range calendar (replaces native date input) ───────────────────────── */
const pad = (n: number) => String(n).padStart(2, '0');
export const toISO = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export function Calendar({ start, end, onPick }: { start: string | null; end: string | null; onPick: (iso: string) => void }) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const [vy, setVy] = useState(today.getFullYear());
  const [vm, setVm] = useState(today.getMonth());
  const move = (d: number) => { let m = vm + d, y = vy; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setVm(m); setVy(y); };
  const firstDay = new Date(vy, vm, 1).getDay();
  const days = new Date(vy, vm + 1, 0).getDate();
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];
  const between = (id: string) => !!(start && end && id > start && id < end);
  return (
    <div className="cal2">
      <div className="cal2-nav">
        <button onClick={() => move(-1)} aria-label="Previous month"><Icon name="chevL" size={18} /></button>
        <b>{new Date(vy, vm).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b>
        <button onClick={() => move(1)} aria-label="Next month"><Icon name="chevR" size={18} /></button>
      </div>
      <div className="cal2-week">{['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((d) => <span key={d}>{d}</span>)}</div>
      <div className="cal2-grid">
        {cells.map((d, i) => {
          if (d === null) return <span key={i} />;
          const date = new Date(vy, vm, d); const id = toISO(date); const past = date < today;
          const isStart = id === start, isEnd = id === end;
          return (
            <button key={i} disabled={past} type="button"
              className={`cal2-day${isStart ? ' start' : ''}${isEnd ? ' end' : ''}${between(id) ? ' between' : ''}`}
              onClick={() => onPick(id)}><span>{d}</span></button>
          );
        })}
      </div>
    </div>
  );
}

/* ───────────────────────── Section header ───────────────────────── */
export function SectionHeader({ icon, title, subtitle, action, onAction }: {
  icon?: string; title: string; subtitle?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="shead">
      <div className="shead-left">
        {icon && <span className="shead-ico"><Icon name={icon} size={22} /></span>}
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action && <button className="shead-action" onClick={onAction}>{action} <Icon name="chevR" size={15} /></button>}
    </div>
  );
}

/* ───────────────────────── Toast ───────────────────────── */
export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast"><Icon name="check" size={16} /> {toast}</div>;
}

/* ───────────────────────── Footer ───────────────────────── */
export function Footer() {
  const { navigate } = useApp();
  const cols = [
    { h: 'Support', links: ['Help centre', 'Safety information', 'Cancellation options', 'Report a concern'] },
    { h: 'Hosting', links: ['StayOn your home', 'Host resources', 'Community forum', 'Hosting responsibly'] },
    { h: 'StayOn', links: ['Newsroom', 'New features', 'Careers', 'Investors'] },
  ];
  return (
    <footer className="footer">
      <div className="footer-grid">
        {cols.map((c) => (
          <div key={c.h} className="footer-col">
            <div className="footer-h">{c.h}</div>
            {c.links.map((l) => <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>)}
          </div>
        ))}
        <div className="footer-col footer-brandcol">
          <Logo onClick={() => navigate('home')} />
          <p className="footer-tag">Stay beyond ordinary.</p>
          <div className="footer-socials">
            <button aria-label="Instagram"><Icon name="camera" size={17} /></button>
            <button aria-label="Messages"><Icon name="msg" size={17} /></button>
            <button aria-label="Share"><Icon name="share" size={17} /></button>
          </div>
        </div>
      </div>
      <div className="footer-bar">
        <span>© 2026 StayOn, Inc.</span>
        <span>Privacy · Terms · Sitemap</span>
      </div>
    </footer>
  );
}
