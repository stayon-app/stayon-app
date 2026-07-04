'use client';

// "What this place offers" — maps amenity ids to labels (from the shared wizard
// list) and shows the first 10 with a "Show all N amenities" modal, mirroring
// the app's amenities sheet. Each row gets a monochrome line tick.
import { useEffect, useState } from 'react';
import { AMENITY_OPTIONS } from '@/lib/wizard';

const LABEL = new Map(AMENITY_OPTIONS.map((a) => [a.id, a.label]));
const labelFor = (id: string) => LABEL.get(id) || id.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

function Row({ id }: { id: string }) {
  return (
    <li className="am-row">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M20 6 9 17l-5-5" /></svg>
      <span>{labelFor(id)}</span>
    </li>
  );
}

export function StayAmenities({ amenities }: { amenities: string[] }) {
  const [open, setOpen] = useState(false);
  const shown = amenities.slice(0, 10);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  return (
    <div className="detail-section">
      <h3>What this place offers</h3>
      <ul className="am-grid">
        {shown.map((a) => <Row key={a} id={a} />)}
      </ul>
      {amenities.length > 10 && (
        <button type="button" className="btn btn-outline am-more" onClick={() => setOpen(true)}>
          Show all {amenities.length} amenities
        </button>
      )}

      {open && (
        <div className="modal-overlay" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-sheet-head">
              <h3>What this place offers</h3>
              <button type="button" className="modal-x" aria-label="Close" onClick={() => setOpen(false)}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
              </button>
            </div>
            <ul className="am-grid am-grid-modal">
              {amenities.map((a) => <Row key={a} id={a} />)}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
