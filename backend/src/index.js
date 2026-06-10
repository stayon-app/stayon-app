// StayOn central backend — ONE service for User app + Host app + Ops portal.
// Database-backed by Supabase (Postgres + Storage) → cross-device, persistent.

const crypto = require('crypto');
const express = require('express');
const cors = require('cors');
const { sign, authUser, authStaff } = require('./auth');
const { supabase, configured, BUCKET_LISTINGS } = require('./supabase');
const { verifyIdentity } = require('./kyc');
const payments = require('./payments');
const totp = require('./totp');

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
async function notify(userId, type, payload) {
  try { await insertRow('notifications', { user_id: userId, type, payload }); } catch {}
  sendPush(userId, pushTitle(type), pushBody(type, payload)); // best-effort, fire-and-forget
}
// Best-effort Expo push (no-op if the user has no token or fetch fails).
async function sendPush(userId, title, body) {
  try {
    if (!userId) return;
    const u = await one('users', { id: userId });
    if (!u || !u.push_token) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: u.push_token, title, body, sound: 'default' }),
    });
  } catch { /* push is best-effort */ }
}
function pushTitle(type) {
  const m = { 'booking.request': 'New booking request', 'booking.confirmed': 'Booking confirmed',
    'payout.sent': 'Payout sent', 'payout.held': 'Payout on hold', 'payout.released': 'Payout released',
    'refund.issued': 'Refund issued', 'kyc.verified': 'Identity verified', 'kyc.rejected': 'Identity needs attention' };
  return m[type] || 'StayOn';
}
function pushBody(type, p) {
  if (p && p.code) return `Booking ${p.code}${p.amount ? ' · $' + p.amount : ''}`;
  return 'Open StayOn for details.';
}
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
  // Defensive: a PARTIAL update must not wipe fields the caller didn't send.
  // Drop array columns that weren't provided, and MERGE the `extra` jsonb
  // (preserving existing pricing/pets/languages/rules when omitted).
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
  // Start the payment — money is collected and HELD in escrow (sim or real).
  let pay = { status: 'held' };
  try {
    const intent = await payments.createIntent(booking);
    await sb.from('bookings').update({ payment_intent_id: intent.intentId, payment_status: intent.status }).eq('id', booking.id);
    pay = { status: intent.status, clientSecret: intent.clientSecret, provider: payments.PROVIDER };
  } catch { /* migration-009 not run → escrow still tracked via status */ }
  await notify(l.host_id, l.instant_book ? 'booking.confirmed' : 'booking.request', { code });
  ok(res, { id: booking.id, code, status, payment: pay });
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

  const docs = { front: req.body.docFront || null, back: req.body.docBack || null, selfie: req.body.selfie || null };
  const full = { user_id: req.auth.sub, legal_name: legalName, id_type: idType, id_last4, dob: dob || null, id_hash, docs, status: verdict.status, provider: process.env.KYC_PROVIDER || null, provider_ref: verdict.providerRef || null, submitted_at: now() };
  const { error: upErr } = await sb.from('identities').upsert(full);
  if (upErr && /id_hash|dob|docs/.test(upErr.message || '')) {
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
  const verified = req.params.decision === 'approve' || req.params.decision === 'verify';
  const status = verified ? 'verified' : 'rejected';
  const reason = req.body?.reason || null;
  await updateByMatch('identities', { user_id: req.params.userId }, { status, reviewed_at: now() });
  await audit(req, 'kyc.' + (verified ? 'verify' : 'reject'), 'identity', req.params.userId, { reason });
  await notify(req.params.userId, 'kyc.' + status, { reason });
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
  const re = await payments.refund(b, amount);                       // money back to guest
  await sb.from('bookings').update({ refund_usd: amount, payment_status: 'refunded' }).eq('id', b.id).then(() => {}, () => sb.from('bookings').update({ refund_usd: amount }).eq('id', b.id));
  await audit(req, 'refund', 'booking', b.code, { amount, refundId: re.refundId });
  await notify(b.guest_id, 'refund.issued', { code: b.code, amount });
  ok(res, { code: b.code, refundUSD: amount, refundId: re.refundId });
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

// =========================================================================
// OPS MODULES (Phases 2 & 3) — tickets, disputes, safety, markets, partners,
// field tasks, region rules + QA scorecards, review insights, GDPR.
// Tables come from migration-004; endpoints follow the /v1/ops/* + authStaff
// pattern and write the audit log. They degrade gracefully if the migration
// hasn't run (list returns []).
// =========================================================================
function opsModule(slug, table, roles, hooks = {}) {
  app.get(`/v1/ops/${slug}`, authStaff(...roles), wrap(async (req, res) => {
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: false }).limit(300);
    if (error) return ok(res, { items: [], note: 'run migration-004' });
    ok(res, { items: data || [] });
  }));
  app.post(`/v1/ops/${slug}`, authStaff(...roles), wrap(async (req, res) => {
    const row = await insertRow(table, req.body || {});
    await audit(req, `${slug}.create`, slug, row.id);
    if (hooks.onCreate) await hooks.onCreate(row, req);
    ok(res, row);
  }));
  app.post(`/v1/ops/${slug}/:id/:action`, authStaff(...roles), wrap(async (req, res) => {
    const patch = { status: req.params.action, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    const { error } = await sb.from(table).update(patch).eq('id', req.params.id);
    if (error) throw error;
    await audit(req, `${slug}.${req.params.action}`, slug, req.params.id);
    if (hooks.onAction) await hooks.onAction(req.params.id, req.params.action, req);
    ok(res, { id: req.params.id, status: req.params.action });
  }));
}
// Quietly set/clear a payout hold (ignores missing column pre-migration-007).
async function setPayoutHold(code, held, reason) {
  if (!code) return;
  try { await sb.from('bookings').update({ payout_held: held, hold_reason: held ? (reason || 'open dispute') : null }).eq('code', code); } catch { /* migration-007 not run */ }
}
opsModule('tickets', 'tickets', ['support', 'ops_manager']);
// Disputes auto-HOLD the booking's payout while open, and RELEASE on resolve.
opsModule('disputes', 'disputes', ['support', 'finance', 'ops_manager'], {
  onCreate: async (row) => { if (row.booking_code) await setPayoutHold(row.booking_code, true, 'open dispute'); },
  onAction: async (id, action) => {
    if (action === 'resolved' || action === 'rejected') {
      const d = await one('disputes', { id }).catch(() => null);
      if (d?.booking_code) await setPayoutHold(d.booking_code, false);
    }
  },
});
opsModule('safety-cases', 'safety_cases', ['trust_safety', 'ops_manager']);
opsModule('markets', 'markets', ['compliance', 'ops_manager']);
opsModule('partners', 'partners', ['ops_manager']);
opsModule('field-tasks', 'field_tasks', ['ops_manager']);
opsModule('region-rules', 'region_rules', ['compliance']);

