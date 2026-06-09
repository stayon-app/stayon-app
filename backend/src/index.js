// StayOn central backend — ONE service for User app + Host app + Ops portal.
// Database-backed by Supabase (Postgres + Storage) → cross-device, persistent.

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { sign, authUser, authStaff } = require('./auth');
const { supabase, configured, BUCKET_LISTINGS } = require('./supabase');
const { verifyIdentity } = require('./kyc');

if (!configured) {
  console.error('FATAL: Supabase not configured. Add SUPABASE_URL + SUPABASE_SERVICE_KEY to backend/.env');
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---- tiny query helpers --------------------------------------------------
const sb = supabase;
async function insertRow(table, obj) {
  const { data, error } = await sb.from(table).insert(obj).select().single();
  if (error) throw error; return data;
}
async function updateByMatch(table, match, patch) {
  const { data, error } = await sb.from(table).update(patch).match(match).select();
  if (error) throw error; return data;
}
async function rows(table, match) {
  let q = sb.from(table).select('*');
  if (match) q = q.match(match);
  const { data, error } = await q;
  if (error) throw error; return data || [];
}
async function one(table, match) {
  const { data, error } = await sb.from(table).select('*').match(match).maybeSingle();
  if (error) throw error; return data;
}

const now = () => new Date().toISOString();
const genCode = () => { const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let c = ''; for (let i = 0; i < 6; i++) c += s[crypto.randomInt(s.length)]; return `STY-${c}`; };
const TAX_RATE = 0.12, PLATFORM_FEE = 0;
const ok = (res, body) => res.json(body);
const err = (res, code, message, status = 400) => res.status(status).json({ error: { code, message } });
const hasContact = (t) => /[\w.+-]+@[\w-]+\.[\w.-]+/.test(t) || /(\+?\d[\s-]?){7,}/.test(t);
// Haversine distance in km (for "stays near a point" search).
function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371, toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(bLat - aLat), dLng = toR(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}
async function notify(userId, type, payload) { try { await insertRow('notifications', { user_id: userId, type, payload }); } catch {} }
async function audit(req, action, target_type, target_id, meta) { try { await insertRow('audit_log', { actor_id: req.auth?.sub, action, target_type, target_id: String(target_id), meta }); } catch {} }
const wrap = (fn) => (req, res) => fn(req, res).catch((e) => err(res, e.code || 'SERVER', e.message || 'error', 500));

// ---- output mappers (snake_case DB → camelCase API the app expects) ------
const listingOut = (r) => r && ({
  id: r.id, hostId: r.host_id, hostName: r.host_name, title: r.title, type: r.type, placeType: r.place_type,
  description: r.description, address: r.address, city: r.city, state: r.state, country: r.country, zipcode: r.zipcode,
  lat: r.lat, lng: r.lng, guests: r.guests, bedrooms: r.bedrooms, beds: r.beds, bathrooms: r.bathrooms,
  priceUSD: r.price_usd, weekendPriceUSD: r.weekend_price_usd, cleaningFeeUSD: r.cleaning_fee_usd, currency: r.currency,
  images: r.images || [], videos: r.videos || [], amenities: r.amenities || [], vibes: r.vibes || [], highlights: r.highlights || [],
  instantBook: r.instant_book, status: r.status, ratingAvg: r.rating_avg, ratingCount: r.rating_count, createdAt: r.created_at,
  houseRules: r.extra?.houseRules, petsAllowed: r.extra?.petsAllowed,
  cancellation: r.extra?.cancellation, checkIn: r.extra?.checkIn, checkOut: r.extra?.checkOut,
  minNights: r.extra?.minNights, safety: r.extra?.safety || [],
  baseGuests: r.extra?.baseGuests || 1, extraGuestPct: r.extra?.extraGuestPct || 0,
  hostLanguages: r.extra?.languages || [],
});

// Extra guests above base, capped at the listing's max capacity.
function extraGuestsCount(baseGuests, maxGuests, guests) {
  const baseG = baseGuests || 1;
  const maxG = maxGuests || baseG;
  return Math.min(Math.max(0, (Number(guests) || 0) - baseG), Math.max(0, maxG - baseG));
}
// Effective nightly = base × (1 + pct% × extra guests). Percentage-based, ranged.
function effectiveNightly(l, guests) {
  const extras = extraGuestsCount(l.baseGuests, l.guests, guests);
  return Math.round((l.priceUSD || 0) * (1 + ((l.extraGuestPct || 0) / 100) * extras));
}
// Same, computed from a raw DB row (price_usd + extra.*) for quote/booking.
function nightlyForGuestsRow(row, guests) {
  const extras = extraGuestsCount(row.extra?.baseGuests, row.guests, guests || row.extra?.baseGuests);
  return Math.round((row.price_usd || 0) * (1 + ((row.extra?.extraGuestPct || 0) / 100) * extras));
}
const bookingOut = (r) => r && ({
  id: r.id, code: r.code, listingId: r.listing_id, listingTitle: r.listing_title, guestId: r.guest_id, guestName: r.guest_name,
  hostId: r.host_id, checkIn: r.check_in, checkOut: r.check_out, nights: r.nights, guests: r.guests,
  subtotalUSD: r.subtotal_usd, cleaningUSD: r.cleaning_usd, taxesUSD: r.taxes_usd, platformFeeUSD: r.platform_fee_usd,
  totalUSD: r.total_usd, status: r.status, refundUSD: r.refund_usd, createdAt: r.created_at,
});
const resvOut = (r) => r && ({
  id: r.id, code: r.code, listingId: r.listing_id, listingTitle: r.listing_title, hostId: r.host_id,
  guestId: r.guest_id, guestName: r.guest_name, checkIn: r.check_in, checkOut: r.check_out, nights: r.nights,
  rateUSD: r.rate_usd, status: r.status, instant: r.instant, createdAt: r.created_at,
});
const msgOut = (r) => ({ id: r.id, sender: r.sender, text: r.text, createdAt: r.created_at });
const reviewOut = (r) => ({ id: r.id, listingId: r.listing_id, authorName: r.author_name, rating: r.rating, text: r.text, response: r.response, createdAt: r.created_at });

// =========================================================================
// AUTH
// =========================================================================
app.post('/v1/auth/login', wrap(async (req, res) => {
  const { phone, name, countryCode } = req.body || {};
  if (!phone) return err(res, 'PHONE', 'phone required');
  let user = await one('users', { phone });
  if (!user) user = await insertRow('users', { phone, name: name || 'Guest', country_code: countryCode || 'IN' });
  ok(res, { accessToken: sign({ sub: user.id, kind: 'user', name: user.name }), user });
}));

app.post('/v1/ops/auth/login', wrap(async (req, res) => {
  const member = await one('staff', { email: req.body?.email });
  if (!member) return err(res, 'STAFF', 'unknown staff email', 401);
  ok(res, { accessToken: sign({ sub: member.id, kind: 'staff', role: member.role, name: member.name }), staff: member });
}));

app.get('/v1/me', authUser, wrap(async (req, res) => {
  const tbl = req.auth.kind === 'staff' ? 'staff' : 'users';
  ok(res, await one(tbl, { id: req.auth.sub }));
}));

// =========================================================================
// LISTINGS
// =========================================================================
const listingIn = (b) => ({
  title: b.title, type: b.type, place_type: b.placeType, description: b.description,
  address: b.address, city: b.city, state: b.state, country: b.country, zipcode: b.zipcode,
  lat: b.lat, lng: b.lng, guests: b.guests, bedrooms: b.bedrooms, beds: b.beds, bathrooms: b.bathrooms,
  price_usd: b.priceUSD, weekend_price_usd: b.weekendPriceUSD, cleaning_fee_usd: b.cleaningFeeUSD,
  images: b.images || [], amenities: b.amenities || [], vibes: b.vibes || [], highlights: b.highlights || [],
  instant_book: !!b.instantBook,
  extra: {
    houseRules: b.houseRules || null,
    petsAllowed: b.petsAllowed ?? b.houseRules?.pets ?? null,
    cancellation: b.cancellation || null,
    checkIn: b.checkIn || null,
    checkOut: b.checkOut || null,
    minNights: b.minNights || null,
    safety: b.safety || [],
    // guest-based pricing: base price covers `baseGuests`; each extra guest
    // (up to the listing's max `guests`) adds `extraGuestPct` % of the base.
    baseGuests: b.baseGuests || null,
    extraGuestPct: b.extraGuestPct || 0,
    languages: b.hostLanguages || [], // languages the host speaks (filterable)
  },
});

app.post('/v1/listings', authUser, wrap(async (req, res) => {
  // publish:true → goes live immediately (no Ops team operating yet). When the
  // Ops portal is live, the app will submit for review instead (pending_review).
  const status = req.body.publish ? 'published' : 'draft';
  const payload = { ...listingIn(req.body), host_id: req.auth.sub, host_name: req.auth.name, status };
  let l;
  try {
    l = await insertRow('listings', payload);
  } catch (e) {
    // Resilient: if the `extra` column isn't added yet (migration-002), still
    // create the listing without it.
    if (String(e.message || '').includes('extra')) {
      const { extra, ...rest } = payload;
      l = await insertRow('listings', rest);
    } else throw e;
  }
  ok(res, { id: l.id, status: l.status });
}));
app.post('/v1/listings/:id/submit', authUser, wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id, host_id: req.auth.sub }, { status: 'pending_review' });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  ok(res, { id: req.params.id, status: 'pending_review' });
}));
app.get('/v1/listings', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('listings', { host_id: req.auth.sub })).map(listingOut) })));
app.get('/v1/listings/:id', wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const reviews = (await rows('reviews', { listing_id: l.id })).filter((r) => !r.removed).map(reviewOut);
  ok(res, { ...listingOut(l), reviews });
}));
app.get('/v1/search', wrap(async (req, res) => {
  let q = sb.from('listings').select('*').eq('status', 'published');
  // Free-form location search: take the query (which may be a single word like
  // "Hyderabad", a district, a state, a country, or a full "District, City,
  // State, Country" label), split into tokens, and match ANY token against ANY
  // location field. The matching field is figured out automatically.
  const rawTerm = String(req.query.q || req.query.city || '');
  if (rawTerm.trim()) {
    const tokens = rawTerm
      .split(',')
      .map((t) => t.replace(/[%,()]/g, '').trim())
      .filter((t) => t.length >= 2)
      .slice(0, 3); // first few (most specific) tokens
    if (tokens.length) {
      const fields = ['city', 'state', 'country', 'address', 'title', 'zipcode'];
      // Match the MOST-SPECIFIC token (the first, e.g. district/city) across all
      // location fields. A full "City, State, Country" label uses its city token,
      // so it returns every stay in that city (even ones missing state/country).
      const tok = tokens[0];
      q = q.or(fields.map((f) => `${f}.ilike.%${tok}%`).join(','));
    }
  }
  if (req.query.guests) q = q.gte('guests', Number(req.query.guests)); // capacity ≥ party size
  if (req.query.maxPrice) q = q.lte('price_usd', Number(req.query.maxPrice));
  if (req.query.minPrice) q = q.gte('price_usd', Number(req.query.minPrice));
  if (req.query.type) q = q.ilike('type', `%${req.query.type}%`);
  if (req.query.instant === 'true') q = q.eq('instant_book', true);
  const { data, error } = await q;
  if (error) throw error;
  let items = (data || []).map(listingOut);

  // Amenities filter (all requested must be present)
  if (req.query.amenities) {
    const want = String(req.query.amenities).split(',').map((a) => a.trim()).filter(Boolean);
    if (want.length) items = items.filter((l) => want.every((a) => (l.amenities || []).includes(a)));
  }
  // Pets — only stays that allow pets when the guest brings pets
  if (Number(req.query.pets) > 0 || req.query.pets === 'true') {
    items = items.filter((l) => l.petsAllowed === true);
  }
  // Host language(s) — the host must speak all requested languages
  if (req.query.languages) {
    const want = String(req.query.languages).split(',').map((s) => s.trim()).filter(Boolean);
    if (want.length) items = items.filter((l) => want.every((lang) => (l.hostLanguages || []).includes(lang)));
  }
  // Guest-based pricing: show the price for the searched party size.
  if (req.query.guests) {
    const g = Number(req.query.guests);
    items = items.map((l) => ({ ...l, basePriceUSD: l.priceUSD, priceUSD: effectiveNightly(l, g) }));
  }

  // Date availability: drop listings with an overlapping active booking, or a
  // blocked calendar day, in the requested range.
  const ci = req.query.checkIn, co = req.query.checkOut;
  if (ci && co) {
    const ids = items.map((l) => l.id);
    if (ids.length) {
      const { data: bks } = await sb.from('bookings').select('listing_id,check_in,check_out,status').in('listing_id', ids);
      const overlaps = (a1, a2, b1, b2) => a1 < b2 && b1 < a2; // [a1,a2) vs [b1,b2)
      const booked = new Set((bks || [])
        .filter((b) => b.status !== 'cancelled' && b.check_in && b.check_out && overlaps(b.check_in, b.check_out, ci, co))
        .map((b) => b.listing_id));
      const { data: cal } = await sb.from('calendar').select('listing_id,day,blocked').in('listing_id', ids).gte('day', ci).lt('day', co).eq('blocked', true);
      (cal || []).forEach((c) => booked.add(c.listing_id));
      items = items.filter((l) => !booked.has(l.id));
    }
  }
  // Geo-radius: ?lat=&lng=&radius=km → keep those within radius, nearest first.
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
// Update an existing listing (owner only) — title, price, photos, rules, etc.
app.put('/v1/listings/:id', authUser, wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  if (l.host_id !== req.auth.sub) return err(res, 'FORBIDDEN', 'not your listing', 403);
  const patch = listingIn(req.body);
  if (req.body.publish !== undefined) patch.status = req.body.publish ? 'published' : (l.status || 'draft');
  const { error } = await sb.from('listings').update(patch).eq('id', req.params.id);
  if (error && /extra/.test(error.message || '')) {
    const { extra, ...rest } = patch; // migration-002 not run → skip extras
    const { error: e2 } = await sb.from('listings').update(rest).eq('id', req.params.id);
    if (e2) throw e2;
  } else if (error) throw error;
  ok(res, { id: req.params.id, status: patch.status || l.status });
}));

app.get('/v1/listings/:id/quote', wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const nights = Math.max(1, Math.round((new Date(req.query.checkOut) - new Date(req.query.checkIn)) / 86400000) || 1);
  const guests = Number(req.query.guests) || (l.extra?.baseGuests || 1);
  const nightly = nightlyForGuestsRow(l, guests);
  const subtotal = nightly * nights, cleaning = l.cleaning_fee_usd || 0;
  const taxes = Math.round((subtotal + cleaning) * TAX_RATE);
  ok(res, { nights, nightlyUSD: nightly, baseNightlyUSD: l.price_usd || 0, subtotalUSD: subtotal, cleaningUSD: cleaning, taxesUSD: taxes, platformFeeUSD: 0, totalUSD: subtotal + cleaning + taxes });
}));

