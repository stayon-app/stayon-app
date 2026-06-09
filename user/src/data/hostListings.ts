// Bridge: turn a host's PUBLISHED listings into guest-catalogue properties so
// they appear in the guest app's Home / Explore / Search alongside the curated
// stays — with a `hostListingId` so the property page can show that host's real
// "Meet your host" profile and Local guidebook.

import { getListings, listingUSD, type HostListing } from '../host/data/listings';
import { Api } from '../api';

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80&auto=format&fit=crop';

// Extract a display URL from a string or { url } / { uri } image entry.
const imgUrl = (x: any): string => (typeof x === 'string' ? x : (x?.url || x?.uri || ''));

// Map a backend (published) listing → guest catalogue property.
function backendToProperty(l: any): HostProperty {
  // keep rich images (may carry { url, room, caption }) so the Photo tour keeps tags
  const imgs = (Array.isArray(l.images) && l.images.length) ? l.images : [FALLBACK_IMG];
  const cover = imgUrl(imgs[0]) || FALLBACK_IMG;
  return {
    id: `be_${l.id}`,
    hostListingId: l.id,
    title: l.title || 'StayOn home',
    location: [l.city, l.country].filter(Boolean).join(', ') || 'StayOn',
    price: Math.max(1, Math.round(l.priceUSD || 0)),
    rating: l.ratingAvg ?? 4.9,
    reviews: l.ratingCount ?? 0,
    images: imgs,
    image: cover,
    type: l.type || 'Entire home',
    guests: l.guests ?? 2,
    bedrooms: l.bedrooms ?? 1,
    beds: l.beds ?? 1,
    bathrooms: l.bathrooms ?? 1,
    latitude: l.lat ?? 0,
    longitude: l.lng ?? 0,
    address: l.address,
    city: l.city,
    country: l.country,
    description: l.description,
    instantBook: !!l.instantBook,
    amenities: l.amenities ?? [],
    vibes: l.vibes ?? [],
    isHostListing: true,
    badge: 'New on StayOn',
  };
}

// Card/detail-friendly shape. `location` is a string for cards; flat lat/lng +
// city/country/address are read by PropertyDetails to build the real map pin.
export interface HostProperty {
  id: string;
  hostListingId: string;
  title: string;
  location: string;
  price: number;            // USD (guest currency formats from this)
  rating: number;
  reviews: number;
  images: any[]; // string[] or rich [{ url, room, caption }] (drives Photo tour)
  image: string;
  type: string;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  country?: string;
  description?: string;
  instantBook: boolean;
  amenities: string[];
  vibes: string[];
  isHostListing: true;
  badge?: string;
}

export function hostListingToProperty(l: HostListing): HostProperty {
  // build rich images from the host's per-photo room tags + captions
  const meta = l.photoMeta || {};
  const imgs = (l.images && l.images.length)
    ? l.images.map((uri) => ({ url: uri, room: meta[uri]?.room, caption: meta[uri]?.caption }))
    : [{ url: FALLBACK_IMG }];
  return {
    id: `host_${l.id}`,
    hostListingId: l.id,
    title: l.title || 'StayOn home',
    location: [l.city, l.country].filter(Boolean).join(', ') || 'StayOn',
    price: Math.max(1, Math.round(listingUSD(l.price, l.priceCurrency))),
    rating: l.rating ?? 4.9,
    reviews: l.reviewCount ?? 0,
    images: imgs as any,
    image: (imgs[0] as any).url,
    type: l.type || 'Entire home',
    guests: l.guests ?? 2,
    bedrooms: l.bedrooms ?? 1,
    beds: l.beds ?? 1,
    bathrooms: l.bathrooms ?? 1,
    latitude: l.latitude ?? 0,
    longitude: l.longitude ?? 0,
    address: l.address,
    city: l.city,
    country: l.country,
    description: l.description,
    instantBook: l.instantBook,
    amenities: l.amenities ?? [],
    vibes: l.vibes ?? [],
    isHostListing: true,
    badge: 'New on StayOn',
  };
}

/** Published host listings as guest properties — local device listings PLUS any
 * approved listings from the backend (so listings published by hosts on other
 * devices show up here too). Fail-safe: if the backend is offline, returns the
 * local listings only. Newest first; de-duped by listing id. */
export async function getHostListingsAsProperties(): Promise<HostProperty[]> {
  const all = await getListings().catch(() => [] as HostListing[]);
  const local = all
    .filter((l) => l.status === 'published')
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
    .map(hostListingToProperty);

  let remote: HostProperty[] = [];
  try {
    const r = await Api.search();
    remote = (r.results || []).map(backendToProperty);
  } catch {
    // backend offline / not running — local only
  }
  const seen = new Set(local.map((p) => p.hostListingId));
  return [...local, ...remote.filter((p) => !seen.has(p.hostListingId))];
}