// QA — host scorecards (computed from listings + reviews; no new table)
app.get('/v1/ops/qa/scorecards', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
  const { data: listings } = await sb.from('listings').select('host_id,host_name,rating_avg,rating_count,status');
  const byHost = {};
  (listings || []).forEach((l) => {
    const h = byHost[l.host_id] || (byHost[l.host_id] = { host: l.host_name || 'Host', listings: 0, published: 0, rating: 0, reviews: 0 });
    h.listings++; if (l.status === 'published') h.published++;
    h.rating = Math.max(h.rating, l.rating_avg || 0); h.reviews += l.rating_count || 0;
  });
  ok(res, { items: Object.values(byHost).sort((a, b) => b.reviews - a.reviews) });
}));

// QA — review insights (computed)
app.get('/v1/ops/qa/insights', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
  const { data: reviews } = await sb.from('reviews').select('rating,text');
  const total = (reviews || []).length;
  const avg = total ? (reviews.reduce((s, r) => s + (r.rating || 0), 0) / total) : 0;
  const low = (reviews || []).filter((r) => (r.rating || 0) <= 3).length;
  ok(res, { items: [
    { id: 'm1', label: 'Total reviews', value: String(total) },
    { id: 'm2', label: 'Average rating', value: avg.toFixed(2) },
    { id: 'm3', label: 'Low ratings (≤3)', value: String(low) },
    { id: 'm4', label: 'Needs attention', value: low > 0 ? `${low} review(s)` : 'none' },
  ] });
}));

