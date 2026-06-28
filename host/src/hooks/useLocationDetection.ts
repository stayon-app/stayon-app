import { useState, useEffect, useCallback } from 'react';
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

// Sensible default (USA) used while detecting or if permission denied
const DEFAULT_LOCATION: DetectedLocation = {
  city: 'New York',
  region: 'NY',
  country: 'USA',
  latitude: 40.7128,
  longitude: -74.006,
  formattedAddress: 'New York, NY, USA',
};

export function useLocationDetection() {
  const [location, setLocation] = useState<DetectedLocation>(DEFAULT_LOCATION);
  const [loading, setLoading] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const detect = useCallback(async () => {
    setLoading(true);
    try {
      // Web: expo-location uses the browser geolocation API
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = pos.coords;

      // Reverse geocode to a human-readable place
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

      setLocation({
        city: city || 'Your area',
        region,
        country,
        latitude,
        longitude,
        formattedAddress: [city, region, country].filter(Boolean).join(', ') || 'Current location',
      });
    } catch (e) {
      // GPS unavailable — keep default
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
