'use client';

import { useEffect, useState } from 'react';

// Auto-cycling background images with a slow cross-fade. Pauses under
// prefers-reduced-motion (shows the first image only). Purely decorative.
export function RotatingBg({
  images,
  interval = 5000,
  className = '',
  children,
}: {
  images: string[];
  interval?: number;
  className?: string;
  children?: React.ReactNode;
}) {
  const [i, setI] = useState(0);

  useEffect(() => {
    if (images.length < 2) return;
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const t = setInterval(() => setI((v) => (v + 1) % images.length), interval);
    return () => clearInterval(t);
  }, [images.length, interval]);

  return (
    <div className={`rot-bg ${className}`.trim()}>
      {images.map((src, idx) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" aria-hidden className={`rot-bg-img${idx === i ? ' is-active' : ''}`} />
      ))}
      {children != null && <div className="rot-bg-content">{children}</div>}
    </div>
  );
}
