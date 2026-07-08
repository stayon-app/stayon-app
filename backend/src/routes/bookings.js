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
  listingOut,
  PROMOS,
  softWrite
} = require('../utils/helpers');

async function syncStatus(code, status) {
  const resvStatus = status === 'declined' ? 'cancelled' : status;
  await sb.from('reservations').update({ status: resvStatus }).eq('code', code);
  await sb.from('bookings').update({ status: resvStatus }).eq('code', code);
}

router.post('/bookings', authUser, wrap(async (req, res) => {
  const { listingId, checkIn, checkOut, guests, promo } = req.body || {};
  const l = await one('listings', { id: listingId });
  if (!l || l.status !== 'published') return err(res, 'NOTFOUND', 'listing not available', 404);

  // ── Integrity rules (shared by app + website — enforced once, here) ──
  // 1) Sane dates
  if (!checkIn || !checkOut || new Date(checkOut) <= new Date(checkIn)) {
    return err(res, 'DATES', 'Check-out must be after check-in.');
  }
  // 2) Capacity — matches the search rule (a 4-guest stay can't take 5)
  if (Number(guests) > (l.guests || 1)) {
    return err(res, 'GUESTS', `This stay hosts up to ${l.guests} guests.`);
  }
  // 3) One guest per stay per night — reject overlapping non-cancelled bookings
  const { data: clash } = await sb.from('bookings')
    .select('id').eq('listing_id', listingId).neq('status', 'cancelled')
    .lt('check_in', checkOut).gt('check_out', checkIn);
  if ((clash || []).length) {
    return err(res, 'UNAVAILABLE', 'Those dates were just booked — please pick different dates.', 409);
  }
  // 4) Host-blocked dates are not bookable
  const { data: blocked } = await sb.from('calendar')
    .select('day').eq('listing_id', listingId).eq('blocked', true)
    .gte('day', checkIn).lt('day', checkOut);
  if ((blocked || []).length) {
    return err(res, 'UNAVAILABLE', 'The host has blocked part of those dates.', 409);
  }

  const code = req.body.code || genCode();
  const existing = await one('bookings', { code });
  if (existing) return ok(res, { id: existing.id, code, status: existing.status, deduped: true });
  const nights = Math.max(1, Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000) || 1);
  const nightly = nightlyForGuestsRow(l, Number(guests) || (l.extra?.baseGuests || 1));
  let subtotal = nightly * nights;
  const cleaning = l.cleaning_fee_usd || 0;

  // Promo redemption — validated server-side for every client.
  let discount = 0, promoApplied = null;
  if (promo) {
    const pdef = PROMOS[String(promo).trim().toUpperCase()];
    if (!pdef) return err(res, 'PROMO', 'That promo code is not valid.');
    if (pdef.firstOnly) {
      const { data: prior } = await sb.from('bookings')
        .select('id').eq('guest_id', req.auth.sub).neq('status', 'cancelled').limit(1);
      if ((prior || []).length) return err(res, 'PROMO', `${pdef.code} is only valid on your first booking.`);
    }
    discount = Math.round(subtotal * (pdef.pct / 100));
    subtotal -= discount;
    promoApplied = { code: pdef.code, pct: pdef.pct, discountUSD: discount };
  }

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

  // Race guard: two guests can pass the pre-check simultaneously. After our
  // insert, re-check; if another overlapping booking exists and was created
  // FIRST, roll ours back and 409. (db/live-hardening.sql adds the hard
  // exclusion constraint that makes this impossible at the database level.)
  const { data: rc } = await sb.from('bookings')
    .select('id,created_at').eq('listing_id', listingId).neq('status', 'cancelled')
    .lt('check_in', checkOut).gt('check_out', checkIn).neq('id', booking.id);
  if ((rc || []).some((o) => new Date(o.created_at) <= new Date(booking.created_at))) {
    await sb.from('bookings').update({ status: 'cancelled' }).eq('id', booking.id);
    await sb.from('reservations').update({ status: 'cancelled' }).eq('code', code);
    return err(res, 'UNAVAILABLE', 'Those dates were just booked by someone else — please pick different dates.', 409);
  }
  let pay = { status: 'held' };
  let intentId = null, intentStatus = 'held';
  try {
    const intent = await payments.createIntent(booking);
    intentId = intent.intentId; intentStatus = intent.status;
    await sb.from('bookings').update({ payment_intent_id: intent.intentId, payment_status: intent.status }).eq('id', booking.id);
    pay = { status: intent.status, clientSecret: intent.clientSecret, provider: payments.PROVIDER };
  } catch { /* escrow tracked via status */ }
  // v2: normalized payment record (guarded no-op until migration-013 adds the table)
  await softWrite(() => sb.from('payments').insert({
    booking_id: booking.id, booking_code: code, user_id: req.auth.sub, kind: 'charge',
    amount_usd: total, currency: 'USD', provider: payments.PROVIDER,
    provider_intent_id: intentId, status: intentStatus,
  }));
  await notify(l.host_id, l.instant_book ? 'booking.confirmed' : 'booking.request', { code });
  ok(res, { id: booking.id, code, status, payment: pay, promo: promoApplied });
}));

