import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform } from 'react-native';
import * as Location from 'expo-location';

export interface DetectedLocation {
  city: string;
  region: string;
  country: string;
  latitude: number;
  longitude: number;
  formattedAddress: string;
}

// Country guesses keyed by IANA timezone — used so the home feed is geo-correct
// even before/without GPS permission (which many users never grant).
const TZ_REGION: Record<string, DetectedLocation> = {
  'Asia/Kolkata': { city: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, formattedAddress: 'New Delhi, India' },
  'Asia/Calcutta': { city: 'New Delhi', region: 'Delhi', country: 'India', latitude: 28.6139, longitude: 77.209, formattedAddress: 'New Delhi, India' },
  'Asia/Dubai': { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, formattedAddress: 'Dubai, UAE' },
  'Asia/Muscat': { city: 'Dubai', region: 'Dubai', country: 'United Arab Emirates', latitude: 25.2048, longitude: 55.2708, formattedAddress: 'Dubai, UAE' },
  'Asia/Qatar': { city: 'Doha', region: 'Doha', country: 'Qatar', latitude: 25.2854, longitude: 51.531, formattedAddress: 'Doha, Qatar' },
  'Asia/Tokyo': { city: 'Tokyo', region: 'Tokyo', country: 'Japan', latitude: 35.6762, longitude: 139.6503, formattedAddress: 'Tokyo, Japan' },
  'Asia/Singapore': { city: 'Singapore', region: 'Singapore', country: 'Singapore', latitude: 1.3521, longitude: 103.8198, formattedAddress: 'Singapore' },
  'Asia/Bangkok': { city: 'Bangkok', region: 'Bangkok', country: 'Thailand', latitude: 13.7563, longitude: 100.5018, formattedAddress: 'Bangkok, Thailand' },
  'Europe/London': { city: 'London', region: 'England', country: 'United Kingdom', latitude: 51.5074, longitude: -0.1278, formattedAddress: 'London, United Kingdom' },
  'Europe/Paris': { city: 'Paris', region: 'Île-de-France', country: 'France', latitude: 48.8566, longitude: 2.3522, formattedAddress: 'Paris, France' },
  'Europe/Rome': { city: 'Rome', region: 'Lazio', country: 'Italy', latitude: 41.9028, longitude: 12.4964, formattedAddress: 'Rome, Italy' },
  'Europe/Madrid': { city: 'Madrid', region: 'Madrid', country: 'Spain', latitude: 40.4168, longitude: -3.7038, formattedAddress: 'Madrid, Spain' },
};

const US_DEFAULT: DetectedLocation = {
  city: 'New York', region: 'NY', country: 'USA', latitude: 40.7128, longitude: -74.006, formattedAddress: 'New York, NY, USA',
};

// Best-effort region from the device timezone (no permission needed).
function regionFromTimezone(): DetectedLocation {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    if (TZ_REGION[tz]) return TZ_REGION[tz];
    if (tz.startsWith('America/')) return US_DEFAULT;
    if (tz.startsWith('Europe/')) return TZ_REGION['Europe/Paris'];
  } catch {
    // Intl/timeZone unavailable — fall through
  }
  return US_DEFAULT;
}

// ISO-2 country code → a representative region (for IP-based detection).
const CODE_REGION: Record<string, DetectedLocation> = {
  IN: TZ_REGION['Asia/Kolkata'], AE: TZ_REGION['Asia/Dubai'], QA: TZ_REGION['Asia/Qatar'], JP: TZ_REGION['Asia/Tokyo'],
  SG: TZ_REGION['Asia/Singapore'], TH: TZ_REGION['Asia/Bangkok'], GB: TZ_REGION['Europe/London'], FR: TZ_REGION['Europe/Paris'],
  IT: TZ_REGION['Europe/Rome'], ES: TZ_REGION['Europe/Madrid'], US: US_DEFAULT,
};

const INITIAL_LOCATION = regionFromTimezone();

export function useLocationDetection() {
  const [location, setLocation] = useState<DetectedLocation>(INITIAL_LOCATION);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const gpsLocked = useRef(false);

  // IP-based country (keyless, CORS-ok) — better than timezone when GPS is denied.
  useEffect(() => {
    let alive = true;
    fetch('https://get.geojs.io/v1/ip/country.json')
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const code = d && (d.country as string | undefined)?.toUpperCase();
        if (alive && !gpsLocked.current && code && CODE_REGION[code]) setLocation(CODE_REGION[code]);
      })
      .catch(() => { /* keep timezone guess */ });
    return () => { alive = false; };
  }, []);

  const detect = useCallback(async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        // No GPS — keep the timezone-based region (already geo-correct by country)
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = pos.coords;

      let city = '', region = '', country = '';
      try {
        const places = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (places && places.length > 0) {
          const p = places[0];
          city = p.city || p.subregion || '';
          region = p.region || '';
          country = p.country || '';
        }
      } catch {
        // reverse geocode can fail on web — keep coords
      }

      // Precise GPS wins over the IP guess.
      gpsLocked.current = true;
      // If reverse geocode gave us no country, keep the timezone-based country.
      setLocation({
        city: city || INITIAL_LOCATION.city,
        region: region || INITIAL_LOCATION.region,
        country: country || INITIAL_LOCATION.country,
        latitude,
        longitude,
        formattedAddress: [city, region, country].filter(Boolean).join(', ') || INITIAL_LOCATION.formattedAddress,
      });
    } catch (e) {
      setPermissionDenied(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    detect();
  }, [detect]);

  return { location, loading, permissionDenied, refreshLocation: detect };
}
