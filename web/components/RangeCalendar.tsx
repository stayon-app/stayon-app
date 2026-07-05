'use client';

// Shared date-range calendar (search bar + booking widget). Renders 1 or 2
// months with prev/next nav; selected range draws as ONE continuous band
// (start ● ▬▬▬ ● end); reserved/blocked days come struck-through via
// `isBlocked` so guests can see exactly which dates are taken.
import { useMemo, useState } from 'react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const isoDay = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const parseDay = (s: string) => (s ? new Date(s + 'T00:00:00') : null);
export const fmtDay = (d: Date | null) => (d ? d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) : '');

const sameDay = (a: Date | null, b: Date | null) => !!a && !!b && isoDay(a) === isoDay(b);

function monthCells(year: number, month: number): (Date | null)[] {
  const first = new Date(year, month, 1);
  const cells: (Date | null)[] = Array(first.getDay()).fill(null);
  const days = new Date(year, month + 1, 0).getDate();
  for (let d = 1; d <= days; d++) cells.push(new Date(year, month, d));
  return cells;
}

export function RangeCalendar({
  checkIn, checkOut, onPick, isBlocked, months = 2,
}: {
  checkIn: Date | null;
  checkOut: Date | null;
  onPick: (d: Date) => void;
  /** Return true for days that are reserved/blocked (shown struck-through). */
  isBlocked?: (d: Date) => boolean;
  months?: 1 | 2;
}) {
  const today = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const [view, setView] = useState(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const nights = checkIn && checkOut ? Math.round((+checkOut - +checkIn) / 86400000) : 0;

  return (
    <>
      <div className="cal-head">
        <button type="button" className="cal-nav" aria-label="Previous month"
          onClick={() => setView((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
          disabled={view <= new Date(today.getFullYear(), today.getMonth(), 1)}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
        <div className="cal-title">{nights > 0 ? `${nights} night${nights > 1 ? 's' : ''}` : 'Select your dates'}</div>
        <button type="button" className="cal-nav" aria-label="Next month"
          onClick={() => setView((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
        </button>
      </div>
      <div className={`cal-months${months === 1 ? ' cal-months-1' : ''}`}>
        {Array.from({ length: months }).map((_, offset) => {
          const m = new Date(view.getFullYear(), view.getMonth() + offset, 1);
          return (
            <div className="cal-month" key={offset}>
              <div className="cal-month-name">{MONTHS[m.getMonth()]} {m.getFullYear()}</div>
              <div className="cal-dow">{DOW.map((d) => <span key={d}>{d}</span>)}</div>
              <div className="cal-grid">
                {monthCells(m.getFullYear(), m.getMonth()).map((d, i) => {
                  if (!d) return <span key={i} className="cal-cell cal-blank" />;
                  const past = d < today;
                  const blocked = !past && !!isBlocked?.(d);
                  const isIn = sameDay(d, checkIn);
                  const isOut = sameDay(d, checkOut);
                  const inRange = checkIn && checkOut && d > checkIn && d < checkOut;
                  const cls = ['cal-cell'];
                  if (past) cls.push('cal-past');
                  if (blocked) cls.push('cal-booked');
                  if (isIn) cls.push('cal-start');
                  if (isOut) cls.push('cal-end');
                  if (isIn && !checkOut) cls.push('cal-solo');
                  if (inRange) cls.push('cal-in');
                  return (
                    <button type="button" key={i} className={cls.join(' ')} disabled={past || blocked}
                      title={blocked ? 'Already reserved' : undefined}
                      onClick={() => onPick(d)}>
                      {d.getDate()}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
