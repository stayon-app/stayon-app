'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export function SearchBar({
  initialQ = '',
  initialGuests = '',
}: {
  initialQ?: string;
  initialGuests?: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(initialQ);
  const [guests, setGuests] = useState(initialGuests);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (guests.trim()) params.set('guests', guests.trim());
    router.push(`/search${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <form className="searchbar" onSubmit={submit}>
      <div className="field">
        <label htmlFor="q">Where</label>
        <input
          id="q"
          placeholder="Search destinations"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>
      <div className="field">
        <label htmlFor="guests">Guests</label>
        <input
          id="guests"
          type="number"
          min={1}
          placeholder="Add guests"
          value={guests}
          onChange={(e) => setGuests(e.target.value)}
        />
      </div>
      <button type="submit" className="btn btn-primary">
        Search
      </button>
    </form>
  );
}