// =========================================================================
// CALENDAR & PRICING (host) — per-date price + blocked dates persist to DB
// =========================================================================
app.get('/v1/listings/:id/calendar', wrap(async (req, res) => {
  const { data, error } = await sb.from('calendar').select('*').eq('listing_id', req.params.id);
  if (error) throw error;
  ok(res, { items: (data || []).map((c) => ({ day: c.day, priceUSD: c.price_usd, blocked: c.blocked })) });
}));
app.put('/v1/listings/:id/calendar', authUser, wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id, host_id: req.auth.sub });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const days = Array.isArray(req.body?.days) ? req.body.days : [];
  if (days.length) {
    const upserts = days.map((d) => ({ listing_id: l.id, day: d.day, price_usd: d.priceUSD ?? null, blocked: !!d.blocked }));
    const { error } = await sb.from('calendar').upsert(upserts, { onConflict: 'listing_id,day' });
    if (error) throw error;
  }
  ok(res, { updated: days.length });
}));
app.put('/v1/listings/:id/pricing', authUser, wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id, host_id: req.auth.sub }, {
    price_usd: req.body.priceUSD, weekend_price_usd: req.body.weekendPriceUSD, cleaning_fee_usd: req.body.cleaningFeeUSD,
  });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  ok(res, listingOut(upd[0]));
}));

