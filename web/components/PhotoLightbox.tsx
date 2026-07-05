'use client';

import { useEffect, useState } from 'react';

// Full-bleed gallery viewer. Owns its own trigger button + open state so the
// parent server component can just render <PhotoLightbox images={...} />
// with no lifted state. Keyboard nav (Escape/arrows), click-outside to close.
export function PhotoLightbox({ images, count }: { images: string[]; count?: number }) {
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowLeft') setIndex((i) => (i - 1 + images.length) % images.length);
      if (e.key === 'ArrowRight') setIndex((i) => (i + 1) % images.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, images.length]);

  if (images.length === 0) return null;

  return (
    <>
      <button type="button" className="gallery-more-btn" onClick={() => { setIndex(0); setOpen(true); }}>
        Show all photos ({count ?? images.length})
      </button>
      {open ? (
        <div className="lightbox-overlay" onClick={() => setOpen(false)}>
          <button
            type="button"
            className="lightbox-close"
            onClick={() => setOpen(false)}
            aria-label="Close"
          >
            ✕
          </button>
          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-prev"
              aria-label="Previous photo"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i - 1 + images.length) % images.length);
              }}
            >
              ‹
            </button>
          ) : null}
          <div className="lightbox-img-wrap" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={images[index]} alt={`Photo ${index + 1} of ${images.length}`} />
          </div>
          {images.length > 1 ? (
            <button
              type="button"
              className="lightbox-next"
              aria-label="Next photo"
              onClick={(e) => {
                e.stopPropagation();
                setIndex((i) => (i + 1) % images.length);
              }}
            >
              ›
            </button>
          ) : null}
          <span className="lightbox-count">{index + 1} / {images.length}</span>
        </div>
      ) : null}
    </>
  );
}
