'use client';

// "Where you'll be" map for the stay-detail page — Google Maps (hybrid),
// matching the mobile apps. Shows an approximate-area circle rather than an
// exact pin (the precise address is shared after booking).
import { useEffect, useRef } from 'react';
import { loadGoogleMaps } from '@/lib/googleMaps';

export function StayLocationMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !elRef.current || mapRef.current) return;
        const map = new google.maps.Map(elRef.current, {
          center: { lat, lng },
          zoom: 13,
          mapTypeId: 'hybrid',
          mapTypeControl: true,
          mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid', 'satellite'] },
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'cooperative',
          clickableIcons: false,
        });
        new google.maps.Circle({
          center: { lat, lng }, radius: 900, map,
          strokeColor: '#0d9488', strokeWeight: 2, fillColor: '#0d9488', fillOpacity: 0.12,
        });
        mapRef.current = map;
      })
      .catch(() => { /* map failed — the area text still shows */ });
    return () => { cancelled = true; };
  }, [lat, lng]);

  return (
    <div className="detail-section">
      <h3>Where you&apos;ll be</h3>
      {label && <p className="detail-map-place">{label}</p>}
      <div className="detail-map" ref={elRef} />
      <p className="detail-map-note">Exact location is provided after your booking is confirmed.</p>
    </div>
  );
}
