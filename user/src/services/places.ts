// Google Places (New) integration — powers worldwide destination search:
// every country, state, city, neighborhood, and landmark.
//
// Uses the new Places API (places.googleapis.com), which supports CORS so it
// works on web, iOS, and Android. The key below is the same one shipped in
// app.json for Maps; in Google Cloud Console make sure "Places API (New)" is
// enabled for it and restrict the key to your app's bundle IDs / referrers.
//
// All functions fail soft: on any network/quota error they resolve to an empty
// result so the UI can fall back to the local DESTINATIONS index.

import { GOOGLE_MAPS_KEY } from '../config/maps';

const GOOGLE_PLACES_KEY = GOOGLE_MAPS_KEY;

const AUTOCOMPLETE_URL = 'https://places.googleapis.com/v1/places:autocomplete';
const DETAILS_URL = 'https://places.googleapis.com/v1/places';
const GEOCODE_URL = 'https://maps.googleapis.com/maps/api/geocode/json';

export interface PlaceSuggestion {
  placeId: string;
  title: string; // main text, e.g. "Times Square"
  subtitle: string; // secondary text, e.g. "New York, NY, USA"
  full: string; // full text
}

export interface PlaceDetail {
  name: string;
  lat: number;
  lng: number;
  delta: number;
  // Structured address parts (best-effort, parsed from Google address components).
  formattedAddress?: string;
  street?: string;     // house number + route
  area?: string;       // sublocality / neighborhood
  city?: string;       // locality / town
  state?: string;      // administrative_area_level_1
  country?: string;
  zipcode?: string;
}

// Pull the first matching address component for a given Google type.
function comp(components: any[], type: string, short = false): string {
  const c = components.find((x) => Array.isArray(x?.types) && x.types.includes(type));
  return c ? String((short ? c.shortText : c.longText) ?? c.longText ?? '') : '';
}

