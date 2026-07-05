const crypto = require('crypto');
const { supabase } = require('../supabase');

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

const genCode = () => {
  const s = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += s[crypto.randomInt(s.length)];
  return `STY-${c}`;
};

const TAX_RATE = 0.12;
const PLATFORM_FEE = 0;

const ok = (res, body) => res.json(body);

const err = (res, code, message, status = 400) =>
  res.status(status).json({ error: { code, message } });

const hasContact = (t) => /[\w.+-]+@[\w-]+\.[\w.-]+/.test(t) || /(\+?\d[\s-]?){7,}/.test(t);

// Haversine distance in km
function distKm(aLat, aLng, bLat, bLng) {
  const R = 6371;
  const toR = (x) => (x * Math.PI) / 180;
  const dLat = toR(bLat - aLat);
  const dLng = toR(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(toR(aLat)) * Math.cos(toR(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

// Notify and send best-effort Expo push
async function notify(userId, type, payload) {
  try { await insertRow('notifications', { user_id: userId, type, payload }); } catch {}
  sendPush(userId, pushTitle(type), pushBody(type, payload));
}

async function sendPush(userId, title, body) {
  try {
    if (!userId) return;
    const u = await one('users', { id: userId });
    if (!u || !u.push_token) return;
    await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ to: u.push_token, title, body, sound: 'default' }),
    });
  } catch { /* push is best-effort */ }
}

function pushTitle(type) {
  const m = {
    'booking.request': 'New booking request',
    'booking.confirmed': 'Booking confirmed',
    'payout.sent': 'Payout sent',
    'payout.held': 'Payout on hold',
    'payout.released': 'Payout released',
    'refund.issued': 'Refund issued',
    'kyc.verified': 'Identity verified',
    'kyc.rejected': 'Identity needs attention',
  };
  return m[type] || 'StayOn';
}

function pushBody(type, p) {
  if (p && p.code) return `Booking ${p.code}${p.amount ? ' · $' + p.amount : ''}`;
  return 'Open StayOn for details.';
}

async function audit(req, action, target_type, target_id, meta) {
  try {
    await insertRow('audit_log', {
      actor_id: req.auth?.sub,
      action,
      target_type,
      target_id: String(target_id),
      meta,
    });
  } catch {}
}

const wrap = (fn) => (req, res) =>
  fn(req, res).catch((e) => err(res, e.code || 'SERVER', e.message || 'error', 500));

// Output mappers (snake_case DB → camelCase API)
const userOut = (r) => r && ({
  id: r.id,
  phone: r.phone,
  email: r.email,
  name: r.name,
  avatarUrl: r.avatar_url,
  countryCode: r.country_code,
  status: r.status,
  createdAt: r.created_at,
});

const listingOut = (r) => r && ({
  id: r.id,
  hostId: r.host_id,
  hostName: r.host_name,
  title: r.title,
  type: r.type,
  placeType: r.place_type,
  description: r.description,
  address: r.address,
  city: r.city,
  state: r.state,
  country: r.country,
  zipcode: r.zipcode,
  lat: r.lat,
  lng: r.lng,
  guests: r.guests,
  bedrooms: r.bedrooms,
  beds: r.beds,
  bathrooms: r.bathrooms,
  priceUSD: r.price_usd,
  weekendPriceUSD: r.weekend_price_usd,
  cleaningFeeUSD: r.cleaning_fee_usd,
  currency: r.currency,
  images: r.images || [],
  videos: r.videos || [],
  amenities: r.amenities || [],
  vibes: r.vibes || [],
  highlights: r.highlights || [],
  instantBook: r.instant_book,
  status: r.status,
  ratingAvg: r.rating_avg,
  ratingCount: r.rating_count,
  createdAt: r.created_at,
  houseRules: r.extra?.houseRules,
  petsAllowed: r.extra?.petsAllowed,
  cancellation: r.extra?.cancellation,
  checkIn: r.extra?.checkIn,
  checkOut: r.extra?.checkOut,
  minNights: r.extra?.minNights,
  safety: r.extra?.safety || [],
  baseGuests: r.extra?.baseGuests || 1,
  extraGuestPct: r.extra?.extraGuestPct || 0,
  hostLanguages: r.extra?.languages || [],
});

