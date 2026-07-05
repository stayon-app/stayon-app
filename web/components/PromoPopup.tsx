'use client';

// Welcome-offer popup shown once per session on the guest home page:
// background image under a teal veil, title, description, promo code with
// tap-to-copy, and a close mark.
import { useEffect, useState } from 'react';
import Link from 'next/link';

const KEY = 'stayon_promo_seen';
const CODE = 'STAYON10';

export function PromoPopup() {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(KEY)) return;
    } catch { return; }
    const t = setTimeout(() => setOpen(true), 1200);
    return () => clearTimeout(t);
  }, []);

  const close = () => {
    setOpen(false);
    try { sessionStorage.setItem(KEY, '1'); } catch { /* ignore */ }
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const copy = () => {
    try { navigator.clipboard?.writeText(CODE); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  if (!open) return null;

  return (
    <div className="promo-overlay" role="dialog" aria-modal="true" aria-label="Welcome offer" onClick={close}>
      <div className="promo-card" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="promo-x" aria-label="Close" onClick={close}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <div className="promo-media">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1000&q=80&auto=format&fit=crop" alt="" />
        </div>
        <div className="promo-body">
          <span className="promo-eyebrow">Welcome offer</span>
          <h3>Get 10% off your first stay</h3>
          <p>Book any stay on StayOn and save 10% with this code at checkout — beach villas, city lofts, mountain cabins and more.</p>
          <button type="button" className="promo-code" onClick={copy} title="Tap to copy">
            <span>{CODE}</span>
            <small>{copied ? 'Copied ✓' : 'Tap to copy'}</small>
          </button>
          <Link href="/search" className="btn btn-primary promo-cta" onClick={close}>Find a stay</Link>
        </div>
      </div>
    </div>
  );
}
