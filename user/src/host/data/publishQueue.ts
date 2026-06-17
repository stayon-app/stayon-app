// Resilient publish — so a host's "Publish" survives a backend outage.
//
// Publishing writes the listing locally (instant) AND to the backend (so guests
// on other devices can find it). If the backend is unreachable at that moment,
// we queue the listing here and replay it later (on next app open / when back
// online) instead of silently dropping it.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Api } from '../../api';
import { listingUSD, saveListing, type HostListing } from './listings';
import { getHostProfile } from './hostProfile';

const QUEUE_KEY = '@stayon_publish_queue';

type Queued = { listing: HostListing; payload: any; queuedAt: number };

// Backend create payload — single source of truth, shared by the wizard and the
// replay flush so they always send identical data.
export function buildCreatePayload(d: HostListing, hostLanguages: string[] = []) {
  return {
    hostLanguages,
    title: (d.title || '').trim(), type: d.type, placeType: d.placeType,
    address: (d.address || '').trim(), city: (d.city || '').trim(), state: d.state,
    country: (d.country || '').trim(), zipcode: d.zipcode,
    lat: d.latitude, lng: d.longitude,
    guests: d.guests, bedrooms: d.bedrooms, beds: d.beds, bathrooms: d.bathrooms,
    priceUSD: Math.round(listingUSD(d.price, d.priceCurrency)),
    weekendPriceUSD: d.weekendPrice ? Math.round(listingUSD(d.weekendPrice, d.priceCurrency)) : undefined,
    cleaningFeeUSD: Math.round(listingUSD(d.cleaningFee, d.priceCurrency)),
    baseGuests: d.baseGuests || 1,
    extraGuestPct: d.extraGuestPct || 0,
    images: (d.images || []).map((uri) => ({ url: uri, room: d.photoMeta?.[uri]?.room, caption: d.photoMeta?.[uri]?.caption })),
    amenities: d.amenities, vibes: d.vibes, highlights: d.highlights,
    instantBook: d.bookingApproval === 'instant',
    houseRules: d.houseRules, petsAllowed: d.houseRules?.pets,
    cancellation: d.cancellationPolicy, checkIn: d.checkInTime, checkOut: d.checkOutTime,
    minNights: d.minNights, safety: d.safety,
    publish: true,
  };
}

async function readQueue(): Promise<Queued[]> {
  try { const raw = await AsyncStorage.getItem(QUEUE_KEY); const p = raw ? JSON.parse(raw) : []; return Array.isArray(p) ? p : []; }
  catch { return []; }
}
async function writeQueue(q: Queued[]) { try { await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch {} }

/**
 * Publish a listing to the backend now. On success the local copy is stamped
 * with its remoteId. On failure it's queued for later replay.
 * Returns { synced } — false means "saved locally + queued, will sync later".
 */
export async function publishToBackend(d: HostListing): Promise<{ synced: boolean; remoteId?: string }> {
  let payload: any;
  try { const prof = await getHostProfile(); payload = buildCreatePayload(d, prof.languages || []); }
  catch { payload = buildCreatePayload(d, []); }

  try {
    await Api.auth.ensureSession();
    const created = await Api.listings.create(payload);
    if (created?.id) { await saveListing({ ...d, status: 'published', remoteId: created.id }); return { synced: true, remoteId: created.id }; }
    return { synced: true };
  } catch {
    const q = await readQueue();
    const i = q.findIndex((x) => x.listing.id === d.id);
    const item: Queued = { listing: d, payload, queuedAt: Date.now() };
    if (i >= 0) q[i] = item; else q.push(item);
    await writeQueue(q);
    return { synced: false };
  }
}

/** Replay queued publishes. Safe to call often (app start, regained connectivity). */
export async function flushPublishQueue(): Promise<{ synced: number; pending: number }> {
  const q = await readQueue();
  if (!q.length) return { synced: 0, pending: 0 };
  const remaining: Queued[] = [];
  let synced = 0;
  for (const item of q) {
    try {
      await Api.auth.ensureSession();
      const created = await Api.listings.create(item.payload);
      if (created?.id) { await saveListing({ ...item.listing, status: 'published', remoteId: created.id }); synced++; }
      else synced++;
    } catch {
      remaining.push(item); // still offline → keep for next time
    }
  }
  await writeQueue(remaining);
  return { synced, pending: remaining.length };
}

/** How many publishes are waiting to sync (for an optional "syncing…" indicator). */
export async function pendingPublishCount(): Promise<number> {
  return (await readQueue()).length;
}