// HOST operations — every host (derived from listings) with their stats + status
app.get('/v1/ops/hosts', authStaff('ops_manager', 'trust_safety', 'analyst'), wrap(async (req, res) => {
  const { data: listings } = await sb.from('listings').select('host_id,host_name,status,rating_avg,rating_count');
  const byHost = {};
  (listings || []).forEach((l) => {
    if (!l.host_id) return;
    const h = byHost[l.host_id] || (byHost[l.host_id] = { id: l.host_id, name: l.host_name || 'Host', listings: 0, published: 0, rating: 0, reviews: 0 });
    h.listings++; if (l.status === 'published') h.published++;
    h.rating = Math.max(h.rating, l.rating_avg || 0); h.reviews += l.rating_count || 0;
  });
  const ids = Object.keys(byHost);
  if (ids.length) {
    const { data: us } = await sb.from('users').select('id,status,phone').in('id', ids);
    (us || []).forEach((u) => { if (byHost[u.id]) { byHost[u.id].status = u.status || 'active'; byHost[u.id].phone = u.phone; } });
  }
  ok(res, { items: Object.values(byHost).sort((a, b) => b.listings - a.listings) });
}));

// GUEST operations — every guest (a user) with booking activity
app.get('/v1/ops/guests', authStaff('ops_manager', 'trust_safety', 'support'), wrap(async (req, res) => {
  const { data: users } = await sb.from('users').select('id,name,phone,email,status,created_at').order('created_at', { ascending: false }).limit(300);
  const { data: bks } = await sb.from('bookings').select('guest_id');
  const counts = {};
  (bks || []).forEach((b) => { counts[b.guest_id] = (counts[b.guest_id] || 0) + 1; });
  ok(res, { items: (users || []).map((u) => ({ ...u, bookings: counts[u.id] || 0 })) });
}));

// GDPR — export / erase a user's data (compliance)
app.post('/v1/ops/users/:id/export', authStaff('compliance', 'ops_manager'), wrap(async (req, res) => {
  const user = await one('users', { id: req.params.id });
  const bookings = await rows('bookings', { guest_id: req.params.id });
  const identity = await one('identities', { user_id: req.params.id });
  await audit(req, 'gdpr.export', 'user', req.params.id);
  ok(res, { user, bookings, identity });
}));
app.post('/v1/ops/users/:id/erase', authStaff('compliance', 'ops_manager'), wrap(async (req, res) => {
  await sb.from('users').update({ name: '[erased]', phone: null, email: null }).eq('id', req.params.id);
  await audit(req, 'gdpr.erase', 'user', req.params.id);
  ok(res, { id: req.params.id, erased: true });
}));

// =========================================================================
// OPS v2 — fraud/risk, payout ops, maintenance, dev/release (migration-005)
// =========================================================================
opsModule('risk-flags', 'risk_flags', ['trust_safety', 'finance']);
opsModule('maintenance', 'maintenance', ['ops_manager']);
opsModule('incidents', 'incidents', ['ops_manager']);
opsModule('bank-accounts', 'bank_accounts', ['finance']);

// Payout escrow — derived from real bookings: held until check-in → releasable
// → paid when completed. Ops can put a payout ON HOLD (migration-007).
app.get('/v1/ops/escrow', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { data: bks } = await sb.from('bookings').select('*');
  const today = new Date().toISOString().slice(0, 10);
  const items = (bks || []).filter((b) => b.status === 'confirmed' || b.status === 'completed').map((b) => ({
    code: b.code, hostId: b.host_id, amountUSD: (b.subtotal_usd || 0) + (b.cleaning_usd || 0),
    status: b.payout_held ? 'on-hold' : (b.payout_paid || b.status === 'completed' ? 'paid' : (b.check_in && b.check_in <= today ? 'releasable' : 'held')),
    releaseAt: b.check_in,
  }));
  ok(res, { items });
}));