// =========================================================================
// BOOKINGS ⇄ RESERVATIONS
// =========================================================================
async function syncStatus(code, status) {
  const resvStatus = status === 'declined' ? 'cancelled' : status;
  await sb.from('reservations').update({ status: resvStatus }).eq('code', code);
  await sb.from('bookings').update({ status: resvStatus }).eq('code', code);
}

app.post('/v1/bookings', authUser, wrap(async (req, res) => {
  const { listingId, checkIn, checkOut, guests } = req.body || {};
  const l = await one('listings', { id: listingId });
  if (!l || l.status !== 'published') return err(res, 'NOTFOUND', 'listing not available', 404);
  const code = req.body.code || genCode();
  const existing = await one('bookings', { code });
  if (existing) return ok(res, { id: existing.id, code, status: existing.status, deduped: true });
  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) || 1);
  const nightly = nightlyForGuestsRow(l, Number(guests) || (l.extra?.baseGuests || 1));
  const subtotal = nightly * nights, cleaning = l.cleaning_fee_usd || 0;
  const taxes = Math.round((subtotal + cleaning) * TAX_RATE), total = subtotal + cleaning + taxes;
  const status = l.instant_book ? 'confirmed' : 'pending';
  const booking = await insertRow('bookings', {
    code, listing_id: listingId, listing_title: l.title, guest_id: req.auth.sub, guest_name: req.auth.name, host_id: l.host_id,
    check_in: checkIn, check_out: checkOut, nights, guests, subtotal_usd: subtotal, cleaning_usd: cleaning,
    taxes_usd: taxes, platform_fee_usd: 0, total_usd: total, status,
  });
  await insertRow('reservations', {
    code, listing_id: listingId, listing_title: l.title, host_id: l.host_id, guest_id: req.auth.sub, guest_name: req.auth.name,
    check_in: checkIn, check_out: checkOut, nights, rate_usd: l.price_usd, status, instant: !!l.instant_book,
  });
  await notify(l.host_id, l.instant_book ? 'booking.confirmed' : 'booking.request', { code });
  ok(res, { id: booking.id, code, status, payment: { status: 'authorized', escrowHeld: true } });
}));

