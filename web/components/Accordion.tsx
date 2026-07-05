'use client';

import { useState } from 'react';

<<<<<<< Updated upstream
// Single-open FAQ accordion. CSS-grid 0fr→1fr expand (no JS height measuring).
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(0);
=======
// Single-open FAQ accordion. CSS-grid `0fr → 1fr` expand technique (see
// .accordion-panel in globals.css) — no JS height measuring needed.
export function Accordion({ items }: { items: { q: string; a: string }[] }) {
  const [open, setOpen] = useState<number | null>(null);
>>>>>>> Stashed changes

  return (
    <div className="accordion">
      {items.map((item, i) => (
<<<<<<< Updated upstream
        <div key={i} className={`accordion-item${open === i ? ' open' : ''}`}>
          <button
            className="accordion-trigger"
            onClick={() => setOpen(open === i ? null : i)}
            aria-expanded={open === i}
          >
            {item.q}
            <span className="accordion-icon" aria-hidden />
=======
        <div key={item.q} className={`accordion-item ${open === i ? 'is-open' : ''}`}>
          <button
            type="button"
            className="accordion-trigger"
            aria-expanded={open === i}
            onClick={() => setOpen(open === i ? null : i)}
          >
            <span>{item.q}</span>
            <span className="accordion-icon">+</span>
>>>>>>> Stashed changes
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
