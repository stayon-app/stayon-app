'use client';

// Interactive map search — Leaflet + OpenStreetMap tiles (free, no key) with:
//  · location search via Nominatim geocoding (free, no key)
//  · a draggable center pin + adjustable radius circle
//  · live results from the backend's geo search (/search?lat&lng&radius)
// Price pins are L.divIcons (no image assets → no bundler icon issues).

import 'leaflet/dist/leaflet.css';
import { useEffect, useRef, useState, useCallback } from 'react';
import type * as LT from 'leaflet';
import Link from 'next/link';
import { usePrefs } from './PrefsProvider';
import { API } from '@/lib/stayonClient';
import type { Listing } from '@/lib/types';

interface Suggestion {
  display_name: string;
  lat: string;
  lon: string;
}

const DEFAULT_CENTER = { lat: 20.5937, lng: 78.9629 }; // India
const DEFAULT_RADIUS = 50; // km

export function MapSearch() {
  const { format } = usePrefs();

  const mapEl = useRef<HTMLDivElement>(null);
  const LRef = useRef<typeof LT | null>(null);
  const mapRef = useRef<LT.Map | null>(null);
  const pinRef = useRef<LT.Marker | null>(null);
  const circleRef = useRef<LT.Circle | null>(null);
  const staysLayerRef = useRef<LT.LayerGroup | null>(null);

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [stays, setStays] = useState<(Listing & { distanceKm?: number })[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingStays, setLoadingStays] = useState(false);
  const [placed, setPlaced] = useState(false); // has the user picked a location yet?

  // ── boot Leaflet (client-only) ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = (await import('leaflet')).default as unknown as typeof LT;
      if (cancelled || !mapEl.current || mapRef.current) return;
      LRef.current = L;

      const map = L.map(mapEl.current, { zoomControl: true }).setView(
        [DEFAULT_CENTER.lat, DEFAULT_CENTER.lng],
        5,
      );
      L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }).addTo(map);

      staysLayerRef.current = L.layerGroup().addTo(map);

      // Click anywhere to (re)place the search center
      map.on('click', (e: LT.LeafletMouseEvent) => {
        setCenter({ lat: e.latlng.lat, lng: e.latlng.lng });
        setPlaced(true);
      });

      mapRef.current = map;
    })();
    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // ── keep pin + circle in sync with center/radius ──────────────────────────
  useEffect(() => {
    const L = LRef.current, map = mapRef.current;
    if (!L || !map || !placed) return;

    const pinIcon = L.divIcon({
      className: 'center-pin',
      html: '<div class="center-pin-dot"></div>',
      iconSize: [18, 18],
      iconAnchor: [9, 9],
    });

    if (!pinRef.current) {
      pinRef.current = L.marker([center.lat, center.lng], { draggable: true, icon: pinIcon }).addTo(map);
      pinRef.current.on('dragend', () => {
        const p = pinRef.current!.getLatLng();
        setCenter({ lat: p.lat, lng: p.lng });
      });
    } else {
      pinRef.current.setLatLng([center.lat, center.lng]);
    }

    if (!circleRef.current) {
      circleRef.current = L.circle([center.lat, center.lng], {
        radius: radius * 1000,
        color: '#0d9488',
        weight: 2,
        fillColor: '#0d9488',
        fillOpacity: 0.08,
      }).addTo(map);
    } else {
      circleRef.current.setLatLng([center.lat, center.lng]);
      circleRef.current.setRadius(radius * 1000);
    }

    map.fitBounds(circleRef.current.getBounds(), { padding: [30, 30] });
  }, [center, radius, placed]);

  // ── fetch stays inside the circle ─────────────────────────────────────────
  useEffect(() => {
    if (!placed) return;
    let cancelled = false;
    setLoadingStays(true);
    fetch(`${API}/search?lat=${center.lat}&lng=${center.lng}&radius=${radius}`)
      .then((r) => r.json())
      .then((j) => !cancelled && setStays(j.results || []))
      .catch(() => !cancelled && setStays([]))
      .finally(() => !cancelled && setLoadingStays(false));
    return () => {
      cancelled = true;
    };
  }, [center, radius, placed]);

  // ── render price pins ─────────────────────────────────────────────────────
  useEffect(() => {
    const L = LRef.current, layer = staysLayerRef.current;
    if (!L || !layer) return;
    layer.clearLayers();
    stays.forEach((s) => {
      if (s.lat == null || s.lng == null) return;
      const icon = L.divIcon({
        className: 'price-pin-wrap',
        html: `<div class="price-pin">${format(s.priceUSD)}</div>`,
        iconSize: [0, 0],
      });
      const m = L.marker([s.lat, s.lng], { icon });
      m.bindPopup(
        `<a href="/stay/${s.id}" class="map-pop">
           ${s.images?.[0] ? `<img src="${s.images[0]}" alt=""/>` : ''}
           <b>${s.title}</b>
           <span>${format(s.priceUSD)} / night${s.distanceKm != null ? ` · ${s.distanceKm} km away` : ''}</span>
         </a>`,
        { closeButton: false },
      );
      layer.addLayer(m);
    });
  }, [stays, format]);

  // ── Nominatim location search ─────────────────────────────────────────────
  const geocode = useCallback(async (q: string) => {
    if (q.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(q)}`,
      );
      setSuggestions(res.ok ? await res.json() : []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  // debounce typing
  useEffect(() => {
    const t = setTimeout(() => geocode(query), 400);
    return () => clearTimeout(t);
  }, [query, geocode]);

  const pick = (s: Suggestion) => {
    setSuggestions([]);
    setQuery(s.display_name.split(',')[0]);
    setCenter({ lat: parseFloat(s.lat), lng: parseFloat(s.lon) });
    setPlaced(true);
  };

  const useMyLocation = () => {
    navigator.geolocation?.getCurrentPosition((pos) => {
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      setPlaced(true);
      setQuery('My location');
    });
  };

  return (
    <div className="map-page">
      {/* Controls */}
      <div className="map-controls">
        <div className="map-search-box">
          <input
            placeholder="Search a place — city, area, landmark…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {searching && <span className="map-hint">…</span>}
          {suggestions.length > 0 && (
            <div className="map-suggestions">
              {suggestions.map((s, i) => (
                <button key={i} onClick={() => pick(s)}>{s.display_name}</button>
              ))}
            </div>
          )}
        </div>
        <button className="btn btn-ghost" onClick={useMyLocation}>📍 My location</button>
        <label className="radius-ctl">
          <span>Radius <b>{radius} km</b></span>
          <input
            type="range"
            min={2}
            max={200}
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
          />
        </label>
      </div>

      {/* Map */}
      <div className="map-canvas" ref={mapEl}>
        {!placed && (
          <div className="map-overlay-hint">
            Search a place above, tap the map, or use 📍 — then drag the pin and tune the radius.
          </div>
        )}
      </div>

      {/* Results */}
      <div className="map-results">
        <div className="section-head">
          <h2>{placed ? `${stays.length} stays in this area` : 'Pick a location to see stays'}</h2>
          {loadingStays && <span className="muted">searching…</span>}
        </div>
        <div className="grid">
          {stays.map((s) => (
            <Link key={s.id} href={`/stay/${s.id}`} className="card">
              <div className="photo">
                {s.images?.[0] ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={s.images[0]} alt={s.title} loading="lazy" />
                ) : null}
                {s.distanceKm != null && <span className="badge">{s.distanceKm} km</span>}
              </div>
              <div className="meta">
                <div className="row"><span className="title">{s.title}</span></div>
                <div className="place">{s.city}{s.country ? `, ${s.country}` : ''}</div>
                <div className="price"><b>{format(s.priceUSD)}</b> <span className="price-suffix">night · 0% fee</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
