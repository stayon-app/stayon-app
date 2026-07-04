'use client';

// Search-results map on Google Maps (hybrid/satellite), matching the mobile
// apps. Plots stays as custom price-pill overlays; the active pin highlights,
// and clicking a pin calls onSelect so the list can highlight/scroll to it.
import { useEffect, useRef } from 'react';
import { usePrefs } from './PrefsProvider';
import { loadGoogleMaps } from '@/lib/googleMaps';
import type { Listing } from '@/lib/types';

export function SearchMap({
  stays,
  activeId,
  onSelect,
}: {
  stays: Listing[];
  activeId: string | null;
  onSelect: (id: string | null) => void;
}) {
  const { format } = usePrefs();
  const elRef = useRef<HTMLDivElement>(null);
  const gRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const pinFactoryRef = useRef<((s: Listing, active: boolean) => any) | null>(null);
  const overlaysRef = useRef<any[] | null>(null);

  const withCoords = stays.filter((s) => s.lat != null && s.lng != null);

  // Boot the map + define the custom price-pin overlay class once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        gRef.current = google;
        const map = new google.maps.Map(elRef.current, {
          center: { lat: 20.5937, lng: 78.9629 },
          zoom: 4,
          mapTypeId: 'hybrid',
          mapTypeControl: true,
          mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid', 'satellite'] },
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        map.addListener('click', () => onSelect(null));
        mapRef.current = map;

        // Custom HTML price-pill overlay (reuses the .price-pin CSS).
        class PricePin extends google.maps.OverlayView {
          div: HTMLDivElement | null = null;
          constructor(private stay: Listing, private active: boolean) { super(); }
          onAdd() {
            const d = document.createElement('div');
            d.className = `price-pin${this.active ? ' is-active' : ''}`;
            d.style.position = 'absolute';
            d.textContent = format(this.stay.priceUSD);
            d.addEventListener('click', (e) => { e.stopPropagation(); onSelect(this.stay.id); });
            this.div = d;
            this.getPanes()!.floatPane.appendChild(d);
          }
          draw() {
            if (!this.div) return;
            const p = this.getProjection().fromLatLngToDivPixel(
              new google.maps.LatLng(this.stay.lat, this.stay.lng),
            );
            if (p) { this.div.style.left = `${p.x}px`; this.div.style.top = `${p.y}px`; }
            this.div.style.zIndex = this.active ? '1000' : '1';
          }
          onRemove() { this.div?.remove(); this.div = null; }
        }
        pinFactoryRef.current = (s, active) => new PricePin(s, active);

        renderPins();
        fitBounds();
      })
      .catch(() => { /* map failed to load — the empty state shows */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const renderPins = () => {
    const factory = pinFactoryRef.current, map = mapRef.current;
    if (!factory || !map) return;
    (overlaysRef.current || []).forEach((o) => o.setMap(null));
    overlaysRef.current = withCoords.map((s) => {
      const pin = factory(s, s.id === activeId);
      pin.setMap(map);
      return pin;
    });
  };

  const fitBounds = () => {
    const google = gRef.current, map = mapRef.current;
    if (!google || !map || withCoords.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    withCoords.forEach((s) => bounds.extend(new google.maps.LatLng(s.lat, s.lng)));
    map.fitBounds(bounds, 48);
    if (withCoords.length === 1) map.setZoom(13);
  };

  // Re-render pins on list/active change; refit only when the list changes.
  useEffect(() => { renderPins(); /* eslint-disable-next-line */ }, [stays, activeId, format]);
  useEffect(() => { fitBounds(); /* eslint-disable-next-line */ }, [stays]);

  return (
    <div className="search-map" ref={elRef}>
      {withCoords.length === 0 && <div className="search-map-empty">No mapped stays for this search.</div>}
    </div>
  );
}
