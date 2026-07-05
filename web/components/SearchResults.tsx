'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { StayCard } from './StayCard';
import { WizIcon } from './WizIcon';
import { FilterSheet, DEFAULT_FILTERS, applyFilters, countActive, type FilterState } from './FilterSheet';
import type { Listing } from '@/lib/types';

// Map touches window → client-only, no SSR.
const SearchMap = dynamic(() => import('./SearchMap').then((m) => m.SearchMap), {
  ssr: false,
  loading: () => <div className="search-map"><div className="search-map-empty">Loading map…</div></div>,
});

const PAGE_SIZE = 18;

export function SearchResults({ stays, query, total }: { stays: Listing[]; query?: string; total: number }) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [f, setF] = useState<FilterState>(DEFAULT_FILTERS);

  const filtered = useMemo(() => applyFilters(stays, f), [stays, f]);
  const activeFilters = countActive(f);
  const reset = () => setF(DEFAULT_FILTERS);

  // Quick-chip helpers (mirror the app's QuickFiltersBar shortcuts).
  const quickOn = (id: string) => f.recommended.includes(id);
  const quickToggle = (id: string) =>
    setF((p) => ({ ...p, recommended: p.recommended.includes(id) ? p.recommended.filter((x) => x !== id) : [...p.recommended, id] }));

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

        {/* Filter bar — Filters button opens the app-style sheet; quick chips */}
        <div className="search-filters">
          <button type="button" className={`sf-filters-btn${activeFilters > 0 ? ' is-on' : ''}`} onClick={() => setSheetOpen(true)}>
            <WizIcon name="filters" size={16} /> Filters{activeFilters > 0 ? ` · ${activeFilters}` : ''}
          </button>
          <button type="button" className={`sf-chip${quickOn('instant') ? ' is-on' : ''}`} onClick={() => quickToggle('instant')}>
            <WizIcon name="flash" size={14} /> Instant book
          </button>
          <button type="button" className={`sf-chip${quickOn('guest_fav') ? ' is-on' : ''}`} onClick={() => quickToggle('guest_fav')}>
            <WizIcon name="star" size={14} /> Guest favourite
          </button>
          {activeFilters > 0 && <button type="button" className="sf-reset" onClick={reset}>Clear all ({activeFilters})</button>}
        </div>

        <FilterSheet
          open={sheetOpen}
          initial={f}
          countFor={(draft) => applyFilters(stays, draft).length}
          onClose={() => setSheetOpen(false)}
          onApply={setF}
        />

        {pageStays.length > 0 ? (
          <div className="search-grid">
            {pageStays.map((s) => (
              <StayCard key={s.id} stay={s} id={`sc-${s.id}`} active={s.id === activeId} onHover={setActiveId} />
            ))}
          </div>
        ) : (
          <div className="empty">
            {query && stays.length === 0 ? (
              <>
                <h2>No available stays in “{query}” for your search</h2>
                <p>Everything may be booked for those dates or your group size — try different dates, fewer guests, or another destination. New places are added every week.</p>
              </>
            ) : (
              <>
                <h2>No stays match your filters</h2>
                <p>Try removing a filter or widening your price range.</p>
              </>
            )}
          </div>
        )}

        {totalPages > 1 && <Pagination page={page} totalPages={totalPages} onPage={goPage} />}
      </div>

      <div className="search-map-col">
        {/* All filtered results on the map (not just this page); when nothing is
            mappable, the map geocodes the query and centres on that place. */}
        <SearchMap stays={filtered} activeId={activeId} onSelect={setActiveId} fallbackQuery={query} />
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
