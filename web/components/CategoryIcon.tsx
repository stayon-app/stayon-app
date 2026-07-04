// Inline-SVG line icons for the category rail — teal stroke via currentColor,
// matching the mobile apps' vector-icon look (not emoji). One key per category
// in lib/categories.ts.
const P = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.7,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
};

export function CategoryIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    all: <><path d="M3 11.5 12 4l9 7.5" /><path d="M5 10v9h14v-9" /></>,
    beach: <><path d="M12 3a7 7 0 0 0-7 7h14a7 7 0 0 0-7-7Z" /><path d="M12 10v11" /><path d="M12 10 8 6" /></>,
    luxe: <><path d="M6 4h12l3 5-9 11L3 9l3-5Z" /><path d="M3 9h18" /><path d="m9 4-1.5 5L12 20l4.5-11L15 4" /></>,
    mountain: <><path d="m3 19 6-11 4 7 2-3 6 7H3Z" /><circle cx="8" cy="6" r="1.4" /></>,
    city: <><path d="M4 21V7l6-3v17" /><path d="M10 21V9l10 3v9" /><path d="M14 13h.01M14 16h.01M17 13.5h.01M17 16.5h.01" /></>,
    lake: <><path d="M3 8c2-1.5 3.5-1.5 5.5 0S12 9.5 14 8s3.5-1.5 5.5 0" /><path d="M3 13c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0" /><path d="M3 18c2-1.5 3.5-1.5 5.5 0s3.5 1.5 5.5 0 3.5-1.5 5.5 0" /></>,
    romantic: <path d="M12 20s-7-4.6-7-9.5A3.5 3.5 0 0 1 12 7a3.5 3.5 0 0 1 7 3.5C19 15.4 12 20 12 20Z" />,
    ski: <><path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9" /></>,
    family: <><circle cx="8" cy="8" r="2.4" /><circle cx="16" cy="8" r="2.4" /><path d="M3.5 20v-1a4 4 0 0 1 4-4h1a4 4 0 0 1 4 4v1" /><path d="M12.5 20v-1a4 4 0 0 1 4-4h0a4 4 0 0 1 4 4v1" /></>,
    budget: <><path d="M20 12 12 4H4v8l8 8 8-8Z" /><circle cx="8" cy="8" r="1.3" /></>,
  };
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden {...P}>
      {paths[name] ?? paths.all}
    </svg>
  );
}
