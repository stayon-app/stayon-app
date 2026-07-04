'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { POPULAR_DESTINATIONS } from '@/lib/destinations';

type Pop = 'where' | 'dates' | 'guests' | null;

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const parse = (s: string) => (s ? new Date(s + 'T00:00:00') : null);
const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && iso(a) === iso(b);
const fmt = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

// Grid of Date cells for a given month (leading blanks as null).
function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  return cells;
}

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

  const guests = adults + children;
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [viewMonth, setViewMonth] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));

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

  return (
    <form className="searchbar" onSubmit={(e) => { e.preventDefault(); go(buildParams()); }} ref={rootRef}>
      {/* WHERE */}
      <div className="sb-seg sb-where">
        <label htmlFor="q">Where</label>
        <input
          id="q"
          placeholder="Search destinations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen('where')}
          autoComplete="off"
        />
        {open === 'where' && (
          <div className="sb-pop sb-pop-where" role="listbox" aria-label="Popular destinations">
            <div className="sb-pop-head">Popular destinations</div>
            {POPULAR_DESTINATIONS.map((d) => (
              <button type="button" key={d.city} className="sb-dest" onClick={() => go(buildParams({ q: d.city }))}>
                <span className="sb-dest-pin"><PinIcon /></span>
                <span className="sb-dest-text"><b>{d.city}, {d.country}</b><span>{d.tagline}</span></span>
                <span className="sb-dest-count">{d.stays} stays</span>
              </button>
            ))}
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

      <button type="submit" className="sb-search" aria-label="Search">
        <SearchIcon />
        <span>Search</span>
      </button>

      {/* ── Dates calendar popover ── */}
      {open === 'dates' && (
        <div className="sb-pop sb-pop-dates" role="dialog" aria-label="Choose dates">
          <div className="cal-head">
            <button type="button" className="cal-nav" aria-label="Previous month" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))} disabled={viewMonth <= new Date(today.getFullYear(), today.getMonth(), 1)}>
              <Chevron dir="left" />
            </button>
            <div className="cal-title">
              {nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Select your dates'}
            </div>
            <button type="button" className="cal-nav" aria-label="Next month" onClick={() => setViewMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
              <Chevron dir="right" />
            </button>
          </div>
          <div className="cal-months">
            {[0, 1].map((offset) => {
              const m = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + offset, 1);
              return (
                <div className="cal-month" key={offset}>
                  <div className="cal-month-name">{MONTHS[m.getMonth()]} {m.getFullYear()}</div>
                  <div className="cal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
                  <div className="cal-grid">
                    {monthCells(m.getFullYear(), m.getMonth()).map((d, i) => {
                      if (!d) return <span key={i} className="cal-cell cal-blank" />;
                      const past = d < today;
                      const isIn = sameDay(d, checkIn);
                      const isOut = sameDay(d, checkOut);
                      const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
                      const cls = ['cal-cell'];
                      if (past) cls.push('cal-past');
                      if (isIn) cls.push('cal-start');
                      if (isOut) cls.push('cal-end');
                      if (inRange) cls.push('cal-in');
                      return (
                        <button type="button" key={i} className={cls.join(' ')} disabled={past} onClick={() => pickDay(d)}>
                          {d.getDate()}
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
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