// A lightweight session token improves Places billing/relevance. Regenerated
// each time the search field is cleared (see ModernSearchModal).
export function newSessionToken(): string {
  return `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;
}

/**
 * Autocomplete a free-text query into place predictions worldwide.
 * Returns [] on any error so callers can fall back to the local index.
 */
export async function searchPlaces(
  input: string,
  opts: { signal?: AbortSignal; sessionToken?: string } = {}
): Promise<PlaceSuggestion[]> {
  const query = input.trim();
  if (query.length < 2) return [];
  try {
    const res = await fetch(AUTOCOMPLETE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
      },
      body: JSON.stringify({
        input: query,
        ...(opts.sessionToken ? { sessionToken: opts.sessionToken } : {}),
      }),
      signal: opts.signal,
    });
    if (!res.ok) return [];
    const json: any = await res.json();
    const suggestions: any[] = Array.isArray(json?.suggestions) ? json.suggestions : [];
    return suggestions
      .map((s) => s?.placePrediction)
      .filter(Boolean)
      .map((p: any) => ({
        placeId: String(p.placeId ?? ''),
        title: String(p.structuredFormat?.mainText?.text ?? p.text?.text ?? ''),
        subtitle: String(p.structuredFormat?.secondaryText?.text ?? ''),
        full: String(p.text?.text ?? ''),
      }))
      .filter((p: PlaceSuggestion) => p.placeId && p.title);
  } catch {
    // aborted, offline, or quota — let the caller use local results
    return [];
  }
}

/**
 * Resolve a placeId to a name + coordinates (and a sensible map zoom).
 * Returns null on any error.
 */
export async function getPlaceDetails(
  placeId: string,
  opts: { sessionToken?: string } = {}
): Promise<PlaceDetail | null> {
  if (!placeId) return null;
  try {
    const url = `${DETAILS_URL}/${encodeURIComponent(placeId)}`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        'X-Goog-Api-Key': GOOGLE_PLACES_KEY,
        'X-Goog-FieldMask': 'location,displayName,formattedAddress,viewport,addressComponents',
        ...(opts.sessionToken ? { 'X-Goog-Session-Token': opts.sessionToken } : {}),
      },
    });
    if (!res.ok) return null;
    const json: any = await res.json();
    const lat = json?.location?.latitude;
    const lng = json?.location?.longitude;
    if (typeof lat !== 'number' || typeof lng !== 'number') return null;

    // Derive a zoom delta from the viewport when available, else default.
    let delta = 0.18;
    const vp = json?.viewport;
    if (vp?.low && vp?.high) {
      const latSpan = Math.abs((vp.high.latitude ?? lat) - (vp.low.latitude ?? lat));
      const lngSpan = Math.abs((vp.high.longitude ?? lng) - (vp.low.longitude ?? lng));
      delta = Math.min(8, Math.max(0.05, Math.max(latSpan, lngSpan) * 1.4));
    }

    const ac: any[] = Array.isArray(json?.addressComponents) ? json.addressComponents : [];
    const streetNo = comp(ac, 'street_number');
    const route = comp(ac, 'route');
    const street = [streetNo, route].filter(Boolean).join(' ');
    const area = comp(ac, 'sublocality') || comp(ac, 'sublocality_level_1') || comp(ac, 'neighborhood');
    const city = comp(ac, 'locality') || comp(ac, 'postal_town') || comp(ac, 'administrative_area_level_2');
    const state = comp(ac, 'administrative_area_level_1');
    const country = comp(ac, 'country');
    const zipcode = comp(ac, 'postal_code');

    return {
      name: String(json?.displayName?.text ?? json?.formattedAddress ?? ''),
      lat,
      lng,
      delta,
      formattedAddress: String(json?.formattedAddress ?? ''),
      street: street || undefined,
      area: area || undefined,
      city: city || undefined,
      state: state || undefined,
      country: country || undefined,
      zipcode: zipcode || undefined,
    };
  } catch {
    return null;
  }
}

// Geocoding API uses snake_case address_components / long_name.
function gComp(components: any[], type: string): string {
  const c = components.find((x) => Array.isArray(x?.types) && x.types.includes(type));
  return c ? String(c.long_name ?? '') : '';
}

// Parse a Geocoding API result row → structured address.
function parseGeocode(r: any): Partial<PlaceDetail> | null {
  if (!r) return null;
  const loc = r.geometry?.location;
  const ac: any[] = r.address_components || [];
  const street = [gComp(ac, 'street_number'), gComp(ac, 'route')].filter(Boolean).join(' ');
  return {
    lat: loc?.lat, lng: loc?.lng, formattedAddress: String(r.formatted_address ?? ''),
    street: street || undefined,
    area: gComp(ac, 'sublocality') || gComp(ac, 'sublocality_level_1') || gComp(ac, 'neighborhood') || undefined,
    city: gComp(ac, 'locality') || gComp(ac, 'postal_town') || gComp(ac, 'administrative_area_level_2') || undefined,
    state: gComp(ac, 'administrative_area_level_1') || undefined,
    country: gComp(ac, 'country') || undefined,
    zipcode: gComp(ac, 'postal_code') || undefined,
  };
}

/** Forward-geocode an address string → lat/lng + parts. Reliable fallback when
 * Place Details doesn't return a location. Needs the "Geocoding API" on the key. */
export async function geocodeAddress(address: string): Promise<Partial<PlaceDetail> | null> {
  if (!address?.trim()) return null;
  try {
    const res = await fetch(`${GEOCODE_URL}?address=${encodeURIComponent(address)}&key=${GOOGLE_PLACES_KEY}`);
    if (!res.ok) return null;
    const json: any = await res.json();
    return parseGeocode(json?.results?.[0]);
  } catch {
    return null;
  }
}

/** Reverse-geocode a lat/lng → structured address (host drags the map pin).
 * Needs the "Geocoding API" enabled on the key. Fail-soft → null. */
export async function reverseGeocode(lat: number, lng: number): Promise<Partial<PlaceDetail> | null> {
  try {
    const res = await fetch(`${GEOCODE_URL}?latlng=${lat},${lng}&key=${GOOGLE_PLACES_KEY}`);
    if (!res.ok) return null;
    const json: any = await res.json();
    const r = json?.results?.[0];
    if (!r) return null;
    const ac: any[] = r.address_components || [];
    const street = [gComp(ac, 'street_number'), gComp(ac, 'route')].filter(Boolean).join(' ');
    const area = gComp(ac, 'sublocality') || gComp(ac, 'sublocality_level_1') || gComp(ac, 'neighborhood');
    const city = gComp(ac, 'locality') || gComp(ac, 'postal_town') || gComp(ac, 'administrative_area_level_2');
    return {
      lat, lng, formattedAddress: String(r.formatted_address ?? ''),
      street: street || undefined, area: area || undefined, city: city || undefined,
      state: gComp(ac, 'administrative_area_level_1') || undefined,
      country: gComp(ac, 'country') || undefined,
      zipcode: gComp(ac, 'postal_code') || undefined,
    };
  } catch {
    return null;
  }
}
