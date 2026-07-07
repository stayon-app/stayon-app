'use client';

// Airbnb-style title-row actions: Share (native share sheet, clipboard fallback)
// and Save (wishlist heart — same store as the cards / /saved page).

import { useState } from 'react';
import { useWishlist } from '@/lib/wishlist';

export function StayActions({ stayId, title }: { stayId: string; title: string }) {
  const [saved, toggle] = useWishlist(stayId);
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
    } catch { /* user closed the sheet */ }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch { /* ignore */ }
  };

  return (
    <div className="stay-actions">
      <button type="button" className="stay-action" onClick={share}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 12v7a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-7" /><path d="M16 6.5 12 2.5l-4 4" /><path d="M12 3v13" />
        </svg>
        <span>{copied ? 'Link copied!' : 'Share'}</span>
      </button>
      <button type="button" className={`stay-action${saved ? ' is-saved' : ''}`} onClick={toggle}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? '#FF385C' : 'none'} stroke={saved ? '#FF385C' : 'currentColor'} strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 20.5S3.5 14.6 3.5 8.9A4.4 4.4 0 0 1 12 6.6a4.4 4.4 0 0 1 8.5 2.3c0 5.7-8.5 11.6-8.5 11.6Z" />
        </svg>
        <span>{saved ? 'Saved' : 'Save'}</span>
      </button>
    </div>
  );
}
