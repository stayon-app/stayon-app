'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

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
  const [checkIn, setCheckIn] = useState(initialCheckIn);
  const [checkOut, setCheckOut] = useState(initialCheckOut);
  const [guests, setGuests] = useState(initialGuests);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (guests.trim()) params.set('guests', guests.trim());
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form className="searchbar" onSubmit={submit}>
      <div className="sb-seg sb-where">
        <label htmlFor="q">Where</label>
        <input id="q" placeholder="Search destinations" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="sb-divider" />
      <div className="sb-seg">
        <label htmlFor="ci">Check in</label>
        <input id="ci" type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
      </div>
      <div className="sb-divider" />
      <div className="sb-seg">
        <label htmlFor="co">Check out</label>
        <input id="co" type="date" value={checkOut} min={checkIn || undefined} onChange={(e) => setCheckOut(e.target.value)} />
      </div>
      <div className="sb-divider" />
      <div className="sb-seg sb-who">
        <label htmlFor="guests">Who</label>
        <input id="guests" type="number" min={1} placeholder="Add guests" value={guests} onChange={(e) => setGuests(e.target.value)} />
      </div>
      <button type="submit" className="sb-search" aria-label="Search">
        <SearchIcon />
        <span>Search</span>
      </button>
    </form>
  );
}

function SearchIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3-3" />
    </svg>
  );
}
