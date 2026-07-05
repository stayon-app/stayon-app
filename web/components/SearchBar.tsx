'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { POPULAR_DESTINATIONS } from '@/lib/destinations';
import { RangeCalendar } from './RangeCalendar';
import { API } from '@/lib/stayonClient';

// Live place suggestions built from the backend's real inventory.
interface Place { city: string; state?: string; country?: string; count: number }

type Pop = 'where' | 'dates' | 'guests' | null;

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => (s ? new Date(s + 'T00:00:00') : null);
const fmt = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

export function SearchBar({
  initialQ = '',
  initialGuests = '',
  initialCheckIn = '',
  initialCheckOut = '',
}: {
  initialQ?: string;
  initialGuests?: string;
  initialCheckIn?: string;
  initialCheckOut?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [checkIn, setCheckIn] = useState<Date | null>(parse(initialCheckIn));
  const [checkOut, setCheckOut] = useState<Date | null>(parse(initialCheckOut));
  const [adults, setAdults] = useState(Math.max(0, parseInt(initialGuests || '0', 10) || 0));
  const [children, setChildren] = useState(0);
  const [open, setOpen] = useState<Pop>(null);
  const rootRef = useRef<HTMLFormElement>(null);

  // Real place list for type-ahead — fetched once on first "Where" focus.
  const [places, setPlaces] = useState<Place[] | null>(null);
  const fetchedRef = useRef(false);
  const loadPlaces = () => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetch(`${API}/search`)
      .then((r) => r.json())
      .then((j) => {
        const map = new Map<string, Place>();
        for (const s of j.results || []) {
          if (!s.city) continue;
          const key = s.city.toLowerCase();
          const cur = map.get(key);
          if (cur) cur.count += 1;
          else map.set(key, { city: s.city, state: s.state, country: s.country, count: 1 });
        }
        setPlaces([...map.values()].sort((a, b) => a.city.localeCompare(b.city)));
      })
      .catch(() => setPlaces([]));
  };

  // Typed letters → matching places, alphabetically sorted (startsWith first).
  const matches = useMemo(() => {
    if (!places || !q.trim()) return [];
    const needle = q.trim().toLowerCase();
    const starts = places.filter((p) => p.city.toLowerCase().startsWith(needle));
    const contains = places.filter((p) => !p.city.toLowerCase().startsWith(needle) &&
      (`${p.city} ${p.state || ''} ${p.country || ''}`.toLowerCase().includes(needle)));
    return [...starts, ...contains].slice(0, 8);
  }, [places, q]);

  const guests = adults + children;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const buildParams = (over?: { q?: string }) => {
    const params = new URLSearchParams();
    const qq = over?.q ?? q;
    if (qq.trim()) params.set('q', qq.trim());
    if (checkIn) params.set('checkIn', iso(checkIn));
    if (checkOut) params.set('checkOut', iso(checkOut));
    if (guests > 0) params.set('guests', String(guests));
    return params;
  };
  const go = (params: URLSearchParams) => {
    setOpen(null);
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  const pickDay = (d: Date) => {
    if (!checkIn || (checkIn && checkOut)) {
      setCheckIn(d);
      setCheckOut(null);
    } else if (d > checkIn) {
      setCheckOut(d);
    } else {
      setCheckIn(d);
    }
  };

  const nights = checkIn && checkOut ? Math.round((+checkOut - +checkIn) / 86400000) : 0;

  // Availability needs all three: WHERE + WHEN + WHO (like any real booking
  // platform) — the Search button stays off until the trio is complete.
  const canSearch = !!(q.trim() && checkIn && checkOut && guests > 0);

  return (
    <form className="searchbar" onSubmit={(e) => { e.preventDefault(); if (canSearch) go(buildParams()); }} ref={rootRef}>
      {/* WHERE */}
      <div className="sb-seg sb-where">
        <label htmlFor="q">Where</label>
        <input
          id="q"
          placeholder="Search destinations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => { setOpen('where'); loadPlaces(); }}
          autoComplete="off"
        />
        {open === 'where' && (
          <div className="sb-pop sb-pop-where" role="listbox" aria-label="Destinations">
            {q.trim() ? (
              /* Type-ahead: real places from live inventory, sorted A→Z */
              matches.length > 0 ? (
                <>
                  <div className="sb-pop-head">Places matching “{q.trim()}”</div>
                  {matches.map((p) => (
                    <button type="button" key={p.city} className="sb-dest" onClick={() => { setQ(p.city); setOpen('dates'); }}>
                      <span className="sb-dest-pin"><PinIcon /></span>
                      <span className="sb-dest-text">
                        <b>{p.city}{p.state ? `, ${p.state}` : ''}</b>
                        <span>{p.country || ''}</span>
                      </span>
                      <span className="sb-dest-count">{p.count} {p.count === 1 ? 'stay' : 'stays'}</span>
                    </button>
                  ))}
                </>
              ) : (
                <div className="sb-pop-head">{places === null ? 'Searching places…' : `No places match “${q.trim()}” yet — coming soon`}</div>
              )
            ) : (
              <>
                <div className="sb-pop-head">Popular destinations</div>
                {POPULAR_DESTINATIONS.map((d) => (
                  <button type="button" key={d.city} className="sb-dest" onClick={() => { setQ(d.city); setOpen('dates'); }}>
                    <span className="sb-dest-pin"><PinIcon /></span>
                    <span className="sb-dest-text"><b>{d.city}, {d.country}</b><span>{d.tagline}</span></span>
                    <span className="sb-dest-count">{d.stays} stays</span>
                  </button>
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <div className="sb-divider" />

      {/* WHEN */}
      <button type="button" className={`sb-seg sb-trigger${open === 'dates' ? ' is-open' : ''}`} onClick={() => setOpen(open === 'dates' ? null : 'dates')}>
        <span className="sb-seg-label">When</span>
        <span className={`sb-seg-value${checkIn ? '' : ' is-empty'}`}>
          {checkIn ? `${fmt(checkIn)}${checkOut ? ` – ${fmt(checkOut)}` : ''}` : 'Add dates'}
        </span>
      </button>

      <div className="sb-divider" />

      {/* WHO */}
      <button type="button" className={`sb-seg sb-who sb-trigger${open === 'guests' ? ' is-open' : ''}`} onClick={() => setOpen(open === 'guests' ? null : 'guests')}>
        <span className="sb-seg-label">Who</span>
        <span className={`sb-seg-value${guests ? '' : ' is-empty'}`}>{guests ? `${guests} guest${guests > 1 ? 's' : ''}` : 'Add guests'}</span>
      </button>

      <button
        type="submit"
        className={`sb-search${canSearch ? '' : ' is-off'}`}
        aria-label="Search"
        disabled={!canSearch}
        title={canSearch ? undefined : 'Add a destination, your dates and guests to search available stays'}
      >
        <SearchIcon />
        <span>Search</span>
      </button>

      {/* ── Dates calendar popover (shared RangeCalendar) ── */}
      {open === 'dates' && (
        <div className="sb-pop sb-pop-dates" role="dialog" aria-label="Choose dates">
          <RangeCalendar checkIn={checkIn} checkOut={checkOut} onPick={pickDay} months={2} />
          <div className="cal-foot">
            <button type="button" className="cal-clear" onClick={() => { setCheckIn(null); setCheckOut(null); }}>Clear dates</button>
            <button type="button" className="btn btn-primary hf-sm" onClick={() => setOpen(null)}>Done</button>
          </div>
        </div>
      )}

      {/* ── Guests popover ── */}
      {open === 'guests' && (
        <div className="sb-pop sb-pop-guests" role="dialog" aria-label="Guests">
          <Stepper label="Adults" sub="Ages 13 or above" value={adults} min={0} onChange={setAdults} />
          <Stepper label="Children" sub="Ages 2–12" value={children} min={0} onChange={setChildren} />
          <div className="guest-foot">
            <button type="button" className="cal-clear" onClick={() => { setAdults(0); setChildren(0); }}>Clear</button>
            <button type="button" className="btn btn-primary hf-sm" onClick={() => setOpen(null)}>Done</button>
          </div>
        </div>
      )}
    </form>
  );
}

function Stepper({ label, sub, value, min, onChange }: { label: string; sub: string; value: number; min: number; onChange: (n: number) => void }) {
  return (
    <div className="guest-row">
      <div className="guest-row-text"><b>{label}</b><span>{sub}</span></div>
      <div className="guest-stepper">
        <button type="button" aria-label={`Decrease ${label}`} disabled={value <= min} onClick={() => onChange(value - 1)}>−</button>
        <span>{value}</span>
        <button type="button" aria-label={`Increase ${label}`} disabled={value >= 16} onClick={() => onChange(value + 1)}>+</button>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" />
    </svg>
  );
}
function PinIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s7-6.3 7-11a7 7 0 1 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" />
    </svg>
  );
}
function Chevron({ dir }: { dir: 'left' | 'right' }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      {dir === 'left' ? <path d="m15 18-6-6 6-6" /> : <path d="m9 18 6-6-6-6" />}
    </svg>
  );
}
