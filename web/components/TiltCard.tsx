'use client';

import { useRef } from 'react';

<<<<<<< Updated upstream
// Perspective/rotate tilt on hover, driven by direct DOM style writes (not React
// state) so it doesn't re-render per mousemove. Inert on touch; globals.css
// forces the transform off under prefers-reduced-motion / (hover: none).
=======
// Perspective/rotate tilt on hover, driven by direct DOM style writes (not
// React state) so it doesn't re-render per mousemove. Inert on touch — no
// mousemove events fire there — and globals.css forces the transform off
// under `prefers-reduced-motion` / `(hover: none)`.
>>>>>>> Stashed changes
export function TiltCard({
  children,
  className = '',
  maxTilt = 6,
}: {
  children: React.ReactNode;
  className?: string;
  maxTilt?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    el.style.setProperty('--ry', `${px * maxTilt * 2}deg`);
    el.style.setProperty('--rx', `${-py * maxTilt * 2}deg`);
  };

  const onMouseLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty('--rx', '0deg');
    el.style.setProperty('--ry', '0deg');
  };

  return (
    <div
      ref={ref}
      className={`tilt-card ${className}`.trim()}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
    >
      {children}
    </div>
  );
}