// PUBLIC shape (search + unauthenticated listing detail): the exact address
// stays private until a guest has booked. Street/zip are stripped and the
// coordinates are rounded (~100 m) so guests see the AREA, never the door.
const publicListingOut = (r) => {
  const l = listingOut(r);
  if (!l) return l;
  const { address, zipcode, ...pub } = l;
  if (pub.lat != null) pub.lat = Math.round(pub.lat * 1000) / 1000;
  if (pub.lng != null) pub.lng = Math.round(pub.lng * 1000) / 1000;
  return pub;
};

function extraGuestsCount(baseGuests, maxGuests, guests) {
  const baseG = baseGuests || 1;
  const maxG = maxGuests || baseG;
  return Math.min(Math.max(0, (Number(guests) || 0) - baseG), Math.max(0, maxG - baseG));
}

function effectiveNightly(l, guests) {
  const extras = extraGuestsCount(l.baseGuests, l.guests, guests);
  return Math.round((l.priceUSD || 0) * (1 + ((l.extraGuestPct || 0) / 100) * extras));
}

function nightlyForGuestsRow(row, guests) {
  const extras = extraGuestsCount(row.extra?.baseGuests, row.guests, guests || row.extra?.baseGuests);
  return Math.round((row.price_usd || 0) * (1 + ((row.extra?.extraGuestPct || 0) / 100) * extras));
}

// Promo codes — single source of truth for every client (apps + websites).
// firstOnly promos are enforced at booking time against the guest's history.
const PROMOS = {
  STAYON10: { code: 'STAYON10', pct: 10, label: '10% off your first booking', firstOnly: true },
};

const bookingOut = (r) => r && ({
  id: r.id,
  code: r.code,
  listingId: r.listing_id,
  listingTitle: r.listing_title,
  guestId: r.guest_id,
  guestName: r.guest_name,
  hostId: r.host_id,
  checkIn: r.check_in,
  checkOut: r.check_out,
  nights: r.nights,
  guests: r.guests,
  subtotalUSD: r.subtotal_usd,
  cleaningUSD: r.cleaning_usd,
  taxesUSD: r.taxes_usd,
  platformFeeUSD: r.platform_fee_usd,
  totalUSD: r.total_usd,
  status: r.status,
  refundUSD: r.refund_usd,
  createdAt: r.created_at,
});

const resvOut = (r) => r && ({
  id: r.id,
  code: r.code,
  listingId: r.listing_id,
  listingTitle: r.listing_title,
  hostId: r.host_id,
  guestId: r.guest_id,
  guestName: r.guest_name,
  checkIn: r.check_in,
  checkOut: r.check_out,
  nights: r.nights,
  rateUSD: r.rate_usd,
  status: r.status,
  instant: r.instant,
  createdAt: r.created_at,
});

const msgOut = (r) => ({
  id: r.id,
  sender: r.sender,
  text: r.text,
  createdAt: r.created_at,
});

const reviewOut = (r) => ({
  id: r.id,
  listingId: r.listing_id,
  authorName: r.author_name,
  direction: r.direction,
  rating: r.rating,
  text: r.text,
  response: r.response,
  createdAt: r.created_at,
});

module.exports = {
  sb,
  insertRow,
  updateByMatch,
  rows,
  one,
  now,
  genCode,
  TAX_RATE,
  PLATFORM_FEE,
  ok,
  err,
  hasContact,
  distKm,
  notify,
  sendPush,
  audit,
  wrap,
  userOut,
  listingOut,
  publicListingOut,
  PROMOS,
  extraGuestsCount,
  effectiveNightly,
  nightlyForGuestsRow,
  bookingOut,
  resvOut,
  msgOut,
  reviewOut,
};