// Payout auto-scheduler — pays out eligible bookings (past check-in + grace,
// not on hold). Run on a button or a cron — "pays hosts on time".
app.post('/v1/ops/payouts/run-scheduler', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const GRACE_DAYS = 1;
  const cutoff = new Date(Date.now() - GRACE_DAYS * 86400000).toISOString().slice(0, 10);
  let paid = 0, held = 0, waiting = 0;
  try {
    const { data: bks } = await sb.from('bookings').select('*').in('status', ['confirmed', 'completed']);
    for (const b of (bks || [])) {
      if (b.payout_paid) continue;
      if (b.payout_held) { held++; continue; }
      if (b.check_in && b.check_in <= cutoff) {
        const host = b.host_id ? await one('users', { id: b.host_id }).catch(() => null) : null;
        const tr = await payments.transferToHost(b, host?.payout_account_id);   // release escrow → host
        await sb.from('bookings').update({ payout_paid: true, transfer_id: tr.transferId, payment_status: 'paid' }).eq('code', b.code).then(() => {}, () => sb.from('bookings').update({ payout_paid: true }).eq('code', b.code));
        await notify(b.host_id, 'payout.sent', { code: b.code });
        paid++;
      } else waiting++;
    }
  } catch (e) { return err(res, 'SERVER', /payout_paid/.test(e.message || '') ? 'Run migration-007 to enable the scheduler.' : e.message, 500); }
  await audit(req, 'payout.scheduler.run', 'payouts', `paid=${paid}`);
  ok(res, { paid, held, waiting });
}));

// Full booking detail for the payout review drawer — guest, host, money split.
app.get('/v1/ops/bookings/:code', authStaff('finance', 'support', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
  const b = await one('bookings', { code: req.params.code });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  const guest = b.guest_id ? await one('users', { id: b.guest_id }).catch(() => null) : null;
  const host = b.host_id ? await one('users', { id: b.host_id }).catch(() => null) : null;
  await audit(req, 'booking.viewed', 'booking', b.code);
  ok(res, {
    code: b.code, listingTitle: b.listing_title, status: b.status, checkIn: b.check_in, checkOut: b.check_out, nights: b.nights,
    guestName: guest?.name || 'Guest', guestId: b.guest_id, hostName: host?.name || 'Host', hostId: b.host_id,
    subtotalUSD: b.subtotal_usd || 0, cleaningUSD: b.cleaning_usd || 0, taxesUSD: b.taxes_usd || 0, totalUSD: b.total_usd || 0,
    payoutUSD: (b.subtotal_usd || 0) + (b.cleaning_usd || 0),
    payoutHeld: !!b.payout_held, holdReason: b.hold_reason || null,
  });
}));

// HOLD / RELEASE a host payout (escrow control)
app.post('/v1/ops/bookings/:code/hold', authStaff('finance', 'trust_safety', 'ops_manager'), wrap(async (req, res) => {
  const { error } = await sb.from('bookings').update({ payout_held: true, hold_reason: req.body?.reason || 'under review' }).eq('code', req.params.code);
  if (error) return err(res, 'SERVER', /payout_held|hold_reason/.test(error.message || '') ? 'Run migration-007 to enable payout holds.' : error.message, 500);
  await audit(req, 'payout.hold', 'booking', req.params.code);
  await notify(req.body?.hostId, 'payout.held', { code: req.params.code });
  ok(res, { code: req.params.code, payoutHeld: true });
}));
app.post('/v1/ops/bookings/:code/release', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { error } = await sb.from('bookings').update({ payout_held: false, hold_reason: null }).eq('code', req.params.code);
  if (error) return err(res, 'SERVER', error.message, 500);
  await audit(req, 'payout.release', 'booking', req.params.code);
  await notify(req.body?.hostId, 'payout.released', { code: req.params.code });
  ok(res, { code: req.params.code, payoutHeld: false });
}));

// Feature flags — dev/release ops toggle product features live
app.get('/v1/ops/feature-flags', authStaff('ops_manager'), wrap(async (req, res) => {
  const { data, error } = await sb.from('feature_flags').select('*').order('label');
  if (error) return ok(res, { items: [], note: 'run migration-005' });
  ok(res, { items: data || [] });
}));
app.post('/v1/ops/feature-flags/:id/toggle', authStaff('ops_manager'), wrap(async (req, res) => {
  const f = await one('feature_flags', { id: req.params.id });
  if (!f) return err(res, 'NOTFOUND', 'flag not found', 404);
  await sb.from('feature_flags').update({ enabled: !f.enabled }).eq('id', req.params.id);
  await audit(req, 'feature.toggle', 'feature_flags', req.params.id);
  ok(res, { id: req.params.id, enabled: !f.enabled });
}));

