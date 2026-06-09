import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  price: number;        // USD
  title: string;
  priceLabel?: string;  // pre-formatted in the user's currency (e.g. "₹14,546")
}

export type MapType = 'standard' | 'satellite' | 'hybrid';

interface PropertyMapWebProps {
  pins: MapPin[];
  centerLat?: number;
  centerLng?: number;
  zoom?: number;
  onPinPress?: (id: string) => void;
  isDark?: boolean;
  focusId?: string | null;   // pan + highlight a pin when this changes
  mapType?: MapType;         // standard (street) | satellite | hybrid
  userLocation?: { lat: number; lng: number } | null; // blue dot for current location
  // 'price' = Airbnb-style price bubbles (search/results); 'location' = a single
  // map pin pointing at the stay (property detail — no price shown).
  pinStyle?: 'price' | 'location';
}

/**
 * Web-only interactive map using Leaflet + OpenStreetMap (no API key needed).
 * Renders Airbnb-style price pins, supports pan/zoom, and posts the pin id
 * back to React when a marker is tapped.
 */
export const PropertyMapWeb: React.FC<PropertyMapWebProps> = ({
  pins,
  centerLat,
  centerLng,
  zoom = 4,
  onPinPress,
  focusId,
  isDark = false,
  mapType = 'standard',
  userLocation = null,
  pinStyle = 'price',
}) => {
  const iframeRef = useRef<any>(null);

  const cLat = centerLat ?? (pins.length ? pins[0].lat : 39.5);
  const cLng = centerLng ?? (pins.length ? pins[0].lng : -98.35);

  // Standard (street) tiles — light or dark Carto basemaps.
  const standardTile = isDark
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';
  // Satellite imagery (Esri World Imagery — note {z}/{y}/{x} order).
  const esriImagery =
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
  // Labels/reference overlay for hybrid mode (place names + boundaries).
  const esriReference =
    'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}';

  // Build the Leaflet tileLayer setup JS for the selected map type.
  let tileLayersJS: string;
  if (mapType === 'satellite') {
    tileLayersJS = `L.tileLayer('${esriImagery}', { maxZoom: 19 }).addTo(map);`;
  } else if (mapType === 'hybrid') {
    tileLayersJS =
      `L.tileLayer('${esriImagery}', { maxZoom: 19 }).addTo(map);\n` +
      `    L.tileLayer('${esriReference}', { maxZoom: 19 }).addTo(map);`;
  } else {
    tileLayersJS = `L.tileLayer('${standardTile}', { maxZoom: 19 }).addTo(map);`;
  }

  const markerColor = '#0D9488';
  const markerSelected = '#0F172A';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <style>
    * { box-sizing: border-box; }
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${isDark ? '#0A0F0D' : '#eaeaea'}; }
    html, body { overflow: hidden; border: 0; }
    /* fill edge-to-edge so no white band shows above the tiles */
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    /* let Leaflet own all touch gestures (pinch/drag) instead of the page */
    #map { touch-action: none; }
    .price-pin {
      background: #fff;
      color: #0F172A;
      border: 1.5px solid rgba(0,0,0,0.12);
      border-radius: 20px;
      padding: 4px 9px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 13px;
      font-weight: 800;
      box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      white-space: nowrap;
      transition: all 0.15s;
      cursor: pointer;
    }
    .price-pin:hover, .price-pin.active {
      background: ${markerSelected};
      color: #fff;
      transform: scale(1.08);
      z-index: 1000;
    }
    /* Single location pin for the property detail map (no price). */
    .loc-pin {
      position: relative; width: 26px; height: 26px;
      background: ${markerColor};
      border: 2.5px solid #fff; border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
    }
    .loc-pin::after {
      content: ''; position: absolute; top: 6px; left: 6px;
      width: 9px; height: 9px; background: #fff; border-radius: 50%;
    }
    .leaflet-popup-content { font-family: -apple-system, system-ui, sans-serif; }
    .user-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: #2563EB; border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.25), 0 1px 4px rgba(0,0,0,0.4);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var pins = ${JSON.stringify(pins)};
    var map = L.map('map', {
      zoomControl: true,
      attributionControl: false,
      touchZoom: true,          // pinch-to-zoom on touch devices
      scrollWheelZoom: true,    // wheel / trackpad zoom
      doubleClickZoom: true,
      dragging: true,
      tap: true,
      bounceAtZoomLimits: true,
    }).setView([${cLat}, ${cLng}], ${zoom});
    ${tileLayersJS}

    var userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};
    if (userLoc) {
      var userIcon = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
      L.marker([userLoc.lat, userLoc.lng], { icon: userIcon, interactive: false, zIndexOffset: 500 }).addTo(map);
    }

    var pinStyle = '${pinStyle}';
    var markers = [];
    pins.forEach(function(p) {
      var icon = pinStyle === 'location'
        ? L.divIcon({
            className: '',
            html: '<div class="loc-pin" data-id="' + p.id + '"></div>',
            iconSize: [26, 26],
            iconAnchor: [13, 26],
          })
        : L.divIcon({
            className: '',
            html: '<div class="price-pin" data-id="' + p.id + '">' + (p.priceLabel || ('$' + p.price)) + '</div>',
            iconSize: null,
          });
      var m = L.marker([p.lat, p.lng], { icon: icon }).addTo(map);
      m.on('click', function() {
        document.querySelectorAll('.price-pin').forEach(function(el){ el.classList.remove('active'); });
        var el = document.querySelector('.price-pin[data-id="' + p.id + '"]');
        if (el) el.classList.add('active');
        if (window.parent) {
          window.parent.postMessage(JSON.stringify({ type: 'pinPress', id: p.id, title: p.title, price: p.price }), '*');
        }
      });
      markers.push(m);
    });

    // Fit all pins in view if more than one
    if (pins.length > 1) {
      var group = L.featureGroup(markers);
      map.fitBounds(group.getBounds().pad(0.2));
    }

    // Force Leaflet to recompute its container size so the tiles fill
    // edge-to-edge (avoids a white band when the iframe sizes after init).
    function fixSize() { map.invalidateSize(true); }
    setTimeout(fixSize, 0);
    setTimeout(fixSize, 250);
    window.addEventListener('resize', fixSize);
    window.addEventListener('load', fixSize);

    var pinById = {};
    pins.forEach(function(p) { pinById[p.id] = p; });

    // Parent → iframe: focus/pan to a pin and highlight it
    window.addEventListener('message', function(e) {
      try {
        var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
        if (d && d.type === 'focus' && pinById[d.id]) {
          var p = pinById[d.id];
          map.flyTo([p.lat - 0.01, p.lng], Math.max(map.getZoom(), 12), { duration: 0.6 });
          document.querySelectorAll('.price-pin').forEach(function(el){ el.classList.remove('active'); });
          var el = document.querySelector('.price-pin[data-id="' + d.id + '"]');
          if (el) el.classList.add('active');
        }
        if (d && d.type === 'recenter' && typeof d.lat === 'number' && typeof d.lng === 'number') {
          // Drop or move the "you are here" marker, then fly to it.
          if (!window.__userMarker) {
            var ui = L.divIcon({ className: '', html: '<div class="user-dot"></div>', iconSize: [16, 16], iconAnchor: [8, 8] });
            window.__userMarker = L.marker([d.lat, d.lng], { icon: ui, interactive: false, zIndexOffset: 500 }).addTo(map);
          } else {
            window.__userMarker.setLatLng([d.lat, d.lng]);
          }
          map.flyTo([d.lat, d.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
        }
      } catch (err) {}
    });
  </script>
</body>
</html>`;

  useEffect(() => {
    const win: any = (globalThis as any).window;
    if (!win) return;
    const handler = (event: any) => {
      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (data?.type === 'pinPress' && onPinPress) {
          onPinPress(data.id);
        }
      } catch {
        // ignore non-JSON messages
      }
    };
    win.addEventListener('message', handler);
    return () => win.removeEventListener('message', handler);
  }, [onPinPress]);

  // Parent → iframe: pan/highlight the focused pin (no reload)
  useEffect(() => {
    if (!focusId) return;
    const cw = iframeRef.current?.contentWindow;
    if (cw) {
      // small delay so the iframe is ready
      const t = setTimeout(() => {
        cw.postMessage(JSON.stringify({ type: 'focus', id: focusId }), '*');
      }, 50);
      return () => clearTimeout(t);
    }
  }, [focusId]);

  // Parent → iframe: recenter map on the user's current location (locate button)
  useEffect(() => {
    if (!userLocation) return;
    const cw = iframeRef.current?.contentWindow;
    if (cw) {
      const t = setTimeout(() => {
        cw.postMessage(
          JSON.stringify({ type: 'recenter', lat: userLocation.lat, lng: userLocation.lng }),
          '*'
        );
      }, 50);
      return () => clearTimeout(t);
    }
  }, [userLocation?.lat, userLocation?.lng]);

  return (
    <View style={styles.container}>
      {/* @ts-ignore — iframe is a real DOM element under react-native-web */}
      <iframe
        ref={iframeRef}
        srcDoc={html}
        style={{
          border: 0,
          margin: 0,
          padding: 0,
          // absolutely fill the container so the iframe can never collapse
          // its height (the cause of the white strip above the map)
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100%',
          height: '100%',
          display: 'block',     // kill the inline-element baseline gap (white strip)
          verticalAlign: 'top',
        }}
        scrolling="no"
        title="Property map"
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    // fill the parent edge-to-edge, no stray gap at the top
    position: 'absolute',
    top: 0, left: 0, right: 0, bottom: 0,
    flex: 1,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
});
