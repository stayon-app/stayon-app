'use client';

import { useEffect, useRef, useState } from 'react';

<<<<<<< Updated upstream
// Scroll-reveal: fades/slides its children in the first time they enter the
// viewport, then disconnects. `delay` staggers items in a row. Neutralized by
// globals.css under prefers-reduced-motion.
=======
// Fades+slides children in once they scroll into view. Disconnects after the
// first trigger (no repeat animation on scroll-back). `prefers-reduced-motion`
// is handled globally in globals.css (.reveal), not here.
>>>>>>> Stashed changes
export function Reveal({
  children,
  delay = 0,
  className = '',
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
<<<<<<< Updated upstream
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisible(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    io.observe(el);
    return () => io.disconnect();
=======
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
>>>>>>> Stashed changes
  }, []);

  return (
    <div
      ref={ref}
<<<<<<< Updated upstream
      className={`reveal${visible ? ' is-visible' : ''} ${className}`.trim()}
      style={{ transitionDelay: `${delay}ms` }}
=======
      className={`reveal ${visible ? 'is-visible' : ''} ${className}`.trim()}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
>>>>>>> Stashed changes
    >
      {children}
    </div>
  );
}