app.get('/v1/bookings', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('bookings', { guest_id: req.auth.sub })).map(bookingOut) })));
app.get('/v1/reservations', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('reservations', { host_id: req.auth.sub })).map(resvOut) })));

const ACT = { accept: 'confirmed', decline: 'cancelled', checkin: 'confirmed', checkout: 'completed' };
app.post('/v1/reservations/:id/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  const r = await one('reservations', { id: req.params.id });
  if (!r) return err(res, 'NOTFOUND', 'reservation not found', 404);
  await syncStatus(r.code, status);
  await notify(r.guest_id, `booking.${req.params.action}`, { code: r.code });
  ok(res, { code: r.code, status: status === 'decline' ? 'cancelled' : status });
}));
app.post('/v1/reservations/by-code/:code/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  if (!(await one('reservations', { code: req.params.code }))) return err(res, 'NOTFOUND', 'no reservation', 404);
  await syncStatus(req.params.code, status);
  ok(res, { code: req.params.code, status });
}));
app.post('/v1/bookings/:id/cancel', authUser, wrap(async (req, res) => {
  const b = await one('bookings', { id: req.params.id, guest_id: req.auth.sub });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  await syncStatus(b.code, 'cancelled');
  const refund = Math.max(0, (b.total_usd || 0) - (b.taxes_usd || 0));
  await sb.from('bookings').update({ refund_usd: refund }).eq('id', b.id);
  await notify(b.host_id, 'booking.cancelled', { code: b.code });
  ok(res, { status: 'cancelled', refundUSD: refund, taxesWithheldUSD: b.taxes_usd });
}));
app.post('/v1/bookings/by-code/:code/cancel', authUser, wrap(async (req, res) => {
  if (!(await one('bookings', { code: req.params.code }))) return err(res, 'NOTFOUND', 'no booking', 404);
  await syncStatus(req.params.code, 'cancelled');
  ok(res, { code: req.params.code, status: 'cancelled' });
}));

