'use client';

import { useWishlist } from './WishlistProvider';

export function WishlistButton({ listingId }: { listingId: string }) {
  const { ids, toggle } = useWishlist();
  const saved = ids.has(listingId);
  return (
    <button
      className={`wish-btn ${saved ? 'saved' : ''}`}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      onClick={(e) => {
        e.preventDefault(); // don't follow the card link
        e.stopPropagation();
        toggle(listingId);
      }}
    >
      <svg width="22" height="22" viewBox="0 0 24 24" fill={saved ? '#ef4444' : 'rgba(15,23,42,0.45)'} stroke="#fff" strokeWidth="1.8">
        <path d="M12 21s-7.5-4.9-9.7-9.1C.7 8.7 2.6 5 6.2 5c2 0 3.5 1 4.4 2.4h2.8C14.3 6 15.8 5 17.8 5c3.6 0 5.5 3.7 3.9 6.9C19.5 16.1 12 21 12 21z" />
      </svg>
    </button>
  );
}