// Fraud scan — derive risk flags from data (e.g. heavy cancellations)
app.post('/v1/ops/risk-flags/scan', authStaff('trust_safety'), wrap(async (req, res) => {
  let created = 0;
  try {
    const { data: bks } = await sb.from('bookings').select('guest_id,status');
    const cancels = {};
    (bks || []).forEach((b) => { if (b.status === 'cancelled' && b.guest_id) cancels[b.guest_id] = (cancels[b.guest_id] || 0) + 1; });
    for (const [uid, n] of Object.entries(cancels)) {
      if (n >= 3) {
        const exists = await one('risk_flags', { user_id: uid, kind: 'high_cancellations' });
        if (!exists) { await insertRow('risk_flags', { user_id: uid, subject: 'Guest', kind: 'high_cancellations', severity: 'medium', detail: `${n} cancelled bookings` }); created++; }
      }
    }
  } catch { /* table missing → run migration-005 */ }
  await audit(req, 'risk.scan', 'risk_flags', 'batch');
  ok(res, { created });
}));

// Guest verification — identities tagged NEW vs EXISTING (progressive KYC)
app.get('/v1/ops/verification', authStaff('kyc_reviewer', 'trust_safety'), wrap(async (req, res) => {
  const { data: ids } = await sb.from('identities').select('user_id,legal_name,id_type,status');
  const uids = (ids || []).map((i) => i.user_id);
  const usersById = {};
  if (uids.length) { const { data: us } = await sb.from('users').select('id,name,phone,created_at').in('id', uids); (us || []).forEach((u) => { usersById[u.id] = u; }); }
  const NEW_DAYS = 14;
  const items = (ids || []).map((i) => {
    const u = usersById[i.user_id] || {};
    const ageDays = u.created_at ? (Date.now() - new Date(u.created_at).getTime()) / 86400000 : 999;
    return { userId: i.user_id, name: i.legal_name || u.name || 'User', idType: i.id_type, status: i.status, tier: ageDays <= NEW_DAYS ? 'new' : 'existing' };
  });
  ok(res, { items });
}));

// 360 view — everything about one user/host on one screen
app.get('/v1/ops/users/:id/360', authStaff('trust_safety', 'support', 'ops_manager', 'kyc_reviewer'), wrap(async (req, res) => {
  const id = req.params.id;
  await audit(req, 'identity.viewed', 'user', id); // accountability: who looked at this person's data
  const user = await one('users', { id });
  const identity = await one('identities', { user_id: id }).catch(() => null);
  const bookings = await rows('bookings', { guest_id: id }).catch(() => []);
  const listings = await rows('listings', { host_id: id }).catch(() => []);
  const riskFlags = await rows('risk_flags', { user_id: id }).catch(() => []);
  ok(res, { user, identity, bookings, listings, riskFlags });
}));

// Register a device push token (Expo) so notify() can also push to the phone.
app.post('/v1/push/register', authUser, wrap(async (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return err(res, 'BAD', 'token required', 400);
  await sb.from('users').update({ push_token: token }).eq('id', req.auth.sub).then(() => {}, () => {});
  ok(res, { registered: true });
}));

// Host payout onboarding — start a connected payout account (Stripe/Razorpay/sim).
app.post('/v1/payout-account/connect', authUser, wrap(async (req, res) => {
  const acct = await payments.connectAccount({ id: req.auth.sub });
  await sb.from('users').update({ payout_account_id: acct.accountId, payouts_enabled: acct.enabled }).eq('id', req.auth.sub).then(() => {}, () => {});
  ok(res, { accountId: acct.accountId, onboardingUrl: acct.onboardingUrl, payoutsEnabled: acct.enabled, provider: payments.PROVIDER });
}));

// Public feature flags — the guest + host apps read these to turn features
// on/off live (Ops toggles them in /ops/feature-flags). Returns { key: bool }.
app.get('/v1/feature-flags', wrap(async (req, res) => {
  try {
    const { data } = await sb.from('feature_flags').select('key,enabled');
    const map = {};
    (data || []).forEach((f) => { map[f.key] = !!f.enabled; });
    ok(res, { flags: map });
  } catch { ok(res, { flags: {} }); }
}));