router.get('/bookings', authUser, wrap(async (req, res) => {
  const items = (await rows('bookings', { guest_id: req.auth.sub })).map(bookingOut);
  // Post-booking reveal: once a booking is active (not cancelled), the guest
  // gets the listing's exact address — the only place it is ever exposed.
  const ids = [...new Set(items.filter((b) => b.status !== 'cancelled').map((b) => b.listingId))];
  if (ids.length) {
    const { data: ls } = await sb.from('listings').select('id,address,zipcode,city,state,country,lat,lng').in('id', ids);
    const byId = new Map((ls || []).map((l) => [l.id, l]));
    for (const b of items) {
      const l = b.status !== 'cancelled' ? byId.get(b.listingId) : null;
      if (l) b.stayAddress = {
        address: l.address, zipcode: l.zipcode,
        city: l.city, state: l.state, country: l.country,
        lat: l.lat, lng: l.lng,
      };
    }
  }
  ok(res, { items });
}));

router.get('/reservations', authUser, wrap(async (req, res) =>
  ok(res, { items: (await rows('reservations', { host_id: req.auth.sub })).map(resvOut) })));

const ACT = { accept: 'confirmed', decline: 'cancelled', checkin: 'confirmed', checkout: 'completed' };
router.post('/reservations/:id/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  const r = await one('reservations', { id: req.params.id });
  if (!r) return err(res, 'NOTFOUND', 'reservation not found', 404);
  // Only the listing's host may act on their reservation.
  if (r.host_id !== req.auth.sub) return err(res, 'FORBIDDEN', 'not your reservation', 403);
  await syncStatus(r.code, status);
  await notify(r.guest_id, `booking.${req.params.action}`, { code: r.code });
  ok(res, { code: r.code, status: status === 'decline' ? 'cancelled' : status });
}));

router.post('/reservations/by-code/:code/:action', authUser, wrap(async (req, res) => {
  const status = ACT[req.params.action];
  if (!status) return err(res, 'ACTION', 'unknown action');
  const r = await one('reservations', { code: req.params.code });
  if (!r) return err(res, 'NOTFOUND', 'no reservation', 404);
  // Only the listing's host may act on their reservation.
  if (r.host_id !== req.auth.sub) return err(res, 'FORBIDDEN', 'not your reservation', 403);
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
  const b = await one('bookings', { code: req.params.code });
  if (!b) return err(res, 'NOTFOUND', 'no booking', 404);
  // Only the booking's guest or the listing's host may cancel it.
  if (b.guest_id !== req.auth.sub && b.host_id !== req.auth.sub) {
    return err(res, 'FORBIDDEN', 'not your booking', 403);
  }
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
