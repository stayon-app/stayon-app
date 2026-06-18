'use client';

import { useState, useRef, useEffect } from 'react';
import { usePrefs } from './PrefsProvider';
import { CURRENCIES, LANGUAGES, getCurrency } from '@/lib/currency';

export function GlobeMenu() {
  const { currency, language, setCurrency, setLanguage } = usePrefs();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div className="globe-wrap" ref={ref}>
      <button className="icon-btn" onClick={() => setOpen((o) => !o)} aria-label="Language and currency">
        <GlobeIcon />
        <span className="globe-code">{getCurrency(currency).symbol}</span>
      </button>

      {open && (
        <div className="globe-menu">
          <div className="globe-section">
            <h4>Language</h4>
            <div className="globe-grid">
              {LANGUAGES.map((l) => (
                <button
                  key={l.code}
                  className={`globe-item ${language === l.code ? 'active' : ''} ${l.active ? '' : 'disabled'}`}
                  onClick={() => l.active && setLanguage(l.code)}
                  disabled={!l.active}
                >
                  {l.label}
                  {!l.active && <span className="soon">soon</span>}
                </button>
              ))}
            </div>
          </div>
          <div className="globe-section">
            <h4>Currency</h4>
            <div className="globe-grid">
              {CURRENCIES.map((c) => (
                <button
                  key={c.code}
                  className={`globe-item ${currency === c.code ? 'active' : ''}`}
                  onClick={() => {
                    setCurrency(c.code);
                    setOpen(false);
                  }}
                >
                  <span>{c.label}</span>
                  <span className="cur-sym">{c.symbol} {c.code}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlobeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </svg>
  );
}
