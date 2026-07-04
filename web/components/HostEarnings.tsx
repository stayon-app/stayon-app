'use client';

import { useEffect, useRef, useState } from 'react';
import { Price } from './Price';

// Interactive earnings estimator (host-side content, economics allowed).
// Two panes: a rotating property image with a "you keep 100%" badge, and a
// price-sweep control — drag the nightly price and the monthly figure sweeps
// live, Airbnb-style. Illustrative only; not a quote.
const SHOTS = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?w=900&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=900&q=80&auto=format&fit=crop',
];

export function HostEarnings() {
  const [price, setPrice] = useState(120); // nightly, USD — the swept value
  const [nights, setNights] = useState(15);
  const [shot, setShot] = useState(0);
  const reduce = useRef(false);

  useEffect(() => {
    reduce.current = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    if (reduce.current) return;
    const t = setInterval(() => setShot((s) => (s + 1) % SHOTS.length), 5000);
    return () => clearInterval(t);
  }, []);

  const monthly = price * nights;
  const pPct = ((price - 20) / (500 - 20)) * 100;
  const nPct = ((nights - 1) / (30 - 1)) * 100;

  return (
    <div className="hee-grid">
      {/* Media pane */}
      <div className="hee-media">
        {SHOTS.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" className={`hee-media-img${i === shot ? ' is-active' : ''}`} loading="lazy" />
        ))}
        <div className="hee-badge">
          <span className="hee-badge-k">You keep</span>
          <span className="hee-badge-v">100%</span>
        </div>
      </div>

      {/* Estimator pane */}
      <div className="host-earn-est">
        <div className="hee-eyebrow">Estimate your earnings</div>
        <div className="hee-amount"><Price usd={monthly} /><span>/ month</span></div>
        <div className="hee-sub">
          {nights} night{nights > 1 ? 's' : ''} booked · <Price usd={price} /> / night
          <span className="hee-illus">estimated</span>
        </div>

        <label className="hee-ctl">
          <span className="hee-ctl-label">Your nightly price</span>
          <input
            type="range" min={20} max={500} step={5} value={price}
            onChange={(e) => setPrice(Number(e.target.value))}
            className="hee-slider"
            style={{ background: `linear-gradient(90deg, var(--teal) 0%, var(--indigo) ${pPct}%, var(--line) ${pPct}%)` }}
            aria-label="Nightly price"
          />
        </label>

        <label className="hee-ctl">
          <span className="hee-ctl-label">Nights booked / month</span>
          <input
            type="range" min={1} max={30} value={nights}
            onChange={(e) => setNights(Number(e.target.value))}
            className="hee-slider"
            style={{ background: `linear-gradient(90deg, var(--teal) 0%, var(--indigo) ${nPct}%, var(--line) ${nPct}%)` }}
            aria-label="Nights booked per month"
          />
        </label>

        <p className="hee-note">Illustrative estimate — your actual earnings depend on your price, location and availability. You keep 100%.</p>
      </div>
    </div>
  );
}