// =========================================================================
// MESSAGING
// =========================================================================
app.post('/v1/threads', authUser, wrap(async (req, res) => {
  const l = await one('listings', { id: req.body?.listingId });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  let t = await one('threads', { listing_id: l.id, guest_id: req.auth.sub });
  if (!t) t = await insertRow('threads', { listing_id: l.id, listing_title: l.title, guest_id: req.auth.sub, guest_name: req.auth.name, host_id: l.host_id });
  ok(res, { id: t.id, hostId: t.host_id, guestId: t.guest_id });
}));
app.get('/v1/threads', authUser, wrap(async (req, res) => {
  const { data, error } = await sb.from('threads').select('*').or(`guest_id.eq.${req.auth.sub},host_id.eq.${req.auth.sub}`);
  if (error) throw error;
  ok(res, { items: data || [] });
}));
app.get('/v1/threads/:id/messages', authUser, wrap(async (req, res) => {
  const { data, error } = await sb.from('messages').select('*').eq('thread_id', req.params.id).order('created_at');
  if (error) throw error;
  ok(res, { items: (data || []).map(msgOut) });
}));
app.post('/v1/threads/:id/messages', authUser, wrap(async (req, res) => {
  const t = await one('threads', { id: req.params.id });
  if (!t) return err(res, 'NOTFOUND', 'thread not found', 404);
  const text = req.body?.text || '';
  const confirmedBks = await rows('bookings', { listing_id: t.listing_id, guest_id: t.guest_id });
  const confirmed = confirmedBks.some((b) => b.status !== 'cancelled' && b.status !== 'pending');
  if (!confirmed && hasContact(text)) return err(res, 'CONTACT_BLOCKED', 'You can share contact details once the booking is confirmed.', 422);
  const sender = req.auth.sub === t.host_id ? 'host' : 'guest';
  const m = await insertRow('messages', { thread_id: t.id, sender, text });
  await sb.from('threads').update({ last_at: now() }).eq('id', t.id);
  await notify(sender === 'host' ? t.guest_id : t.host_id, 'message.created', { threadId: t.id });
  ok(res, msgOut(m));
}));

// =========================================================================
// REVIEWS
// =========================================================================
app.post('/v1/reviews', authUser, wrap(async (req, res) => {
  const { bookingId, bookingCode, listingId, rating, text } = req.body || {};
  const b = bookingId ? await one('bookings', { id: bookingId }) : bookingCode ? await one('bookings', { code: bookingCode }) : null;
  const lId = b ? b.listing_id : listingId;
  const l = await one('listings', { id: lId });
  if (!l) return err(res, 'NOTFOUND', 'listing/booking not found', 404);
  const review = await insertRow('reviews', { booking_id: b?.id, listing_id: l.id, author_id: req.auth.sub, author_name: req.auth.name, direction: 'guest_to_host', rating, text });
  const rs = (await rows('reviews', { listing_id: l.id })).filter((r) => !r.removed);
  await sb.from('listings').update({ rating_count: rs.length, rating_avg: Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 }).eq('id', l.id);
  await notify(l.host_id, 'review.posted', { listingId: l.id });
  ok(res, { id: review.id, status: 'published' });
}));
app.get('/v1/reviews', authUser, wrap(async (req, res) => {
  if (req.query.listingId) return ok(res, { items: (await rows('reviews', { listing_id: req.query.listingId })).filter((r) => !r.removed).map(reviewOut) });
  const mine = await rows('listings', { host_id: req.auth.sub });
  const ids = new Set(mine.map((l) => l.id));
  const all = await rows('reviews');
  ok(res, { items: all.filter((r) => ids.has(r.listing_id) && !r.removed).map(reviewOut) });
}));
app.post('/v1/reviews/:id/respond', authUser, wrap(async (req, res) => {
  await updateByMatch('reviews', { id: req.params.id }, { response: req.body.response });
  ok(res, { id: req.params.id, response: req.body.response });
}));
// Host reviews the guest after checkout (direction = host_to_guest)
app.post('/v1/guest-reviews', authUser, wrap(async (req, res) => {
  const { bookingCode, rating, text } = req.body || {};
  const b = await one('bookings', { code: bookingCode });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  const review = await insertRow('reviews', { booking_id: b.id, listing_id: b.listing_id, author_id: req.auth.sub, author_name: req.auth.name, direction: 'host_to_guest', rating, text });
  await notify(b.guest_id, 'guest-review.posted', { code: bookingCode });
  ok(res, { id: review.id, status: 'published' });
}));

// =========================================================================
// REELS / REPORTS / KYC
// =========================================================================
app.post('/v1/reels', authUser, wrap(async (req, res) => {
  const r = await insertRow('reels', { author_id: req.auth.sub, kind: req.body.kind, media_url: req.body.mediaUrl, thumb_url: req.body.thumbUrl, caption: req.body.caption, listing_id: req.body.listingId, status: 'pending' });
  ok(res, { id: r.id, status: 'pending' });
}));
app.get('/v1/reels', wrap(async (req, res) => ok(res, { items: await rows('reels', { status: 'live' }) })));
app.post('/v1/reports', authUser, wrap(async (req, res) => {
  const r = await insertRow('reports', { reporter_id: req.auth.sub, target_type: req.body.targetType, target_id: String(req.body.targetId), reason: req.body.reason, details: req.body.details, status: 'open' });
  ok(res, { id: r.id, status: 'open' });
}));
// One person = one identity. The raw ID is never stored; we keep a salted
// hash of (idType + idNumber + dob) with a unique index. If that hash already
// belongs to ANOTHER user, the submission is rejected as a duplicate identity.
const IDENTITY_SALT = process.env.IDENTITY_SALT || process.env.JWT_SECRET || 'stayon-identity-salt';
function identityHash(idType, idNumber, dob) {
  const norm = `${String(idType || '').trim().toLowerCase()}|${String(idNumber || '').replace(/\s|-/g, '').toLowerCase()}|${String(dob || '').trim()}`;
  return crypto.createHash('sha256').update(IDENTITY_SALT + '|' + norm).digest('hex');
}
app.post('/v1/identity/submit', authUser, wrap(async (req, res) => {
  const { legalName, idType, idNumber, dob } = req.body || {};
  if (!idType || !idNumber) return err(res, 'ID_REQUIRED', 'idType and idNumber are required', 400);
  const id_hash = identityHash(idType, idNumber, dob);
  const id_last4 = String(idNumber).replace(/\s|-/g, '').slice(-4);

  // Reject if this exact ID is already linked to a different account.
  const { data: clash, error: clashErr } = await sb.from('identities').select('user_id,status').eq('id_hash', id_hash).maybeSingle();
  const columnMissing = clashErr && /id_hash/.test(clashErr.message || '');
  if (clash && clash.user_id !== req.auth.sub) {
    return err(res, 'IDENTITY_IN_USE', 'This ID is already linked to another StayOn account. One person can hold only one account.', 409);
  }

  // Ask the KYC provider (or fall back to the Ops manual-review queue).
  const verdict = await verifyIdentity({ idType, idNumber, dob, legalName, country: req.body.country });

  const full = { user_id: req.auth.sub, legal_name: legalName, id_type: idType, id_last4, dob: dob || null, id_hash, status: verdict.status, provider: process.env.KYC_PROVIDER || null, provider_ref: verdict.providerRef || null, submitted_at: now() };
  const { error: upErr } = await sb.from('identities').upsert(full);
  if (upErr && /id_hash|dob/.test(upErr.message || '')) {
    // migration-003 not run yet → store without the new columns (no dedup yet)
    await sb.from('identities').upsert({ user_id: req.auth.sub, legal_name: legalName, id_type: idType, status: verdict.status, submitted_at: now() });
    return ok(res, { status: verdict.status, dedup: false });
  } else if (upErr) { throw upErr; }
  ok(res, { status: verdict.status, dedup: !columnMissing });
}));

