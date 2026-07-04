'use client';

// Interactive map search on Google Maps (hybrid/satellite), matching the mobile
// apps' map design. Features:
//  · location search via Nominatim geocoding (free, no key)
//  · a draggable center pin + adjustable radius circle
//  · live results from the backend's geo search (/search?lat&lng&radius)
//  · custom price-pill overlays that open an info popup

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import { usePrefs } from './PrefsProvider';
import { WizIcon } from './WizIcon';
import { API } from '@/lib/stayonClient';
import { loadGoogleMaps } from '@/lib/googleMaps';
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
  const gRef = useRef<any>(null);
  const mapRef = useRef<any>(null);
  const pinRef = useRef<any>(null);
  const circleRef = useRef<any>(null);
  const infoRef = useRef<any>(null);
  const overlaysRef = useRef<any[] | null>(null);
  const pinFactoryRef = useRef<((s: Listing & { distanceKm?: number }) => any) | null>(null);
  const [ready, setReady] = useState(false);

  const [center, setCenter] = useState(DEFAULT_CENTER);
  const [radius, setRadius] = useState(DEFAULT_RADIUS);
  const [stays, setStays] = useState<(Listing & { distanceKm?: number })[]>([]);
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [loadingStays, setLoadingStays] = useState(false);
  const [placed, setPlaced] = useState(false); // has the user picked a location yet?

  // ── boot Google Maps (client-only) ────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((google) => {
        if (cancelled || !mapEl.current || mapRef.current) return;
        gRef.current = google;
        const map = new google.maps.Map(mapEl.current, {
          center: DEFAULT_CENTER,
          zoom: 5,
          mapTypeId: 'hybrid',
          mapTypeControl: true,
          mapTypeControlOptions: { mapTypeIds: ['roadmap', 'hybrid', 'satellite'] },
          streetViewControl: false,
          fullscreenControl: true,
          gestureHandling: 'greedy',
          clickableIcons: false,
        });
        map.addListener('click', (e: any) => {
          setCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() });
          setPlaced(true);
        });
        mapRef.current = map;
        infoRef.current = new google.maps.InfoWindow();

        // Custom price-pill overlay (reuses the .price-pin CSS).
        class PricePin extends google.maps.OverlayView {
          div: HTMLDivElement | null = null;
          constructor(private stay: Listing & { distanceKm?: number }) { super(); }
          onAdd() {
            const d = document.createElement('div');
            d.className = 'price-pin';
            d.style.position = 'absolute';
            d.textContent = format(this.stay.priceUSD);
            d.addEventListener('click', (e) => {
              e.stopPropagation();
              const s = this.stay;
              infoRef.current.setContent(
                `<a href="/stay/${s.id}" class="map-pop">
                   ${s.images?.[0] ? `<img src="${s.images[0]}" alt="" style="width:100%;height:96px;object-fit:cover;border-radius:8px"/>` : ''}
                   <b>${s.title}</b>
                   <span>${format(s.priceUSD)} / night${s.distanceKm != null ? ` · ${s.distanceKm} km away` : ''}</span>
                 </a>`,
              );
              infoRef.current.setPosition({ lat: s.lat, lng: s.lng });
              infoRef.current.open(mapRef.current);
            });
            this.div = d;
            this.getPanes()!.floatPane.appendChild(d);
          }
          draw() {
            if (!this.div) return;
            const p = this.getProjection().fromLatLngToDivPixel(
              new google.maps.LatLng(this.stay.lat, this.stay.lng),
            );
            if (p) { this.div.style.left = `${p.x}px`; this.div.style.top = `${p.y}px`; }
          }
          onRemove() { this.div?.remove(); this.div = null; }
        }
        pinFactoryRef.current = (s) => new PricePin(s);
        setReady(true);
      })
      .catch(() => { /* map failed to load — controls + list still work */ });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── keep center pin + radius circle in sync ───────────────────────────────
  useEffect(() => {
    const google = gRef.current, map = mapRef.current;
    if (!google || !map || !placed) return;

    if (!pinRef.current) {
      pinRef.current = new google.maps.Marker({
        position: center, map, draggable: true,
        icon: { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: '#0d9488', fillOpacity: 1, strokeColor: '#fff', strokeWeight: 3 },
      });
      pinRef.current.addListener('dragend', (e: any) => {
        setCenter({ lat: e.latLng.lat(), lng: e.latLng.lng() });
      });
    } else {
      pinRef.current.setPosition(center);
    }

    if (!circleRef.current) {
      circleRef.current = new google.maps.Circle({
        center, radius: radius * 1000, map,
        strokeColor: '#0d9488', strokeWeight: 2, fillColor: '#0d9488', fillOpacity: 0.08,
      });
    } else {
      circleRef.current.setCenter(center);
      circleRef.current.setRadius(radius * 1000);
    }
    map.fitBounds(circleRef.current.getBounds(), 30);
  }, [center, radius, placed, ready]);

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
    return () => { cancelled = true; };
  }, [center, radius, placed]);

  // ── render price pins ─────────────────────────────────────────────────────
  useEffect(() => {
    const factory = pinFactoryRef.current, map = mapRef.current;
    if (!factory || !map) return;
    (overlaysRef.current || []).forEach((o) => o.setMap(null));
    overlaysRef.current = stays
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => { const pin = factory(s); pin.setMap(map); return pin; });
  }, [stays, format, ready]);

  // ── Nominatim location search ─────────────────────────────────────────────
  const geocode = useCallback(async (q: string) => {
    if (q.trim().length < 3) { setSuggestions([]); return; }
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
        <button className="btn btn-ghost sb-inline-ic" onClick={useMyLocation}><WizIcon name="navigate" size={15} /> My location</button>
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
            Search a place above, tap the map, or use “My location” — then drag the pin and tune the radius.
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
                <div className="price"><b>{format(s.priceUSD)}</b> <span className="price-suffix">night</span></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
