'use client';

// Rotating splash captions for the auth screens — big animated lines about
// finding stays, experiencing places and making memories. One caption fades/
// rises in at a time; paused under prefers-reduced-motion.
import { useEffect, useState } from 'react';

const CAPTIONS = [
  { head: 'Find stays worth remembering.', sub: 'Hand-picked homes, villas and hideaways — near you and across the world.' },
  { head: 'Experience places like a local.', sub: 'Beach mornings, mountain sunsets, city nights — live it, don’t just visit.' },
  { head: 'Make memories that stay.', sub: 'The trips you’ll talk about for years start with one search.' },
  { head: 'Your next escape is waiting.', sub: 'Weekend getaways to month-long adventures — no booking fees, ever.' },
];

export function AuthCaptions() {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((p) => (p + 1) % CAPTIONS.length), 4200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="auth-caps">
      {/* Grid-stacked: the container sizes to the tallest caption, so long
          lines never overflow or collide with the dots below. */}
      <div className="auth-cap-stack">
        {CAPTIONS.map((c, idx) => (
          <div key={c.head} className={`auth-cap${idx === i ? ' is-active' : ''}`} aria-hidden={idx !== i}>
            <h2>{c.head}</h2>
            <p>{c.sub}</p>
          </div>
        ))}
      </div>
      <div className="auth-cap-dots">
        {CAPTIONS.map((_, idx) => (
          <span key={idx} className={`auth-cap-dot${idx === i ? ' is-on' : ''}`} />
        ))}
      </div>
    </div>
  );
}
