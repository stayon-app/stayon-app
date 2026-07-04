'use client';

// Map search page. Leaflet touches `window`, so the component is loaded
// client-side only (no SSR).

import dynamic from 'next/dynamic';

const MapSearch = dynamic(
  () => import('@/components/MapSearch').then((m) => m.MapSearch),
  { ssr: false, loading: () => <div className="container section"><p className="muted">Loading map…</p></div> },
);

export default function MapPage() {
  return (
    <section className="section map-section">
      <div className="container">
        <MapSearch />
      </div>
    </section>
  );
}
