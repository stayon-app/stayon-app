const express = require('express');
const router = express.Router();
const { authUser } = require('../auth');
const {
  sb,
  insertRow,
  updateByMatch,
  rows,
  one,
  wrap,
  ok,
  err,
  listingOut,
  publicListingOut,
  PROMOS,
  reviewOut,
  effectiveNightly,
  nightlyForGuestsRow,
  distKm,
  TAX_RATE,
  genHostCode,
  softWrite
} = require('../utils/helpers');

const listingIn = (b) => ({
  title: b.title,
  type: b.type,
  place_type: b.placeType,
  description: b.description,
  address: b.address,
  city: b.city,
  state: b.state,
  country: b.country,
  zipcode: b.zipcode,
  lat: b.lat,
  lng: b.lng,
  guests: b.guests,
  bedrooms: b.bedrooms,
  beds: b.beds,
  bathrooms: b.bathrooms,
  price_usd: b.priceUSD,
  weekend_price_usd: b.weekendPriceUSD,
  cleaning_fee_usd: b.cleaningFeeUSD,
  images: b.images || [],
  amenities: b.amenities || [],
  vibes: b.vibes || [],
  highlights: b.highlights || [],
  instant_book: !!b.instantBook,
  extra: {
    houseRules: b.houseRules || null,
    petsAllowed: b.petsAllowed ?? b.houseRules?.pets ?? null,
    cancellation: b.cancellation || null,
    checkIn: b.checkIn || null,
    checkOut: b.checkOut || null,
    minNights: b.minNights || null,
    safety: b.safety || [],
    baseGuests: b.baseGuests || null,
    extraGuestPct: b.extraGuestPct || 0,
    languages: b.hostLanguages || [],
  },
});

router.post('/listings', authUser, wrap(async (req, res) => {
  // One host cannot list the same place twice (across app AND website — one
  // backend, one rule): same city + same title, or same city + same address.
  const norm = (s) => String(s || '').trim().toLowerCase().replace(/\s+/g, ' ');
  const mine = await rows('listings', { host_id: req.auth.sub });
  const dupe = (mine || []).find((m) =>
    norm(m.city) === norm(req.body.city) && (
      norm(m.title) === norm(req.body.title) ||
      (norm(req.body.address) && norm(m.address) === norm(req.body.address))
    ));
  if (dupe) {
    return err(res, 'DUPLICATE', 'You have already listed this place — edit your existing listing instead of creating it again.', 409);
  }

  const status = req.body.publish ? 'published' : 'draft';
  const payload = { ...listingIn(req.body), host_id: req.auth.sub, host_name: req.auth.name, status };
  let l;
  try {
    l = await insertRow('listings', payload);
  } catch (e) {
    if (String(e.message || '').includes('extra')) {
      const { extra, ...rest } = payload;
      l = await insertRow('listings', rest);
    } else throw e;
  }
  // v2: first listing → assign SOH host code + flag is_host (guarded no-op
  // pre-migration; only sets host_code when still null, so never duplicated).
  if (!(mine || []).length) {
    await softWrite(() => sb.from('users').update({ is_host: true }).eq('id', req.auth.sub));
    await softWrite(() => sb.from('users').update({ host_code: genHostCode() }).eq('id', req.auth.sub).is('host_code', null));
  }
  ok(res, { id: l.id, status: l.status });
}));

router.post('/listings/:id/submit', authUser, wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id, host_id: req.auth.sub }, { status: 'pending_review' });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  ok(res, { id: req.params.id, status: 'pending_review' });
}));

router.get('/listings', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('listings', { host_id: req.auth.sub })).map(listingOut) })));

router.get('/listings/:id', wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const reviews = (await rows('reviews', { listing_id: l.id })).filter((r) => !r.removed).map(reviewOut);
  // Public detail — exact address stays private until booked (publicListingOut).
  ok(res, { ...publicListingOut(l), reviews });
}));

// Public availability — DATES ONLY (no guest identities, no addresses), so
// calendars can grey out reserved days on every client.
router.get('/listings/:id/availability', wrap(async (req, res) => {
  const { data: bks } = await sb.from('bookings')
    .select('check_in,check_out,status').eq('listing_id', req.params.id).neq('status', 'cancelled');
  const { data: cal } = await sb.from('calendar')
    .select('day').eq('listing_id', req.params.id).eq('blocked', true);
  ok(res, {
    booked: (bks || []).map((b) => ({ from: b.check_in, to: b.check_out })),
    blocked: (cal || []).map((c) => c.day),
  });
}));

