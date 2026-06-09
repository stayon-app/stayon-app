// Shared helpers to sync a host listing to the backend: upload local photos to
// Supabase Storage (permanent URLs) and map a HostListing → the backend payload.
// Used by both the create wizard and the edit screen so they stay consistent.

import { Api } from '../../api';
import { listingUSD, type HostListing } from './listings';

async function uriToBase64(uri: string): Promise<string | null> {
  try {
    const r = await fetch(uri);
    const blob = await r.blob();
    return await new Promise((resolve) => {
      const fr = new FileReader();
      fr.onload = () => resolve(String(fr.result).split(',')[1] || null);
      fr.onerror = () => resolve(null);
      fr.readAsDataURL(blob);
    });
  } catch { return null; }
}

// Upload any LOCAL photos (blob:/file:) to Storage; keep already-uploaded https
// URLs as-is. Returns rich [{url, room, caption}] entries for the backend.
export async function uploadListingImages(
  images: any[],
  photoMeta: Record<string, { room?: string; caption?: string }> = {},
): Promise<{ url: string; room?: string; caption?: string }[]> {
  const out: { url: string; room?: string; caption?: string }[] = [];
  for (const img of images || []) {
    const uri = typeof img === 'string' ? img : (img?.url || img?.uri);
    if (!uri) continue;
    const meta = (typeof img === 'object' ? img : photoMeta[uri]) || {};
    if (/^https?:\/\//.test(uri)) { out.push({ url: uri, room: meta.room, caption: meta.caption }); continue; }
    const b64 = await uriToBase64(uri);
    if (b64) {
      try {
        const up = await Api.media.upload(b64, 'image/jpeg');
        if (up?.url) { out.push({ url: up.url, room: meta.room, caption: meta.caption }); continue; }
      } catch { /* fall through to keeping local uri */ }
    }
    out.push({ url: uri, room: meta.room, caption: meta.caption });
  }
  return out;
}

// Map a HostListing → the backend listing payload (create or update).
// `hostLanguages` = the languages the host speaks (for the guest language filter).
export function toBackendListing(d: HostListing, images: { url: string; room?: string; caption?: string }[], hostLanguages: string[] = []) {
  return {
    hostLanguages,
    title: (d.title || '').trim(), type: d.type, placeType: d.placeType, description: d.description,
    address: (d.address || '').trim(), city: (d.city || '').trim(), state: d.state, country: (d.country || '').trim(), zipcode: d.zipcode,
    lat: d.latitude, lng: d.longitude,
    guests: d.guests, bedrooms: d.bedrooms, beds: d.beds, bathrooms: d.bathrooms,
    priceUSD: Math.round(listingUSD(d.price, d.priceCurrency)),
    weekendPriceUSD: d.weekendPrice ? Math.round(listingUSD(d.weekendPrice, d.priceCurrency)) : undefined,
    cleaningFeeUSD: Math.round(listingUSD(d.cleaningFee, d.priceCurrency)),
    baseGuests: d.baseGuests || 1,
    extraGuestPct: d.extraGuestPct || 0,
    images,
    amenities: d.amenities, vibes: d.vibes, highlights: d.highlights,
    instantBook: d.bookingApproval === 'instant',
    houseRules: d.houseRules, petsAllowed: d.houseRules?.pets,
    cancellation: d.cancellationPolicy, checkIn: d.checkInTime, checkOut: d.checkOutTime,
    minNights: d.minNights, safety: d.safety,
  };
}
