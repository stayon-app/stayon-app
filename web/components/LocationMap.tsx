'use client';

// Single-pin "where you'll be" map for the listing detail page. Follows
// MapSearch.tsx's exact Leaflet init/cleanup pattern (dynamic import inside
// useEffect, ref-guarded single init, remove() on unmount) to avoid the
// "Map container is already initialized" error under React 18 Strict Mode.
//
// Privacy: takes lat/lng only, never a street address — the exact address
// stays hidden pre-booking, matching the mobile guest app's convention.

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef } from 'react';
import type * as LT from 'leaflet';

export function LocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LT.Map | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default as unknown as typeof LT;
      if (cancelled || !mapEl.current || mapRef.current) return;

      const map = L.map(mapEl.current, { zoomControl: true, scrollWheelZoom: false }).setView(
        [lat, lng],
        13,
      );
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      const icon = L.divIcon({
        className: 'center-pin',
        html: '<div class="center-pin-dot"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });
      L.marker([lat, lng], { icon }).addTo(map);

      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [lat, lng]);

  return (
    <div>
      <div ref={mapEl} className="map-canvas map-mini" />
      {label ? <p className="location-text">{label}</p> : null}
    </div>
  );
}
