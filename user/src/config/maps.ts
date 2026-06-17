// ── Single source of truth for the Google Maps API key ──────────────────────
// Set EXPO_PUBLIC_GOOGLE_MAPS_KEY in user/.env to override (recommended).
// Falls back to the project key so the app still runs if no env is set.
//
//   user/.env →  EXPO_PUBLIC_GOOGLE_MAPS_KEY=AIza....your-billed-key
//
// This covers the web/JS map code (Maps JavaScript, Embed, Geocoding, Places).
// Native builds (iOS/Android react-native-maps) read the key from app.json —
// keep that value in sync when you rotate the key.
export const GOOGLE_MAPS_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || 'AIzaSyD-xBIuVKRb8K1AI0EjP8mq-vTQkwHyqKA';
