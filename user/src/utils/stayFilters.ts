// Apply a PremiumFilterSheet selection to a list of stays. Shared by Explore
// and Home so the two screens filter identically. Options the data can't
// express (accessibility, host language) are treated as no-ops.

const parseRooms = (v: string): number => (v === '8+' ? 8 : parseInt(v, 10) || 0);

export function applyStayFilters<T extends Record<string, any>>(list: T[], f: any): T[] {
  if (!f) return list;
  return list.filter((p) => {
    // Price range
    if (typeof f.minPrice === 'number' && p.price < f.minPrice) return false;
    if (typeof f.maxPrice === 'number' && p.price > f.maxPrice) return false;
    // Place type (entire home vs room)
    if (f.placeType === 'Entire home' && p.entire === false) return false;
    if (f.placeType === 'Room' && p.entire === true) return false;
    // Bedrooms / beds / bathrooms (treat as "at least")
    if (f.bedrooms && f.bedrooms !== 'Any' && (p.beds ?? p.bedrooms ?? 0) < parseRooms(f.bedrooms)) return false;
    if (f.beds && f.beds !== 'Any' && (p.beds ?? 0) < parseRooms(f.beds)) return false;
    if (f.bathrooms && f.bathrooms !== 'Any' && (p.bathrooms ?? p.baths ?? 0) < parseRooms(f.bathrooms)) return false;
    // Property types (any of the selected)
    if (Array.isArray(f.propertyTypes) && f.propertyTypes.length && !f.propertyTypes.includes(p.type)) return false;
    // Amenities (must have all selected)
    if (Array.isArray(f.amenities) && f.amenities.length) {
      const have = new Set(p.amenities ?? []);
      if (!f.amenities.every((a: string) => have.has(a))) return false;
    }
    // Recommended chips
    if (Array.isArray(f.recommended) && f.recommended.length) {
      if (f.recommended.includes('guest_fav') && !(p.isGuestFavourite || p.isGuestFavorite)) return false;
      if (f.recommended.includes('free_cancel') && !p.hasFreeCancel) return false;
      if (f.recommended.includes('instant') && !p.instantBook) return false;
      if (f.recommended.includes('superhost') && !p.superhost) return false;
    }
    // Booking options
    if (Array.isArray(f.booking) && f.booking.length) {
      if (f.booking.includes('instant_book') && !p.instantBook) return false;
      if (f.booking.includes('self_checkin') && !p.selfCheckin) return false;
      if (f.booking.includes('allows_pets') && !p.allowsPets) return false;
    }
    return true;
  });
}

/** True when a filter selection differs from "no filtering" (price untouched, no chips). */
export function isFilterActive(f: any): boolean {
  if (!f) return false;
  return (
    (typeof f.minPrice === 'number' && f.minPrice > 10) ||
    (typeof f.maxPrice === 'number' && f.maxPrice < 1000) ||
    (f.placeType && f.placeType !== 'Any type') ||
    (f.bedrooms && f.bedrooms !== 'Any') ||
    (f.beds && f.beds !== 'Any') ||
    (f.bathrooms && f.bathrooms !== 'Any') ||
    (Array.isArray(f.propertyTypes) && f.propertyTypes.length > 0) ||
    (Array.isArray(f.amenities) && f.amenities.length > 0) ||
    (Array.isArray(f.recommended) && f.recommended.length > 0) ||
    (Array.isArray(f.booking) && f.booking.length > 0)
  );
}
