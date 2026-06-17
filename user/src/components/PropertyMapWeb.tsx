import React, { useEffect, useRef } from 'react';
import { View, StyleSheet } from 'react-native';
import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from '../utils/mapStyle';
import { GOOGLE_MAPS_KEY } from '../config/maps';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  price: number;        // USD
  title: string;
  priceLabel?: string;  // pre-formatted in the user's currency (e.g. "₹14,546")
}

// Light = Airbnb-style themed roadmap · Street = plain Google roadmap · Satellite
export type MapType = 'light' | 'street' | 'satellite';

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
 * Web-only interactive map using the Google Maps JavaScript API (same key as
 * Places). Renders Airbnb-style price pins via custom OverlayViews, supports
 * pan/zoom + map types, and posts the pin id back to React on tap.
 * Requires the "Maps JavaScript API" enabled on the key in Google Cloud.
 */
export const PropertyMapWeb: React.FC<PropertyMapWebProps> = ({
  pins,
  centerLat,
  centerLng,
  zoom = 4,
  onPinPress,
  focusId,
  isDark = false,
  mapType = 'light',
  userLocation = null,
  pinStyle = 'price',
}) => {
  const iframeRef = useRef<any>(null);

  const cLat = centerLat ?? (pins.length ? pins[0].lat : 39.5);
  const cLng = centerLng ?? (pins.length ? pins[0].lng : -98.35);

  // Google Maps JavaScript API (same key as Places). Requires "Maps JavaScript
  // API" to be enabled on the key in Google Cloud.
  const GOOGLE_KEY = GOOGLE_MAPS_KEY;
  const mapTypeId = mapType === 'satellite' ? 'satellite' : 'roadmap';
  // Light → Airbnb-style theme; Street → plain Google roadmap; Satellite → imagery.
  const MAP_STYLE = mapType === 'light' ? (isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE) : [];

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    * { box-sizing: border-box; }
    html, body, #map { margin: 0; padding: 0; height: 100%; width: 100%; background: ${isDark ? '#0A0F0D' : '#eaeaea'}; }
    html, body { overflow: hidden; border: 0; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    .price-pin {
      background: #fff; color: #0F172A;
      border: 1.5px solid rgba(0,0,0,0.12); border-radius: 20px;
      padding: 4px 9px; font-family: -apple-system, system-ui, sans-serif;
      font-size: 13px; font-weight: 800; box-shadow: 0 2px 6px rgba(0,0,0,0.2);
      white-space: nowrap; cursor: pointer; transform: translate(-50%, -50%);
    }
    .price-pin.active { background: #0F172A; color: #fff; }
    .loc-pin {
      width: 26px; height: 26px; background: #0D9488;
      border: 2.5px solid #fff; border-radius: 50% 50% 50% 0;
      transform: translate(-50%, -100%) rotate(-45deg);
      box-shadow: 0 3px 8px rgba(0,0,0,0.35);
    }
    .user-dot {
      width: 16px; height: 16px; border-radius: 50%;
      background: #2563EB; border: 3px solid #fff;
      box-shadow: 0 0 0 4px rgba(37,99,235,0.25); transform: translate(-50%, -50%);
    }
    .map-msg { padding: 16px; font-family: system-ui, sans-serif; color: #888; font-size: 13px; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    var pins = ${JSON.stringify(pins)};
    var pinStyle = '${pinStyle}';
    var userLoc = ${userLocation ? JSON.stringify(userLocation) : 'null'};
    var mapStyle = ${JSON.stringify(MAP_STYLE)};
    var overlays = {};

    function initMap() {
      var map = new google.maps.Map(document.getElementById('map'), {
        center: { lat: ${cLat}, lng: ${cLng} }, zoom: ${zoom},
        mapTypeId: '${mapTypeId}', disableDefaultUI: true, zoomControl: true,
        gestureHandling: 'greedy', clickableIcons: false, keyboardShortcuts: false,
        styles: (mapStyle && mapStyle.length) ? mapStyle : undefined,
      });

      function HtmlMarker(pos, html, id) { this.pos = pos; this.html = html; this.id = id; this.div = null; this.setMap(map); }
      HtmlMarker.prototype = new google.maps.OverlayView();
      HtmlMarker.prototype.onAdd = function () {
        var d = document.createElement('div'); d.style.position = 'absolute'; d.innerHTML = this.html;
        var self = this;
        d.addEventListener('click', function () {
          Object.keys(overlays).forEach(function (k) { var o = overlays[k]; if (o.div && o.div.firstChild) o.div.firstChild.classList.remove('active'); });
          if (d.firstChild) d.firstChild.classList.add('active');
          parent.postMessage(JSON.stringify({ type: 'pinPress', id: self.id }), '*');
        });
        this.div = d; this.getPanes().overlayMouseTarget.appendChild(d);
      };
      HtmlMarker.prototype.draw = function () {
        var pt = this.getProjection().fromLatLngToDivPixel(new google.maps.LatLng(this.pos.lat, this.pos.lng));
        if (this.div && pt) { this.div.style.left = pt.x + 'px'; this.div.style.top = pt.y + 'px'; }
      };
      HtmlMarker.prototype.onRemove = function () { if (this.div) { this.div.remove(); this.div = null; } };

      pins.forEach(function (p) {
        var h = pinStyle === 'location'
          ? '<div class="loc-pin" data-id="' + p.id + '"></div>'
          : '<div class="price-pin" data-id="' + p.id + '">' + (p.priceLabel || ('$' + p.price)) + '</div>';
        overlays[p.id] = new HtmlMarker({ lat: p.lat, lng: p.lng }, h, p.id);
      });
      if (userLoc) new HtmlMarker(userLoc, '<div class="user-dot"></div>', '__user');

      if (pins.length > 1) {
        var b = new google.maps.LatLngBounds();
        pins.forEach(function (p) { b.extend({ lat: p.lat, lng: p.lng }); });
        map.fitBounds(b, 60);
      }

      window.addEventListener('message', function (e) {
        try {
          var d = typeof e.data === 'string' ? JSON.parse(e.data) : e.data;
          if (d && d.type === 'focus' && overlays[d.id]) {
            var p = overlays[d.id].pos; map.panTo({ lat: p.lat - 0.01, lng: p.lng });
            if (map.getZoom() < 12) map.setZoom(12);
            Object.keys(overlays).forEach(function (k) { var o = overlays[k]; if (o.div && o.div.firstChild) o.div.firstChild.classList.remove('active'); });
            var el = overlays[d.id].div; if (el && el.firstChild) el.firstChild.classList.add('active');
          }
          if (d && d.type === 'recenter' && typeof d.lat === 'number') {
            if (!window.__userMk) window.__userMk = new HtmlMarker({ lat: d.lat, lng: d.lng }, '<div class="user-dot"></div>', '__u2');
            map.panTo({ lat: d.lat, lng: d.lng }); if (map.getZoom() < 13) map.setZoom(13);
          }
        } catch (err) {}
      });
    }
    window.initMap = initMap;
    window.gm_authFailure = function () {
      document.getElementById('map').innerHTML = '<div class="map-msg">Map unavailable — enable the “Maps JavaScript API” for this key in Google Cloud.</div>';
    };
  </script>
  <script async src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=initMap&v=weekly"></script>
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
