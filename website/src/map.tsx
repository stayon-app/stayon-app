import React, { useEffect, useRef } from 'react';
import type { Stay } from './data';

// Leaflet is loaded via CDN (see index.html) → available as window.L
declare const L: any;

export function StayMap({ stays, center, money, activeId, onPick }: {
  stays: Stay[];
  center: { lat: number; lng: number } | null;
  money: (n: number) => string;
  activeId?: string | null;
  onPick: (id: string) => void;
}) {
  const elRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const layerRef = useRef<any>(null);
  // marker instances kept by stay id so we can re-style the active one
  // without tearing down and rebuilding every pin on each hover.
  const markersRef = useRef<Map<string, any>>(new Map());

  const makeIcon = (price: number, on: boolean) =>
    L.divIcon({
      className: 'price-pin-wrap',
      html: `<span class="price-pin${on ? ' on' : ''}">${money(price)}</span>`,
      iconSize: [56, 28], iconAnchor: [28, 14],
    });

  // init once
  useEffect(() => {
    if (!elRef.current || mapRef.current || typeof L === 'undefined') return;
    const c = center || { lat: 20.5, lng: 78.9 };
    mapRef.current = L.map(elRef.current, { scrollWheelZoom: true, zoomControl: true }).setView([c.lat, c.lng], 12);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© OpenStreetMap, © CARTO', maxZoom: 19,
    }).addTo(mapRef.current);
    layerRef.current = L.layerGroup().addTo(mapRef.current);
    setTimeout(() => mapRef.current && mapRef.current.invalidateSize(), 50);
  }, []);

  // recenter when the searched location changes
  useEffect(() => {
    if (mapRef.current && center) mapRef.current.setView([center.lat, center.lng], 12);
  }, [center?.lat, center?.lng]);

  // (re)draw price pins when the stay list changes
  useEffect(() => {
    if (!mapRef.current || !layerRef.current || typeof L === 'undefined') return;
    layerRef.current.clearLayers();
    markersRef.current.clear();
    stays.forEach((s) => {
      const on = s.id === activeId;
      const m = L.marker([s.lat, s.lng], { icon: makeIcon(s.price, on), riseOnHover: true }).addTo(layerRef.current);
      // Leaflet stacks markers by latitude, so a highlighted pin can hide
      // behind nearby ones. Lift the active pin to the top instead.
      if (on) m.setZIndexOffset(1000);
      m.on('click', () => onPick(s.id));
      markersRef.current.set(s.id, m);
    });
  }, [stays, money, onPick]);

  // re-style only the active pin on hover — no full redraw, and bring it to front
  useEffect(() => {
    if (typeof L === 'undefined') return;
    markersRef.current.forEach((m, id) => {
      const s = stays.find((x) => x.id === id);
      if (!s) return;
      const on = id === activeId;
      m.setIcon(makeIcon(s.price, on));
      m.setZIndexOffset(on ? 1000 : 0);
    });
  }, [activeId]);

  return <div className="stay-map" ref={elRef} />;
}
