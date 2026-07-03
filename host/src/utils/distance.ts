// Geo helpers for "near me" features — turn coordinates into distances/labels.

export interface LatLng {
  latitude: number;
  longitude: number;
}

const toRad = (deg: number) => (deg * Math.PI) / 180;
const EARTH_RADIUS_KM = 6371;

/** Great-circle distance between two coordinates, in kilometres. */
export function haversineKm(a: LatLng, b: LatLng): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Human-friendly distance, e.g. "850 m away", "2.4 km away", "1,240 km away". */
export function formatDistance(km: number): string {
  if (!isFinite(km)) return '';
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)} m away`;
  if (km < 10) return `${km.toFixed(1)} km away`;
  return `${Math.round(km).toLocaleString()} km away`;
}

/**
 * Sort a list of items by distance from `origin`, nearest first.
 * `getCoords` extracts the lat/lng from each item. Returns new items
 * augmented with `distanceKm` + `distanceLabel`.
 */
export function sortByDistance<T>(
  items: T[],
  origin: LatLng,
  getCoords: (item: T) => LatLng,
): Array<T & { distanceKm: number; distanceLabel: string }> {
  return items
    .map((item) => {
      const distanceKm = haversineKm(origin, getCoords(item));
      return { ...item, distanceKm, distanceLabel: formatDistance(distanceKm) };
    })
    .sort((a, b) => a.distanceKm - b.distanceKm);
}
