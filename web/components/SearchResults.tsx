'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { StayCard } from './StayCard';
import { usePrefs } from './PrefsProvider';
import type { Listing } from '@/lib/types';

// Map touches window → client-only, no SSR.
const SearchMap = dynamic(() => import('./SearchMap').then((m) => m.SearchMap), {
  ssr: false,
  loading: () => <div className="search-map"><div className="search-map-empty">Loading map…</div></div>,
});

const PAGE_SIZE = 18;

type Filters = { maxPrice: number; minBeds: number; type: string; instant: boolean; fav: boolean };

export function SearchResults({ stays, query, total }: { stays: Listing[]; query?: string; total: number }) {
  const { format } = usePrefs();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);

  // Price bound + property types from the current result set.
  const priceCap = useMemo(() => Math.max(50, ...stays.map((s) => s.priceUSD || 0)), [stays]);
  const types = useMemo(() => ['Any', ...Array.from(new Set(stays.map((s) => s.type).filter(Boolean)))], [stays]);
  const [f, setF] = useState<Filters>({ maxPrice: priceCap, minBeds: 0, type: 'Any', instant: false, fav: false });
  useEffect(() => { setF((p) => ({ ...p, maxPrice: priceCap })); }, [priceCap]);

  const filtered = useMemo(() => stays.filter((s) => {
    if ((s.priceUSD || 0) > f.maxPrice) return false;
    if ((s.bedrooms || 0) < f.minBeds) return false;
    if (f.type !== 'Any' && s.type !== f.type) return false;
    if (f.instant && !s.instantBook) return false;
    if (f.fav && !(s.ratingCount > 0 && (s.ratingAvg ?? 0) >= 4.8)) return false;
    return true;
  }), [stays, f]);
  const activeFilters = (f.maxPrice < priceCap ? 1 : 0) + (f.minBeds > 0 ? 1 : 0) + (f.type !== 'Any' ? 1 : 0) + (f.instant ? 1 : 0) + (f.fav ? 1 : 0);
  const reset = () => setF({ maxPrice: priceCap, minBeds: 0, type: 'Any', instant: false, fav: false });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageStays = useMemo(() => filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [filtered, page]);

  useEffect(() => { setPage(1); }, [stays, f]);

  // When a map pin is clicked, scroll its card into view.
  useEffect(() => {
    if (!activeId) return;
    document.getElementById(`sc-${activeId}`)?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeId]);

  const goPage = (p: number) => {
    setPage(p);
    setActiveId(null);
    if (typeof window !== 'undefined') window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="search-split">
      <div className="search-list">
        <div className="section-head">
          <h2>{query ? `Stays in “${query}”` : 'All stays'}</h2>
          <span className="muted">{filtered.length} {filtered.length === 1 ? 'stay' : 'stays'}{activeFilters > 0 ? ` of ${total}` : ''}</span>
        </div>

        {/* Filter bar */}
        <div className="search-filters">
          <label className="sf-price">
            <span>Up to {format(f.maxPrice)}</span>
            <input type="range" min={50} max={priceCap} step={10} value={f.maxPrice} onChange={(e) => setF({ ...f, maxPrice: Number(e.target.value) })} />
          </label>
          <select className="sf-select" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Property type">
            {types.map((t) => <option key={t} value={t}>{t === 'Any' ? 'Any type' : t}</option>)}
          </select>
          <select className="sf-select" value={f.minBeds} onChange={(e) => setF({ ...f, minBeds: Number(e.target.value) })} aria-label="Minimum bedrooms">
            <option value={0}>Any beds</option>
            {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}+ bed{n > 1 ? 's' : ''}</option>)}
          </select>
          <button type="button" className={`sf-chip${f.instant ? ' is-on' : ''}`} onClick={() => setF({ ...f, instant: !f.instant })}>Instant book</button>
          <button type="button" className={`sf-chip${f.fav ? ' is-on' : ''}`} onClick={() => setF({ ...f, fav: !f.fav })}>Guest favourite</button>
          {activeFilters > 0 && <button type="button" className="sf-reset" onClick={reset}>Clear ({activeFilters})</button>}
        </div>

        {pageStays.length > 0 ? (
          <div className="search-grid">
            {pageStays.map((s) => (
              <StayCard key={s.id} stay={s} id={`sc-${s.id}`} active={s.id === activeId} onHover={setActiveId} />
            ))}
          </div>
        ) : (
          <div className="empty">
            <h2>No stays match your search</h2>
            <p>Try a different destination or fewer filters.</p>
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={goPage} />}
      </div>

      <div className="search-map-col">
        <SearchMap stays={pageStays} activeId={activeId} onSelect={setActiveId} />
      </div>
    </div>
  );
}

function Pagination({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (p: number) => void }) {
  const items: (number | '…')[] = [];
  for (let p = 1; p <= totalPages; p++) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) items.push(p);
    else if (items[items.length - 1] !== '…') items.push('…');
  }
  return (
    <nav className="pagination" aria-label="Pagination">
      <button aria-label="Previous page" disabled={page === 1} onClick={() => onPage(page - 1)}><Chevron dir="left" /></button>
      {items.map((it, i) =>
        it === '…' ? (
          <span key={`d${i}`} className="pg-dots">…</span>
        ) : (
          <button key={it} className={`pg-num${it === page ? ' is-active' : ''}`} aria-current={it === page} onClick={() => onPage(it)}>{it}</button>
        ),
      )}
      <button aria-label="Next page" disabled={page === totalPages} onClick={() => onPage(page + 1)}><Chevron dir="right" /></button>
    </nav>
  );
}

function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}