router.get('/search', wrap(async (req, res) => {
  let q = sb.from('listings').select('*').eq('status', 'published');
  const rawTerm = String(req.query.q || req.query.city || '');
  if (rawTerm.trim()) {
    const tokens = rawTerm
      .split(',')
      .map((t) => t.replace(/[%,()]/g, '').trim())
      .filter((t) => t.length >= 2)
      .slice(0, 3);
    if (tokens.length) {
      const fields = ['city', 'state', 'country', 'address', 'title', 'zipcode'];
      const tok = tokens[0];
      q = q.or(fields.map((f) => `${f}.ilike.%${tok}%`).join(','));
    }
  }
  if (req.query.guests) q = q.gte('guests', Number(req.query.guests));
  if (req.query.maxPrice) q = q.lte('price_usd', Number(req.query.maxPrice));
  if (req.query.minPrice) q = q.gte('price_usd', Number(req.query.minPrice));
  if (req.query.type) q = q.ilike('type', `%${req.query.type}%`);
  if (req.query.instant === 'true') q = q.eq('instant_book', true);
  const { data, error } = await q;
  if (error) throw error;
  // Public search — exact address stays private until booked.
  let items = (data || []).map(publicListingOut);

  if (req.query.amenities) {
    const want = String(req.query.amenities).split(',').map((a) => a.trim()).filter(Boolean);
    if (want.length) items = items.filter((l) => want.every((a) => (l.amenities || []).includes(a)));
  }
  if (Number(req.query.pets) > 0 || req.query.pets === 'true') {
    items = items.filter((l) => l.petsAllowed === true);
  }
  if (req.query.languages) {
    const want = String(req.query.languages).split(',').map((s) => s.trim()).filter(Boolean);
    if (want.length) items = items.filter((l) => want.every((lang) => (l.hostLanguages || []).includes(lang)));
  }
  if (req.query.guests) {
    const g = Number(req.query.guests);
    items = items.map((l) => ({ ...l, basePriceUSD: l.priceUSD, priceUSD: effectiveNightly(l, g) }));
  }

  const ci = req.query.checkIn, co = req.query.checkOut;
  if (ci && co) {
    const ids = items.map((l) => l.id);
    if (ids.length) {
      const { data: bks } = await sb.from('bookings').select('listing_id,check_in,check_out,status').in('listing_id', ids);
      const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2;
      const booked = new Set((bks || [])
        .filter((b) => b.status !== 'cancelled' && b.check_in && b.check_out && overlaps(b.check_in, b.check_out, ci, co))
        .map((b) => b.listing_id));
      const { data: cal } = await sb.from('calendar').select('listing_id,day,blocked').in('listing_id', ids).gte('day', ci).lt('day', co).eq('blocked', true);
      (cal || []).forEach((c) => booked.add(c.listing_id));
      items = items.filter((l) => !booked.has(l.id));
    }
  }
  const lat = parseFloat(req.query.lat), lng = parseFloat(req.query.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    const radius = Number(req.query.radius) || 50;
    items = items
      .filter((l) => l.lat != null && l.lng != null)
      .map((l) => ({ ...l, distanceKm: Math.round(distKm(lat, lng, l.lat, l.lng) * 10) / 10 }))
      .filter((l) => l.distanceKm <= radius)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }
  ok(res, { results: items, total: items.length });
}));

router.put('/listings/:id', authUser, wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  if (l.host_id !== req.auth.sub) return err(res, 'FORBIDDEN', 'not your listing', 403);
  const patch = listingIn(req.body);
  const sent = (k) => Object.prototype.hasOwnProperty.call(req.body, k);
  if (!sent('amenities')) delete patch.amenities;
  if (!sent('vibes')) delete patch.vibes;
  if (!sent('highlights')) delete patch.highlights;
  if (!sent('images')) delete patch.images;
  const newExtra = {};
  for (const [k, v] of Object.entries(patch.extra || {})) {
    if (v !== null && v !== undefined && !(Array.isArray(v) && v.length === 0)) newExtra[k] = v;
  }
  patch.extra = { ...(l.extra || {}), ...newExtra };
  if (req.body.publish !== undefined) patch.status = req.body.publish ? 'published' : (l.status || 'draft');
  const { error } = await sb.from('listings').update(patch).eq('id', req.params.id);
  if (error && /extra/.test(error.message || '')) {
    const { extra, ...rest } = patch;
    const { error: e2 } = await sb.from('listings').update(rest).eq('id', req.params.id);
    if (e2) throw e2;
  } else if (error) throw error;
  ok(res, { id: req.params.id, status: patch.status || l.status });
}));

router.get('/listings/:id/quote', wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const nights = Math.max(1, Math.round((new Date(req.query.checkOut) - new Date(req.query.checkIn)) / 86400000) || 1);
  const guests = Number(req.query.guests) || (l.extra?.baseGuests || 1);
  const nightly = nightlyForGuestsRow(l, guests);
  const subtotal = nightly * nights, cleaning = l.cleaning_fee_usd || 0;

  // Promo code (e.g. STAYON10) — quote shows the discount; the booking route
  // enforces the first-booking rule for real (quotes can be unauthenticated).
  let promo = null, discount = 0;
  if (req.query.promo) {
    const p = PROMOS[String(req.query.promo).trim().toUpperCase()];
    if (!p) promo = { code: String(req.query.promo).trim().toUpperCase(), valid: false, reason: 'Unknown code' };
    else {
      discount = Math.round(subtotal * (p.pct / 100));
      promo = { code: p.code, valid: true, pct: p.pct, label: p.label, discountUSD: discount, note: p.firstOnly ? 'Valid on your first booking' : undefined };
    }
  }
  const sub = subtotal - discount;
  const taxes = Math.round((sub + cleaning) * TAX_RATE);
  ok(res, {
    nights, nightlyUSD: nightly, baseNightlyUSD: l.price_usd || 0,
    subtotalUSD: sub, discountUSD: discount, promo,
    cleaningUSD: cleaning, taxesUSD: taxes, platformFeeUSD: 0,
    totalUSD: sub + cleaning + taxes,
  });
}));

module.exports = router;
