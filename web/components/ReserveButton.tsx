'use client';

import { useState } from 'react';

export function ReserveButton() {
  const [clicked, setClicked] = useState(false);
  return (
    <>
      <button className="btn btn-primary" onClick={() => setClicked(true)}>
        Reserve
      </button>
      {clicked ? (
        <p className="disclaimer">
          Online booking is coming next. For now, finish your reservation in the StayOn app.
        </p>
      ) : (
        <p className="disclaimer">You won&apos;t be charged yet · 0% platform fee</p>
      )}
    </>
  );
}