// =========================================================================
// EARNINGS / PAYOUTS / payout change
// =========================================================================
app.get('/v1/earnings', authUser, wrap(async (req, res) => {
  const mine = (await rows('bookings', { host_id: req.auth.sub })).filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const gross = mine.reduce((s, b) => s + (b.subtotal_usd || 0) + (b.cleaning_usd || 0), 0);
  ok(res, { bookings: mine.length, grossUSD: gross, feeUSD: 0, netUSD: gross });
}));
app.get('/v1/payouts', authUser, wrap(async (req, res) => {
  const items = (await rows('bookings', { host_id: req.auth.sub })).filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .map((b) => ({ code: b.code, amountUSD: (b.subtotal_usd || 0) + (b.cleaning_usd || 0), status: b.status === 'completed' ? 'paid' : 'scheduled' }));
  ok(res, { items });
}));
app.post('/v1/payout-method/change-request', authUser, wrap(async (req, res) => {
  const r = await insertRow('payout_change_requests', { host_id: req.auth.sub, requested: req.body, status: 'pending' });
  ok(res, { id: r.id, status: 'pending' });
}));

// =========================================================================
// WISHLISTS / NOTIFICATIONS / MEDIA
// =========================================================================
app.get('/v1/wishlists', authUser, wrap(async (req, res) => ok(res, { items: await rows('wishlists', { user_id: req.auth.sub }) })));
app.post('/v1/wishlists', authUser, wrap(async (req, res) => {
  await sb.from('wishlists').upsert({ user_id: req.auth.sub, listing_id: req.body.listingId }, { onConflict: 'user_id,listing_id' });
  ok(res, { saved: true });
}));
app.delete('/v1/wishlists/:listingId', authUser, wrap(async (req, res) => {
  await sb.from('wishlists').delete().match({ user_id: req.auth.sub, listing_id: req.params.listingId });
  ok(res, { removed: true });
}));
app.get('/v1/notifications', authUser, wrap(async (req, res) => {
  const { data } = await sb.from('notifications').select('*').eq('user_id', req.auth.sub).order('created_at', { ascending: false }).limit(50);
  ok(res, { items: data || [] });
}));
app.post('/v1/notifications/read', authUser, wrap(async (req, res) => {
  await sb.from('notifications').update({ read: true }).eq('user_id', req.auth.sub);
  ok(res, { read: true });
}));
// Pre-signed upload to Supabase Storage → returns a public CDN URL for the file.
app.post('/v1/media/presign', authUser, wrap(async (req, res) => {
  const ext = (req.body?.contentType || 'image/jpeg').split('/')[1] || 'jpg';
  const path = `${req.auth.sub}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(BUCKET_LISTINGS).createSignedUploadUrl(path);
  if (error) throw error;
  const { data: pub } = sb.storage.from(BUCKET_LISTINGS).getPublicUrl(path);
  ok(res, { path, token: data.token, signedUrl: data.signedUrl, fileUrl: pub.publicUrl });
}));

// Direct upload: app sends base64, backend stores it in Supabase Storage and
// returns a permanent public URL (so photos load on every device).
app.post('/v1/media/upload', authUser, wrap(async (req, res) => {
  const { b64, contentType } = req.body || {};
  if (!b64) return err(res, 'NO_FILE', 'no image data');
  const ext = (contentType || 'image/jpeg').split('/')[1] || 'jpg';
  const path = `${req.auth.sub}/${crypto.randomUUID()}.${ext}`;
  const buf = Buffer.from(b64, 'base64');
  const { error } = await sb.storage.from(BUCKET_LISTINGS).upload(path, buf, { contentType: contentType || 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data: pub } = sb.storage.from(BUCKET_LISTINGS).getPublicUrl(path);
  ok(res, { url: pub.publicUrl });
}));

// =========================================================================
// OPS PORTAL
// =========================================================================
app.get('/v1/ops/queues/listings', authStaff('content_mod'), wrap(async (req, res) =>
  ok(res, { items: (await rows('listings', { status: 'pending_review' })).map(listingOut) })));
app.post('/v1/ops/listings/:id/approve', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id }, { status: 'published' });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  await audit(req, 'listing.approve', 'listing', req.params.id);
  await notify(upd[0].host_id, 'listing.approved', { id: req.params.id });
  ok(res, { id: req.params.id, status: 'published' });
}));
app.post('/v1/ops/listings/:id/reject', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id }, { status: 'rejected', reject_reason: req.body.reason });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  await audit(req, 'listing.reject', 'listing', req.params.id, { reason: req.body.reason });
  await notify(upd[0].host_id, 'listing.rejected', { id: req.params.id, reason: req.body.reason });
  ok(res, { id: req.params.id, status: 'rejected' });
}));
app.get('/v1/ops/queues/kyc', authStaff('kyc_reviewer'), wrap(async (req, res) =>
  ok(res, { items: await rows('identities', { status: 'pending' }) })));
app.post('/v1/ops/kyc/:userId/:decision', authStaff('kyc_reviewer'), wrap(async (req, res) => {
  const status = req.params.decision === 'approve' ? 'verified' : 'rejected';
  await updateByMatch('identities', { user_id: req.params.userId }, { status, reviewed_at: now() });
  await audit(req, 'kyc.' + req.params.decision, 'identity', req.params.userId);
  await notify(req.params.userId, 'kyc.' + status, {});
  ok(res, { status });
}));
app.get('/v1/ops/queues/reels', authStaff('content_mod'), wrap(async (req, res) =>
  ok(res, { items: await rows('reels', { status: 'pending' }) })));
app.post('/v1/ops/reels/:id/:decision', authStaff('content_mod'), wrap(async (req, res) => {
  const status = req.params.decision === 'approve' ? 'live' : 'rejected';
  await updateByMatch('reels', { id: req.params.id }, { status });
  await audit(req, 'reel.' + req.params.decision, 'reel', req.params.id);
  ok(res, { id: req.params.id, status });
}));
app.get('/v1/ops/queues/payout-changes', authStaff('finance'), wrap(async (req, res) =>
  ok(res, { items: await rows('payout_change_requests', { status: 'pending' }) })));
app.post('/v1/ops/payout-changes/:id/:decision', authStaff('finance'), wrap(async (req, res) => {
  const status = req.params.decision === 'approve' ? 'approved' : 'rejected';
  const upd = await updateByMatch('payout_change_requests', { id: req.params.id }, { status, reviewed_at: now() });
  if (!upd.length) return err(res, 'NOTFOUND', 'request not found', 404);
  if (status === 'approved') {
    const reqd = upd[0].requested || {};
    await insertRow('payout_methods', { host_id: upd[0].host_id, kind: reqd.kind, masked_label: reqd.masked_label || reqd.masked || reqd.maskedLabel, verified: true });
  }
  await audit(req, 'payout-change.' + req.params.decision, 'payout_change', req.params.id);
  await notify(upd[0].host_id, 'payout-change.' + status, {});
  ok(res, { id: req.params.id, status });
}));
app.get('/v1/ops/reports', authStaff('trust_safety'), wrap(async (req, res) =>
  ok(res, { items: await rows('reports', { status: 'open' }) })));
app.post('/v1/ops/reports/:id/resolve', authStaff('trust_safety'), wrap(async (req, res) => {
  const upd = await updateByMatch('reports', { id: req.params.id }, { status: 'resolved', resolution: req.body.resolution });
  if (!upd.length) return err(res, 'NOTFOUND', 'report not found', 404);
  await audit(req, 'report.resolve', 'report', req.params.id);
  ok(res, { id: req.params.id, status: 'resolved' });
}));
// Ops bookings oversight + force-cancel + refund
app.get('/v1/ops/bookings', authStaff('ops_manager'), wrap(async (req, res) => {
  const { data } = await sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: (data || []).map(bookingOut) });
}));
app.post('/v1/ops/bookings/:code/force-cancel', authStaff('ops_manager'), wrap(async (req, res) => {
  if (!(await one('bookings', { code: req.params.code }))) return err(res, 'NOTFOUND', 'booking not found', 404);
  await syncStatus(req.params.code, 'cancelled');
  await audit(req, 'booking.force-cancel', 'booking', req.params.code);
  ok(res, { code: req.params.code, status: 'cancelled' });
}));
app.post('/v1/ops/refunds', authStaff('finance'), wrap(async (req, res) => {
  const b = await one('bookings', { code: req.body.bookingCode });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  const amount = req.body.amountUSD ?? Math.max(0, (b.total_usd || 0) - (b.taxes_usd || 0));
  await sb.from('bookings').update({ refund_usd: amount }).eq('id', b.id);
  await audit(req, 'refund', 'booking', b.code, { amount });
  await notify(b.guest_id, 'refund.issued', { code: b.code, amount });
  ok(res, { code: b.code, refundUSD: amount });
}));

// Ops review moderation
app.get('/v1/ops/reviews', authStaff('content_mod'), wrap(async (req, res) => {
  const { data } = await sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: (data || []).map(reviewOut) });
}));
app.post('/v1/ops/reviews/:id/remove', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('reviews', { id: req.params.id }, { removed: true });
  if (!upd.length) return err(res, 'NOTFOUND', 'review not found', 404);
  const lId = upd[0].listing_id;
  const rs = (await rows('reviews', { listing_id: lId })).filter((r) => !r.removed);
  await sb.from('listings').update({ rating_count: rs.length, rating_avg: rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0 }).eq('id', lId);
  await audit(req, 'review.remove', 'review', req.params.id);
  ok(res, { id: req.params.id, removed: true });
}));

app.get('/v1/ops/users', authStaff('trust_safety'), wrap(async (req, res) => ok(res, { items: await rows('users') })));
app.post('/v1/ops/users/:id/:action', authStaff('trust_safety'), wrap(async (req, res) => {
  const map = { suspend: 'suspended', ban: 'banned', reinstate: 'active' };
  const upd = await updateByMatch('users', { id: req.params.id }, { status: map[req.params.action] });
  if (!upd.length) return err(res, 'NOTFOUND', 'user not found', 404);
  await audit(req, 'user.' + req.params.action, 'user', req.params.id);
  ok(res, { id: req.params.id, status: map[req.params.action] });
}));
app.get('/v1/ops/dashboard', authStaff(), wrap(async (req, res) => {
  const [pl, kyc, reels, reps, bks] = await Promise.all([
    rows('listings', { status: 'pending_review' }), rows('identities', { status: 'pending' }),
    rows('reels', { status: 'pending' }), rows('reports', { status: 'open' }), rows('bookings'),
  ]);
  const live = await rows('listings', { status: 'published' });
  ok(res, {
    queues: { listings: pl.length, kyc: kyc.length, reels: reels.length, reports: reps.length },
    today: { bookings: bks.length, gmvUSD: bks.reduce((s, b) => s + (b.total_usd || 0), 0), listingsLive: live.length },
  });
}));
app.get('/v1/ops/audit', authStaff('compliance'), wrap(async (req, res) => {
  const { data } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: data || [] });
}));

// =========================================================================
// AI — classify listing photos into rooms/areas (Claude vision)
// =========================================================================
const PHOTO_ROOM_KEYS = ['living', 'kitchen', 'dining', 'bedroom', 'bathroom', 'balcony', 'workspace', 'pool', 'garden', 'parking', 'playground', 'exterior', 'other'];
const ROOM_PROMPT = `What room/area of a property is this photo? Reply with ONE word from: ${PHOTO_ROOM_KEYS.join(', ')}.`;
const pickRoom = (txt) => PHOTO_ROOM_KEYS.find((k) => String(txt || '').toLowerCase().includes(k)) || 'other';

// Classify one image with whichever provider is configured (Gemini → Anthropic).
async function classifyOne(im) {
  const gKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY;
  const aKey = process.env.ANTHROPIC_API_KEY;
  try {
    if (gKey) {
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${gKey}`, {
        method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ inline_data: { mime_type: im.mediaType || 'image/jpeg', data: im.b64 } }, { text: ROOM_PROMPT }] }] }),
      });
      const j = await r.json();
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text;
      return txt ? pickRoom(txt) : null; // error/quota → null (leave untagged), not "other"
    }
    if (aKey) {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST', headers: { 'x-api-key': aKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 16, messages: [{ role: 'user', content: [{ type: 'image', source: { type: 'base64', media_type: im.mediaType || 'image/jpeg', data: im.b64 } }, { type: 'text', text: ROOM_PROMPT }] }] }),
      });
      const j = await r.json();
      const txt = j?.content?.[0]?.text;
      return txt ? pickRoom(txt) : null;
    }
  } catch { /* provider error */ }
  return null;
}

