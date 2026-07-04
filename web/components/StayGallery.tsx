'use client';

// Airbnb-style photo gallery: a 5-up mosaic with a "Show all photos" button,
// opening a full-screen lightbox with prev/next + counter (mirrors the app's
// PhotoTour). Keyboard: Esc closes, ←/→ navigate.
import { useCallback, useEffect, useState } from 'react';

export function StayGallery({ images, title }: { images: string[]; title: string }) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);
  const mosaic = images.slice(0, 5);

  const go = useCallback((n: number) => setI((p) => (n + images.length) % images.length), [images.length]);
  const show = (start: number) => { setI(start); setOpen(true); };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowRight') go(i + 1);
      if (e.key === 'ArrowLeft') go(i - 1);
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open, i, go]);

  if (mosaic.length === 0) {
    return <div className="gallery"><div className="g-main g-empty">No photos yet</div></div>;
  }

  return (
    <>
      <div className="gallery">
        {mosaic.map((src, idx) => (
          <button key={idx} type="button" className={`g-cell${idx === 0 ? ' g-main' : ''}`} onClick={() => show(idx)} aria-label={`View photo ${idx + 1}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={`${title} photo ${idx + 1}`} loading={idx === 0 ? 'eager' : 'lazy'} />
          </button>
        ))}
        {images.length > 1 && (
          <button type="button" className="gallery-all" onClick={() => show(0)}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></svg>
            Show all {images.length} photos
          </button>
        )}
      </div>

      {open && (
        <div className="lightbox" role="dialog" aria-modal="true" onClick={() => setOpen(false)}>
          <button type="button" className="lb-close" aria-label="Close" onClick={() => setOpen(false)}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
          </button>
          <span className="lb-count">{i + 1} / {images.length}</span>
          {images.length > 1 && (
            <button type="button" className="lb-nav lb-prev" aria-label="Previous" onClick={(e) => { e.stopPropagation(); go(i - 1); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
            </button>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="lb-img" src={images[i]} alt={`${title} photo ${i + 1}`} onClick={(e) => e.stopPropagation()} />
          {images.length > 1 && (
            <button type="button" className="lb-nav lb-next" aria-label="Next" onClick={(e) => { e.stopPropagation(); go(i + 1); }}>
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          )}
        </div>
      )}
    </>
  );
}
