// Monochrome, solid-line icons for the listing wizard — dark line style,
// never coloured (fill: none, stroke: currentColor), matching the host app's
// Ionicons-outline look. One tiny 24×24 glyph per key.
import type { CSSProperties } from 'react';

const P: Record<string, JSX.Element> = {
  home: <><path d="M4 11.5 12 4l8 7.5" /><path d="M6 10v10h12V10" /></>,
  building: <><rect x="6" y="3" width="12" height="18" rx="1" /><path d="M9 7h2M13 7h2M9 11h2M13 11h2M9 15h2M13 15h2" /></>,
  storefront: <><path d="M4 9 5 4h14l1 5" /><path d="M4 9a2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0 2.5 2.5 0 0 0 5 0" /><path d="M5 11v9h14v-9" /><path d="M10 20v-5h4v5" /></>,
  cafe: <><path d="M5 8h11v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V8Z" /><path d="M16 9h2.5a2 2 0 0 1 0 4H16" /><path d="M7 3v2M11 3v2" /></>,
  boat: <><path d="M4 14h16l-2 5H6l-2-5Z" /><path d="M12 4v10M12 4l5 4-5 2" /></>,
  leaf: <><path d="M5 19C5 11 11 5 19 5c0 8-6 14-14 14Z" /><path d="M5 19c3-4 6-6 10-8" /></>,
  bus: <><rect x="4" y="5" width="16" height="12" rx="2" /><path d="M4 12h16" /><circle cx="8" cy="19" r="1.4" /><circle cx="16" cy="19" r="1.4" /></>,
  shield: <><path d="M12 3 5 6v6c0 4 3 7 7 9 4-2 7-5 7-9V6l-7-3Z" /></>,
  triangle: <><path d="M12 5 3 20h18L12 5Z" /></>,
  cube: <><path d="M12 3 4 7v10l8 4 8-4V7l-8-4Z" /><path d="M4 7l8 4 8-4M12 11v10" /></>,
  dome: <><path d="M4 18a8 8 0 0 1 16 0" /><path d="M3 18h18" /><path d="M12 10v8" /></>,
  flower: <><circle cx="12" cy="9" r="2.4" /><path d="M12 6.6C12 4 10.5 3 9 4c-1.2.8-1 3 .8 4M12 6.6C12 4 13.5 3 15 4c1.2.8 1 3-.8 4M9.6 9C7 9 6 10.5 7 12c.8 1.2 3 1 4-.8M14.4 9C17 9 18 10.5 17 12c-.8 1.2-3 1-4-.8" /><path d="M12 12v9" /></>,
  people: <><circle cx="9" cy="8" r="3" /><path d="M3 20a6 6 0 0 1 12 0" /><path d="M16 5.2A3 3 0 0 1 18 11M17 14.5A6 6 0 0 1 21 20" /></>,
  person: <><circle cx="12" cy="8" r="3.2" /><path d="M5 20a7 7 0 0 1 14 0" /></>,
  bed: <><path d="M3 18V7M3 12h18v6M21 18v-4a3 3 0 0 0-3-3h-6v4" /><circle cx="7" cy="11" r="1.6" /></>,
  albums: <><rect x="4" y="8" width="16" height="12" rx="2" /><path d="M6 5h12M7 2.5h10" /></>,
  heart: <><path d="M12 20S4 14.5 4 9.2A4.2 4.2 0 0 1 12 7a4.2 4.2 0 0 1 8 2.2C20 14.5 12 20 12 20Z" /></>,
  camera: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M8 7l1.5-3h5L16 7" /><circle cx="12" cy="13.5" r="3.2" /></>,
  diamond: <><path d="M6 4h12l3 5-9 11L3 9l3-5Z" /><path d="M3 9h18M9 4l-1.5 5L12 20l4.5-11L15 4" /></>,
  sparkles: <><path d="M12 3l1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3Z" /><path d="M18 15l.8 2.2L21 18l-2.2.8L18 21l-.8-2.2L15 18l2.2-.8L18 15Z" /></>,
  location: <><path d="M12 21s7-6.3 7-11a7 7 0 0 0-14 0c0 4.7 7 11 7 11Z" /><circle cx="12" cy="10" r="2.6" /></>,
  star: <><path d="M12 3.5l2.6 5.3 5.9.9-4.2 4.1 1 5.8L12 17l-5.3 2.6 1-5.8L3.5 9.7l5.9-.9L12 3.5Z" /></>,
  calendar: <><rect x="4" y="5" width="16" height="16" rx="2" /><path d="M4 9h16M8 3v4M16 3v4" /></>,
  flash: <><path d="M13 3 5 13h5l-1 8 8-11h-5l1-7Z" /></>,
  navigate: <><path d="M20 4 4 11l7 2 2 7 7-16Z" /></>,
  images: <><rect x="3" y="5" width="18" height="14" rx="2" /><circle cx="8.5" cy="10" r="1.6" /><path d="m5 18 5-5 4 3 3-3 4 4" /></>,
  plus: <><path d="M12 6v12M6 12h12" /></>,
  minus: <><path d="M6 12h12" /></>,
  check: <><path d="m5 12.5 4.5 4.5L19 7" /></>,
  close: <><path d="M6 6l12 12M18 6 6 18" /></>,
  chevron: <><path d="m9 6 6 6-6 6" /></>,
  radioOn: <><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="4" fill="currentColor" stroke="none" /></>,
  radioOff: <><circle cx="12" cy="12" r="9" /></>,
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.2-3.2" /></>,
  key: <><circle cx="8" cy="15" r="4" /><path d="m11 12 8-8M17 4l2.5 2.5M14.5 6.5 17 9" /></>,
  map: <><path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" /><path d="M9 4v14M15 6v14" /></>,
  tag: <><path d="M4 4h7l9 9-7 7-9-9V4Z" /><circle cx="8" cy="8" r="1.4" fill="currentColor" stroke="none" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>,
  cash: <><rect x="3" y="6" width="18" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /><path d="M6 9v6M18 9v6" /></>,
  verified: <><path d="M12 3.2 14 5l2.7-.3.6 2.6L20 9.2l-1.4 2.3L20 13.8 17.3 15l-.6 2.6L14 17.3 12 19l-2-1.7-2.7.3L6.7 15 4 13.8l1.4-2.3L4 9.2l2.7-1.9.6-2.6L10 5l2-1.8Z" /><path d="m9 12 2 2 4-4" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5 5-2Z" /></>,
  filters: <><path d="M4 7h16M7 12h10M10 17h4" /></>,
};

export function WizIcon({ name, size = 24, style }: { name: string; size?: number; style?: CSSProperties }) {
  const glyph = P[name] || P.home;
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round"
      style={style} aria-hidden
    >
      {glyph}
    </svg>
  );
}
