'use client';

import { useState } from 'react';

// Single-open FAQ accordion. CSS-grid 0fr→1fr expand (no JS height measuring).
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <div className="accordion">
      {items.map((item, i) => (
        <div key={i} className={`accordion-item${open === i ? ' open' : ''}`}>
          <button
            className="accordion-trigger"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.q}
            <span className="accordion-icon" aria-hidden />
          </button>
          <div className="accordion-panel">
            <div className="accordion-panel-inner">
              <p>{item.a}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
