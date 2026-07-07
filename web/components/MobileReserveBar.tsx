'use client';

// Airbnb-style fixed bottom bar on phones: price/night on the left, Reserve on
// the right — tapping scrolls to the booking card. Hidden on desktop via CSS.

import { usePrefs } from './PrefsProvider';

export function MobileReserveBar({ priceUSD }: { priceUSD: number }) {
  const { format } = usePrefs();
  const goToCard = () => {
    document.getElementById('book-card')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  return (
    <div className="mobile-reserve">
      <div className="mr-price">
        <b>{format(priceUSD)}</b> <span>night</span>
        <small>No booking fees</small>
      </div>
      <button type="button" className="btn btn-primary" onClick={goToCard}>
        Reserve
      </button>
    </div>
  );
}
