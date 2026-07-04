import Link from 'next/link';
import { CATEGORIES } from '@/lib/categories';
import { CategoryIcon } from './CategoryIcon';

// Horizontal, scrollable category pills with teal line-icons in mint circles.
// Server component — pure links to /search. `active` highlights the first pill.
export function CategoryRail({ active = 'All' }: { active?: string }) {
  return (
    <div className="cat-rail" role="navigation" aria-label="Browse by category">
      {CATEGORIES.map((c) => (
        <Link
          key={c.label}
          href={`/search${c.q ? `?q=${encodeURIComponent(c.q)}` : ''}`}
          className={`cat-pill${c.label === active ? ' is-active' : ''}`}
        >
          <span className="cat-ic"><CategoryIcon name={c.icon} /></span>
          {c.label}
        </Link>
      ))}
    </div>
  );
}