// =========================================================================
// OPS v3 — settlements, satisfaction, dev requests, step-up PIN
// =========================================================================
opsModule('dev-requests', 'dev_requests', ['ops_manager', 'analyst'], {
  onCreate: async (row, req) => { await audit(req, 'devrequest.filed', 'dev_requests', row.id, { title: row.title, kind: row.kind }); /* → dev team queue */ },
});

// Settlements — per-stay money truth: guest paid → host earns → host receives.
app.get('/v1/ops/settlements', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { data: bks } = await sb.from('bookings').select('*');
  const items = (bks || []).filter((b) => ['confirmed', 'completed'].includes(b.status)).map((b) => {
    const subtotal = b.subtotal_usd || 0, cleaning = b.cleaning_usd || 0, taxes = b.taxes_usd || 0;
    const guestPaid = b.total_usd || subtotal + cleaning + taxes;
    const hostEarns = subtotal + cleaning;          // 0% platform fee → host keeps 100%
    const processorFee = Math.round((guestPaid * 0.029 + 0.30) * 100) / 100; // est. (guest covers)
    const payout = b.payout_held ? 'on-hold' : (b.payout_paid || b.status === 'completed' ? 'paid' : 'scheduled');
    return { code: b.code, listing: b.listing_title, guestPaidUSD: guestPaid, taxesUSD: taxes, cleaningUSD: cleaning,
      hostEarnsUSD: hostEarns, processorFeeUSD: processorFee, hostReceivesUSD: hostEarns, payout };
  });
  const totals = items.reduce((a, x) => ({ gmv: a.gmv + x.guestPaidUSD, payouts: a.payouts + x.hostReceivesUSD, taxes: a.taxes + x.taxesUSD }), { gmv: 0, payouts: 0, taxes: 0 });
  ok(res, { items, totals });
}));

// Satisfaction — host-side & guest-side health from real ratings/reviews.
app.get('/v1/ops/satisfaction', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
  const { data: listings } = await sb.from('listings').select('rating_avg,rating_count,status');
  const { data: reviews } = await sb.from('reviews').select('rating');
  const rated = (listings || []).filter((l) => (l.rating_count || 0) > 0);
  const hostAvg = rated.length ? rated.reduce((s, l) => s + (l.rating_avg || 0), 0) / rated.length : 0;
  const greatHosts = rated.filter((l) => (l.rating_avg || 0) >= 4.5).length;
  const total = (reviews || []).length;
  const guestAvg = total ? reviews.reduce((s, r) => s + (r.rating || 0), 0) / total : 0;
  ok(res, { items: [
    { id: 's1', label: 'Host satisfaction (avg rating)', value: hostAvg.toFixed(2) },
    { id: 's2', label: 'Hosts rated 4.5+', value: `${greatHosts}/${rated.length}` },
    { id: 's3', label: 'Guest satisfaction (avg review)', value: guestAvg.toFixed(2) },
    { id: 's4', label: 'Total reviews', value: String(total) },
    { id: 's5', label: 'Published stays', value: String((listings || []).filter((l) => l.status === 'published').length) },
  ] });
}));

// Step-up auth — re-confirm a PIN before opening a sensitive box. Checks the
// staff member's OWN pin first (if set), else the shared/default PIN.
app.post('/v1/ops/step-up', authStaff(), wrap(async (req, res) => {
  const pin = String(req.body?.pin || '');
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  let good;
  if (me && me.totp_enabled && me.totp_secret && /^\d{6}$/.test(pin)) good = totp.verify(me.totp_secret, pin); // 2FA code
  else good = (me && me.pin) ? pin === me.pin : pin === (process.env.OPS_STEPUP_PIN || '2468');             // PIN
  await audit(req, good ? 'stepup.ok' : 'stepup.fail', 'module', req.body?.module || '');
  if (!good) return err(res, 'PIN', 'Incorrect code', 401);
  ok(res, { unlocked: true, factor: (me && me.totp_enabled) ? '2fa' : 'pin' });
}));

