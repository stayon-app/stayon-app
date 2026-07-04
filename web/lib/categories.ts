// Browse categories for the home category rail. `icon` maps to an inline-SVG
// in components/CategoryIcon.tsx (teal line icons, matching the app's look —
// not emoji). `q` is the search query the pill links to (empty = browse all).
export type Category = { label: string; icon: string; q: string };

export const CATEGORIES: Category[] = [
  { label: 'All', icon: 'all', q: '' },
  { label: 'Beachfront', icon: 'beach', q: 'Beachfront' },
  { label: 'Luxe', icon: 'luxe', q: 'Luxe' },
  { label: 'Mountain', icon: 'mountain', q: 'Mountain' },
  { label: 'City', icon: 'city', q: 'City' },
  { label: 'Lakefront', icon: 'lake', q: 'Lakefront' },
  { label: 'Romantic', icon: 'romantic', q: 'Romantic' },
  { label: 'Ski', icon: 'ski', q: 'Ski' },
  { label: 'Family', icon: 'family', q: 'Family' },
  { label: 'Budget', icon: 'budget', q: 'Budget' },
];
