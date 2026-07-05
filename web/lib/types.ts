// Mirrors the backend `listingOut` shape (backend/src/utils/helpers.js).
export interface Listing {
  id: string;
  hostId: string;
  hostName: string;
  title: string;
  type: string;
  placeType: string;
  description: string;
  address: string;
  city: string;
  state: string;
  country: string;
  zipcode: string;
  lat: number;
  lng: number;
  guests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  priceUSD: number;
  weekendPriceUSD?: number;
  cleaningFeeUSD?: number;
  currency?: string;
  images: string[];
  videos: string[];
  amenities: string[];
  vibes: string[];
  highlights: string[];
  instantBook: boolean;
  status: string;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  houseRules?: string;
  petsAllowed?: boolean;
  cancellation?: string;
  checkIn?: string;
  checkOut?: string;
  minNights?: number;
  safety?: string[];
  baseGuests?: number;
  extraGuestPct?: number;
  hostLanguages?: string[];
  reviews?: Review[];
}

// Mirrors backend `reviewOut()` (backend/src/utils/helpers.js). Only attached
// on GET /listings/:id, never on /search results.
export interface Review {
  id: string;
  listingId: string;
  authorName: string;
  rating: number;
  text: string;
  response?: string;
  createdAt: string;
}

export interface SearchResponse {
  results: Listing[];
  total: number;
}

export interface SearchParams {
  q?: string;
  city?: string;
  guests?: string;
  checkIn?: string;
  checkOut?: string;
  minPrice?: string;
  maxPrice?: string;
}
