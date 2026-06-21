// A Google map with a single DRAGGABLE pin, for the host to confirm/fine-tune a
// listing's exact location. Web → Google Maps JS API (draggable marker); native
// → react-native-maps with PROVIDER_GOOGLE. Calls onChange(lat,lng) on move.

import React, { useEffect, useMemo, useRef } from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { LIGHT_MAP_STYLE, DARK_MAP_STYLE } from '../utils/mapStyle';
import { GOOGLE_MAPS_KEY } from '../config/maps';

const GOOGLE_KEY = GOOGLE_MAPS_KEY;

let MapView: any = null;
let Marker: any = null;
let PROVIDER_GOOGLE: any = null;
if (Platform.OS !== 'web') {
  try {
    const maps = require('react-native-maps');
    MapView = maps.default;
    Marker = maps.Marker;
    PROVIDER_GOOGLE = maps.PROVIDER_GOOGLE;
  } catch {}
}

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  isDark?: boolean;
  height?: number;
}

export const LocationPickerMap: React.FC<Props> = ({ lat, lng, onChange, isDark = false, height = 200 }) => {
  const iframeRef = useRef<any>(null);
  // latest coords, read by the 'ready' handler without re-subscribing
  const coordRef = useRef({ lat, lng });
  coordRef.current = { lat, lng };

  // ----- Web: Google Maps JS API with a draggable marker -----
  // Build the HTML once; external lat/lng changes are pushed via postMessage so
  // the iframe never reloads mid-drag.
  const html = useMemo(() => `<!DOCTYPE html><html><head>
  <meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>html,body,#map{margin:0;padding:0;height:100%;width:100%}#map{position:absolute;inset:0}
  .hint{position:absolute;bottom:8px;left:50%;transform:translateX(-50%);background:rgba(0,0,0,0.65);color:#fff;font:600 11px system-ui;padding:5px 10px;border-radius:14px;z-index:5;white-space:nowrap}</style>
  </head><body><div id="map"></div><div class="hint">Drag the pin to set the exact spot</div>
  <script>
    var mapStyle = ${JSON.stringify(isDark ? DARK_MAP_STYLE : LIGHT_MAP_STYLE)};
    function initMap(){
      var map = new google.maps.Map(document.getElementById('map'), {
        center:{lat:${lat || 20}, lng:${lng || 78}}, zoom:${lat ? 15 : 4},
        disableDefaultUI:true, zoomControl:true, gestureHandling:'greedy', clickableIcons:false, keyboardShortcuts:false,
        styles: mapStyle,
      });
      var marker = new google.maps.Marker({ position:{lat:${lat || 20}, lng:${lng || 78}}, map:map, draggable:true });
      function emit(p){ parent.postMessage(JSON.stringify({type:'move', lat:p.lat(), lng:p.lng()}), '*'); }
      marker.addListener('dragend', function(e){ emit(e.latLng); });
      map.addListener('click', function(e){ marker.setPosition(e.latLng); emit(e.latLng); });
      window.addEventListener('message', function(e){
        try { var d = typeof e.data==='string'?JSON.parse(e.data):e.data;
          if (d && d.type==='set' && typeof d.lat==='number'){ var pos={lat:d.lat,lng:d.lng}; marker.setPosition(pos); map.panTo(pos); if(map.getZoom()<14)map.setZoom(15); }
        } catch(err){}
      });
      // tell the parent the map is ready so it can push the current center
      parent.postMessage(JSON.stringify({ type: 'ready' }), '*');
    }
    window.initMap = initMap;
    window.gm_authFailure = function(){ document.getElementById('map').innerHTML='<div style="padding:14px;font:13px system-ui;color:#888">Map unavailable — enable the Maps JavaScript API for this key.</div>'; };
  </script>
  <script async src="https://maps.googleapis.com/maps/api/js?key=${GOOGLE_KEY}&callback=initMap&v=weekly"></script>
  </body></html>`, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Web: listen for marker moves
  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const win: any = (globalThis as any).window;
    if (!win) return;
    const handler = (event: any) => {
      try {
        const d = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        if (d?.type === 'move' && typeof d.lat === 'number') onChange(d.lat, d.lng);
        // map finished loading → push the current center so it points there
        if (d?.type === 'ready') {
          const cw = iframeRef.current?.contentWindow;
          const c = coordRef.current;
          if (cw && c.lat) cw.postMessage(JSON.stringify({ type: 'set', lat: c.lat, lng: c.lng }), '*');
        }
      } catch {}
    };
    win.addEventListener('message', handler);
    return () => win.removeEventListener('message', handler);
  }, [onChange]);

  // Web: push external lat/lng changes (e.g. address picked) into the iframe
  useEffect(() => {
    if (Platform.OS !== 'web' || !lat) return;
    const cw = iframeRef.current?.contentWindow;
    if (cw) {
      const t = setTimeout(() => cw.postMessage(JSON.stringify({ type: 'set', lat, lng }), '*'), 60);
      return () => clearTimeout(t);
    }
  }, [lat, lng]);

  if (Platform.OS === 'web') {
    return (
      <View style={[styles.container, { height }]}>
        {/* @ts-ignore iframe under react-native-web */}
        <iframe ref={iframeRef} srcDoc={html} title="Pick location" scrolling="no"
          style={{ border: 0, width: '100%', height: '100%', display: 'block' }} />
      </View>
    );
  }

  // ----- Native: react-native-maps with a draggable marker -----
  if (!MapView) return <View style={[styles.container, { height }]} />;
  return (
    <View style={[styles.container, { height }]}>
      <MapView
        provider={PROVIDER_GOOGLE}
        style={{ flex: 1 }}
        region={{ latitude: lat || 20, longitude: lng || 78, latitudeDelta: lat ? 0.01 : 40, longitudeDelta: lat ? 0.01 : 40 }}
        onPress={(e: any) => onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
      >
        {!!lat && (
          <Marker
            draggable
            coordinate={{ latitude: lat, longitude: lng }}
            onDragEnd={(e: any) => onChange(e.nativeEvent.coordinate.latitude, e.nativeEvent.coordinate.longitude)}
          />
        )}
      </MapView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { width: '100%', borderRadius: 14, overflow: 'hidden', backgroundColor: '#e8e8e8' },
});

export default LocationPickerMap;
