const express = require('express');
const router = express.Router();
const { authUser } = require('../auth');
const payments = require('../payments');
const {
  sb,
  insertRow,
  updateByMatch,
  rows,
  one,
  wrap,
  ok,
  err,
  TAX_RATE,
  genCode,
  nightlyForGuestsRow,
  notify,
  bookingOut,
  resvOut,
  listingOut
} = require('../utils/helpers');

async function syncStatus(code, status) {
  const resvStatus = status === 'declined' ? 'cancelled' : status;
  await sb.from('reservations').update({ status: resvStatus }).eq('code', code);
  await sb.from('bookings').update({ status: resvStatus }).eq('code', code);
}

router.post('/bookings', authUser, wrap(async (req, res) => {
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
  let pay = { status: 'held' };
  try {
    const intent = await payments.createIntent(booking);
    await sb.from('bookings').update({ payment_intent_id: intent.intentId, payment_status: intent.status }).eq('id', booking.id);
    pay = { status: intent.status, clientSecret: intent.clientSecret, provider: payments.PROVIDER };
  } catch { /* escrow tracked via status */ }
  await notify(l.host_id, l.instant_book ? 'booking.confirmed' : 'booking.request', { code });
  ok(res, { id: booking.id, code, status, payment: pay });
}));

router.get('/bookings', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('bookings', { guest_id: req.auth.sub })).map(bookingOut) })));

router.get('/reservations', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('reservations', { host_id: req.auth.sub })).map(resvOut) })));

const ACT = { accept: 'confirmed', decline: 'cancelled', checkin: 'confirmed', checkout: 'completed' };
router.post('/reservations/:id/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  const r = await one('reservations', { id: req.params.id });
  if (!r) return err(res, 'NOTFOUND', 'reservation not found', 404);
  await syncStatus(r.code, status);
  await notify(r.guest_id, `booking.${req.params.action}`, { code: r.code });
  ok(res, { code: r.code, status: status === 'decline' ? 'cancelled' : status });
}));

router.post('/reservations/by-code/:code/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  if (!(await one('reservations', { code: req.params.code }))) return err(res, 'NOTFOUND', 'no reservation', 404);
  await syncStatus(req.params.code, status);
  ok(res, { code: req.params.code, status });
}));

router.post('/bookings/:id/cancel', authUser, wrap(async (req, res) => {
  const b = await one('bookings', { id: req.params.id, guest_id: req.auth.sub });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  await syncStatus(b.code, 'cancelled');
  const refund = Math.max(0, (b.total_usd || 0) - (b.taxes_usd || 0));
  await sb.from('bookings').update({ refund_usd: refund }).eq('id', b.id);
  await notify(b.host_id, 'booking.cancelled', { code: b.code });
  ok(res, { status: 'cancelled', refundUSD: refund, taxesWithheldUSD: b.taxes_usd });
}));

router.post('/bookings/by-code/:code/cancel', authUser, wrap(async (req, res) => {
  if (!(await one('bookings', { code: req.params.code }))) return err(res, 'NOTFOUND', 'no booking', 404);
  await syncStatus(req.params.code, 'cancelled');
  ok(res, { code: req.params.code, status: 'cancelled' });
}));

router.get('/listings/:id/calendar', wrap(async (req, res) => {
  const { data, error } = await sb.from('calendar').select('*').eq('listing_id', req.params.id);
  if (error) throw error;
  ok(res, { items: (data || []).map((c) => ({ day: c.day, priceUSD: c.price_usd, blocked: c.blocked })) });
}));

router.put('/listings/:id/calendar', authUser, wrap(async (req, res) => {
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

router.put('/listings/:id/pricing', authUser, wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id, host_id: req.auth.sub }, {
    price_usd: req.body.priceUSD, weekend_price_usd: req.body.weekendPriceUSD, cleaning_fee_usd: req.body.cleaningFeeUSD,
  });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  ok(res, listingOut(upd[0]));
}));

module.exports = router;