app.post('/v1/ai/classify-photos', authUser, wrap(async (req, res) => {
  const configured = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_AI_KEY || process.env.ANTHROPIC_API_KEY);
  const images = Array.isArray(req.body.images) ? req.body.images.slice(0, 15) : [];
  if (!configured) return ok(res, { results: images.map((im) => ({ id: im.id, room: null })), aiConfigured: false });
  const results = [];
  for (const im of images) results.push({ id: im.id, room: await classifyOne(im) });
  ok(res, { results, aiConfigured: true });
}));

// Public host profile — the stays they manage + reviews across those stays.
app.get('/v1/hosts/:id', wrap(async (req, res) => {
  const { data: ls } = await sb.from('listings').select('*').eq('host_id', req.params.id).eq('status', 'published');
  const stays = (ls || []).map(listingOut);
  const ids = stays.map((s) => s.id);
  let reviews = [];
  let ratingAvg = 0;
  if (ids.length) {
    const { data: rv } = await sb.from('reviews').select('*').in('listing_id', ids).order('created_at', { ascending: false }).limit(40);
    reviews = (rv || []).map((r) => ({ author: r.author_name || 'Guest', text: r.comment, rating: r.rating, createdAt: r.created_at }));
    const rated = stays.filter((s) => s.ratingCount > 0);
    if (rated.length) ratingAvg = Math.round((rated.reduce((s, x) => s + (x.ratingAvg || 0), 0) / rated.length) * 100) / 100;
  }
  const hostName = (ls || [])[0]?.host_name || 'Host';
  ok(res, {
    profile: { id: req.params.id, name: hostName },
    stays, reviews,
    stats: { reviews: reviews.length, rating: ratingAvg, listings: stays.length },
  });
}));

app.get('/', (req, res) => res.json({ service: 'StayOn backend', status: 'ok', store: 'supabase', clients: ['user', 'host', 'ops'] }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StayOn backend (Supabase) listening on http://localhost:${PORT}`));
