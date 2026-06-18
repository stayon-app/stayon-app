'use client';

import { usePrefs } from './PrefsProvider';

// Renders a USD amount in the viewer's selected currency. Used by server-rendered
// cards/detail pages (a tiny client island so currency switches update live).
export function Price({ usd, suffix, bold }: { usd: number; suffix?: string; bold?: boolean }) {
  const { format } = usePrefs();
  return (
    <span className="price-val">
      {bold ? <b>{format(usd)}</b> : format(usd)}
      {suffix ? <span className="price-suffix"> {suffix}</span> : null}
    </span>
  );
}