// 2FA (TOTP) — enroll returns an otpauth:// URL to scan; verify turns it on.
app.post('/v1/ops/2fa/enroll', authStaff(), wrap(async (req, res) => {
  const secret = totp.generateSecret();
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  const { error } = await sb.from('staff').update({ totp_secret: secret, totp_enabled: false }).eq('id', req.auth.sub);
  if (error) return err(res, 'SERVER', /totp/.test(error.message || '') ? 'Run migration-010' : error.message, 500);
  ok(res, { secret, otpauth: totp.otpauthURL(secret, me?.email || 'staff') });
}));
app.post('/v1/ops/2fa/verify', authStaff(), wrap(async (req, res) => {
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  if (!me?.totp_secret) return err(res, '2FA', 'Enroll first', 400);
  if (!totp.verify(me.totp_secret, String(req.body?.code || ''))) return err(res, '2FA', 'Invalid code', 401);
  await sb.from('staff').update({ totp_enabled: true }).eq('id', req.auth.sub);
  await audit(req, '2fa.enabled', 'staff', req.auth.sub);
  ok(res, { enabled: true });
}));

// Full listing detail for review — address, location, photos, amenities, host.
app.get('/v1/ops/listings/:id/detail', authStaff('content_mod', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
  const l = await one('listings', { id: req.params.id });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  const host = l.host_id ? await one('users', { id: l.host_id }).catch(() => null) : null;
  await audit(req, 'listing.viewed', 'listing', l.id);
  ok(res, {
    id: l.id, title: l.title, type: l.type, status: l.status, description: l.description,
    address: l.address, city: l.city, country: l.country, lat: l.lat, lng: l.lng,
    priceUSD: l.price_usd, guests: l.guests, bedrooms: l.bedrooms, beds: l.beds, baths: l.bathrooms,
    amenities: l.amenities || [], highlights: l.highlights || [],
    houseRules: (l.extra && (l.extra.houseRules || l.extra.house_rules)) || [],
    photos: l.images || [], hostName: host?.name || l.host_name || 'Host', hostId: l.host_id, hostPhone: host?.phone || null, instantBook: !!l.instant_book,
  });
}));

// Per-host analytics — listings, ratings, bookings, revenue, payouts, occupancy.
app.get('/v1/ops/hosts/:id/analytics', authStaff('analyst', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
  const id = req.params.id;
  const listings = await rows('listings', { host_id: id }).catch(() => []);
  const { data: bks } = await sb.from('bookings').select('*').eq('host_id', id);
  const bookings = bks || [];
  const active = bookings.filter((b) => ['confirmed', 'completed'].includes(b.status));
  const rated = listings.filter((l) => (l.rating_count || 0) > 0);
  await audit(req, 'host.analytics.viewed', 'user', id);
  ok(res, {
    listings: listings.length,
    published: listings.filter((l) => l.status === 'published').length,
    avgRating: rated.length ? +(rated.reduce((s, l) => s + (l.rating_avg || 0), 0) / rated.length).toFixed(2) : 0,
    totalReviews: listings.reduce((s, l) => s + (l.rating_count || 0), 0),
    bookings: bookings.length,
    nightsBooked: active.reduce((s, b) => s + (b.nights || 0), 0),
    revenueUSD: active.reduce((s, b) => s + ((b.subtotal_usd || 0) + (b.cleaning_usd || 0)), 0),
    payoutsUSD: bookings.filter((b) => b.payout_paid).reduce((s, b) => s + ((b.subtotal_usd || 0) + (b.cleaning_usd || 0)), 0),
  });
}));
// Each staff member sets their OWN step-up PIN.
app.post('/v1/ops/staff/set-pin', authStaff(), wrap(async (req, res) => {
  const pin = String(req.body?.pin || '');
  if (!/^\d{4,6}$/.test(pin)) return err(res, 'PIN', 'PIN must be 4–6 digits', 400);
  const { error } = await sb.from('staff').update({ pin }).eq('id', req.auth.sub);
  if (error) return err(res, 'SERVER', /pin/.test(error.message || '') ? 'Run migration-009' : error.message, 500);
  await audit(req, 'staff.set-pin', 'staff', req.auth.sub);
  ok(res, { ok: true });
}));

app.get('/', (req, res) => res.json({ service: 'StayOn backend', status: 'ok', store: 'supabase', clients: ['user', 'host', 'ops'] }));

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StayOn backend (Supabase) listening on http://localhost:${PORT}`));
