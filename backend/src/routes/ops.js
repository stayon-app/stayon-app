const express = require('express');
const router = express.Router();
const { authStaff } = require('../auth');
const totp = require('../totp');
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
  listingOut,
  bookingOut,
  reviewOut,
  audit,
  notify,
  now
} = require('../utils/helpers');

// Helper to define standard CRUD ops endpoints dynamically
function opsModule(slug, table, roles, hooks = {}) {
  router.get(`/${slug}`, authStaff(...roles), wrap(async (req, res) => {
    const { data, error } = await sb.from(table).select('*').order('created_at', { ascending: false }).limit(300);
    if (error) return ok(res, { items: [], note: 'run migration-004' });
    ok(res, { items: data || [] });
  }));

  router.post(`/${slug}`, authStaff(...roles), wrap(async (req, res) => {
    const row = await insertRow(table, req.body || {});
    await audit(req, `${slug}.create`, slug, row.id);
    if (hooks.onCreate) await hooks.onCreate(row, req);
    ok(res, row);
  }));

  router.post(`/${slug}/:id/:action`, authStaff(...roles), wrap(async (req, res) => {
    const { id, action } = req.params;
    // Default: set `status` to the action name. Modules whose action maps to a
    // different column (e.g. markets → `enabled` boolean) supply a patch(action) hook.
    const base = hooks.patch ? hooks.patch(action) : { status: action };
    const patch = { ...base, ...(req.body && typeof req.body === 'object' ? req.body : {}) };
    const { error } = await sb.from(table).update(patch).eq('id', id);
    if (error) throw error;
    await audit(req, `${slug}.${action}`, slug, id);
    if (hooks.onAction) await hooks.onAction(id, action, req);
    ok(res, { id, ...patch });
  }));
}

// Quietly set/clear a payout hold (ignores missing column pre-migration-007).
async function setPayoutHold(code, held, reason) {
  if (!code) return;
  try {
    await sb.from('bookings').update({
      payout_held: held,
      hold_reason: held ? (reason || 'open dispute') : null
    }).eq('code', code);
  } catch { /* migration-007 not run */ }
}

async function syncStatus(code, status) {
  const resvStatus = status === 'declined' ? 'cancelled' : status;
  await sb.from('reservations').update({ status: resvStatus }).eq('code', code);
  await sb.from('bookings').update({ status: resvStatus }).eq('code', code);
}

// Standard Dynamic Ops Modules
opsModule('tickets', 'tickets', ['support', 'ops_manager']);
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
opsModule('markets', 'markets', ['compliance', 'ops_manager'], {
  patch: (action) => ({ enabled: action === 'enabled' }),
});
opsModule('partners', 'partners', ['ops_manager']);
opsModule('field-tasks', 'field_tasks', ['ops_manager']);
opsModule('region-rules', 'region_rules', ['compliance']);
opsModule('risk-flags', 'risk_flags', ['trust_safety', 'finance']);
opsModule('maintenance', 'maintenance', ['ops_manager']);
opsModule('incidents', 'incidents', ['ops_manager']);
opsModule('bank-accounts', 'bank_accounts', ['finance']);
opsModule('dev-requests', 'dev_requests', ['ops_manager', 'analyst'], {
  onCreate: async (row, req) => { await audit(req, 'devrequest.filed', 'dev_requests', row.id, { title: row.title, kind: row.kind }); },
});

// Queues & moderation endpoints
router.get('/queues/listings', authStaff('content_mod'), wrap(async (req, res) =>
  ok(res, { items: (await rows('listings', { status: 'pending_review' })).map(listingOut) })));

router.post('/listings/:id/approve', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id }, { status: 'published' });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  await audit(req, 'listing.approve', 'listing', req.params.id);
  await notify(upd[0].host_id, 'listing.approved', { id: req.params.id });
  ok(res, { id: req.params.id, status: 'published' });
}));

router.post('/listings/:id/reject', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('listings', { id: req.params.id }, { status: 'rejected', reject_reason: req.body.reason });
  if (!upd.length) return err(res, 'NOTFOUND', 'listing not found', 404);
  await audit(req, 'listing.reject', 'listing', req.params.id, { reason: req.body.reason });
  await notify(upd[0].host_id, 'listing.rejected', { id: req.params.id, reason: req.body.reason });
  ok(res, { id: req.params.id, status: 'rejected' });
}));

router.get('/queues/kyc', authStaff('kyc_reviewer'), wrap(async (req, res) =>
  ok(res, { items: await rows('identities', { status: 'pending' }) })));

router.post('/kyc/:userId/:decision', authStaff('kyc_reviewer'), wrap(async (req, res) => {
  const verified = req.params.decision === 'approve' || req.params.decision === 'verify';
  const status = verified ? 'verified' : 'rejected';
  const reason = req.body?.reason || null;
  await updateByMatch('identities', { user_id: req.params.userId }, { status, reviewed_at: now() });
  await audit(req, 'kyc.' + (verified ? 'verify' : 'reject'), 'identity', req.params.userId, { reason });
  await notify(req.params.userId, 'kyc.' + status, { reason });
  ok(res, { status });
}));

router.get('/queues/reels', authStaff('content_mod'), wrap(async (req, res) =>
  ok(res, { items: await rows('reels', { status: 'pending' }) })));

router.post('/reels/:id/:decision', authStaff('content_mod'), wrap(async (req, res) => {
  const status = req.params.decision === 'approve' ? 'live' : 'rejected';
  await updateByMatch('reels', { id: req.params.id }, { status });
  await audit(req, 'reel.' + req.params.decision, 'reel', req.params.id);
  ok(res, { id: req.params.id, status });
}));

router.get('/queues/payout-changes', authStaff('finance'), wrap(async (req, res) =>
  ok(res, { items: await rows('payout_change_requests', { status: 'pending' }) })));

router.post('/payout-changes/:id/:decision', authStaff('finance'), wrap(async (req, res) => {
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

router.get('/reports', authStaff('trust_safety'), wrap(async (req, res) =>
  ok(res, { items: await rows('reports', { status: 'open' }) })));

router.post('/reports/:id/resolve', authStaff('trust_safety'), wrap(async (req, res) => {
  const upd = await updateByMatch('reports', { id: req.params.id }, { status: 'resolved', resolution: req.body.resolution });
  if (!upd.length) return err(res, 'NOTFOUND', 'report not found', 404);
  await audit(req, 'report.resolve', 'report', req.params.id);
  ok(res, { id: req.params.id, status: 'resolved' });
}));

// Oversight
router.get('/bookings', authStaff('ops_manager'), wrap(async (req, res) => {
  const { data } = await sb.from('bookings').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: (data || []).map(bookingOut) });
}));

router.post('/bookings/:code/force-cancel', authStaff('ops_manager'), wrap(async (req, res) => {
  if (!(await one('bookings', { code: req.params.code }))) return err(res, 'NOTFOUND', 'booking not found', 404);
  await syncStatus(req.params.code, 'cancelled');
  await audit(req, 'booking.force-cancel', 'booking', req.params.code);
  ok(res, { code: req.params.code, status: 'cancelled' });
}));

router.post('/refunds', authStaff('finance'), wrap(async (req, res) => {
  const b = await one('bookings', { code: req.body.bookingCode });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  const amount = req.body.amountUSD ?? Math.max(0, (b.total_usd || 0) - (b.taxes_usd || 0));
  const re = await payments.refund(b, amount);
  await sb.from('bookings').update({ refund_usd: amount, payment_status: 'refunded' }).eq('id', b.id).then(() => {}, () => sb.from('bookings').update({ refund_usd: amount }).eq('id', b.id));
  await audit(req, 'refund', 'booking', b.code, { amount, refundId: re.refundId });
  await notify(b.guest_id, 'refund.issued', { code: b.code, amount });
  ok(res, { code: b.code, refundUSD: amount, refundId: re.refundId });
}));

router.get('/reviews', authStaff('content_mod'), wrap(async (req, res) => {
  const { data } = await sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: (data || []).map(reviewOut) });
}));

router.post('/reviews/:id/remove', authStaff('content_mod'), wrap(async (req, res) => {
  const upd = await updateByMatch('reviews', { id: req.params.id }, { removed: true });
  if (!upd.length) return err(res, 'NOTFOUND', 'review not found', 404);
  const lId = upd[0].listing_id;
  const rs = (await rows('reviews', { listing_id: lId })).filter((r) => !r.removed);
  await sb.from('listings').update({ rating_count: rs.length, rating_avg: rs.length ? Math.round((rs.reduce((s, r) => s + r.rating, 0) / rs.length) * 10) / 10 : 0 }).eq('id', lId);
  await audit(req, 'review.remove', 'review', req.params.id);
  ok(res, { id: req.params.id, removed: true });
}));

router.get('/users', authStaff('trust_safety'), wrap(async (req, res) => ok(res, { items: await rows('users') })));

router.post('/users/:id/:action', authStaff('trust_safety'), wrap(async (req, res) => {
  const map = { suspend: 'suspended', ban: 'banned', reinstate: 'active' };
  const upd = await updateByMatch('users', { id: req.params.id }, { status: map[req.params.action] });
  if (!upd.length) return err(res, 'NOTFOUND', 'user not found', 404);
  await audit(req, 'user.' + req.params.action, 'user', req.params.id);
  ok(res, { id: req.params.id, status: map[req.params.action] });
}));

router.get('/dashboard', authStaff(), wrap(async (req, res) => {
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

router.get('/audit', authStaff('compliance'), wrap(async (req, res) => {
  const { data } = await sb.from('audit_log').select('*').order('created_at', { ascending: false }).limit(200);
  ok(res, { items: data || [] });
}));

router.get('/qa/scorecards', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
  const { data: listings } = await sb.from('listings').select('host_id,host_name,rating_avg,rating_count,status');
  const byHost = {};
  (listings || []).forEach((l) => {
    const h = byHost[l.host_id] || (byHost[l.host_id] = { host: l.host_name || 'Host', listings: 0, published: 0, rating: 0, reviews: 0 });
    h.listings++; if (l.status === 'published') h.published++;
    h.rating = Math.max(h.rating, l.rating_avg || 0); h.reviews += l.rating_count || 0;
  });
  ok(res, { items: Object.values(byHost).sort((a, b) => b.reviews - a.reviews) });
}));

router.get('/qa/insights', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
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

router.get('/hosts', authStaff('ops_manager', 'trust_safety', 'analyst'), wrap(async (req, res) => {
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

router.get('/guests', authStaff('ops_manager', 'trust_safety', 'support'), wrap(async (req, res) => {
  const { data: users } = await sb.from('users').select('id,name,phone,email,status,created_at').order('created_at', { ascending: false }).limit(300);
  const { data: bks } = await sb.from('bookings').select('guest_id');
  const counts = {};
  (bks || []).forEach((b) => { counts[b.guest_id] = (counts[b.guest_id] || 0) + 1; });
  ok(res, { items: (users || []).map((u) => ({ ...u, bookings: counts[u.id] || 0 })) });
}));

router.post('/users/:id/export', authStaff('compliance', 'ops_manager'), wrap(async (req, res) => {
  const user = await one('users', { id: req.params.id });
  const bookings = await rows('bookings', { guest_id: req.params.id });
  const identity = await one('identities', { user_id: req.params.id });
  await audit(req, 'gdpr.export', 'user', req.params.id);
  ok(res, { user, bookings, identity });
}));

router.post('/users/:id/erase', authStaff('compliance', 'ops_manager'), wrap(async (req, res) => {
  await sb.from('users').update({ name: '[erased]', phone: null, email: null }).eq('id', req.params.id);
  await audit(req, 'gdpr.erase', 'user', req.params.id);
  ok(res, { id: req.params.id, erased: true });
}));

router.get('/escrow', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { data: bks } = await sb.from('bookings').select('*');
  const today = new Date().toISOString().slice(0, 10);
  const items = (bks || []).filter((b) => b.status === 'confirmed' || b.status === 'completed').map((b) => ({
    code: b.code, hostId: b.host_id, amountUSD: (b.subtotal_usd || 0) + (b.cleaning_usd || 0),
    status: b.payout_held ? 'on-hold' : (b.payout_paid || b.status === 'completed' ? 'paid' : (b.check_in && b.check_in <= today ? 'releasable' : 'held')),
    releaseAt: b.check_in,
  }));
  ok(res, { items });
}));

router.post('/payouts/run-scheduler', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
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
        const tr = await payments.transferToHost(b, host?.payout_account_id);
        await sb.from('bookings').update({ payout_paid: true, transfer_id: tr.transferId, payment_status: 'paid' }).eq('code', b.code).then(() => {}, () => sb.from('bookings').update({ payout_paid: true }).eq('code', b.code));
        await notify(b.host_id, 'payout.sent', { code: b.code });
        paid++;
      } else waiting++;
    }
  } catch (e) { return err(res, 'SERVER', /payout_paid/.test(e.message || '') ? 'Run migration-007 to enable the scheduler.' : e.message, 500); }
  await audit(req, 'payout.scheduler.run', 'payouts', `paid=${paid}`);
  ok(res, { paid, held, waiting });
}));

router.get('/bookings/:code', authStaff('finance', 'support', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
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

router.post('/bookings/:code/hold', authStaff('finance', 'trust_safety', 'ops_manager'), wrap(async (req, res) => {
  const { error } = await sb.from('bookings').update({ payout_held: true, hold_reason: req.body?.reason || 'under review' }).eq('code', req.params.code);
  if (error) return err(res, 'SERVER', /payout_held|hold_reason/.test(error.message || '') ? 'Run migration-007 to enable payout holds.' : error.message, 500);
  await audit(req, 'payout.hold', 'booking', req.params.code);
  await notify(req.body?.hostId, 'payout.held', { code: req.params.code });
  ok(res, { code: req.params.code, payoutHeld: true });
}));

router.post('/bookings/:code/release', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { error } = await sb.from('bookings').update({ payout_held: false, hold_reason: null }).eq('code', req.params.code);
  if (error) return err(res, 'SERVER', error.message, 500);
  await audit(req, 'payout.release', 'booking', req.params.code);
  await notify(req.body?.hostId, 'payout.released', { code: req.params.code });
  ok(res, { code: req.params.code, payoutHeld: false });
}));

router.get('/feature-flags', authStaff('ops_manager'), wrap(async (req, res) => {
  const { data, error } = await sb.from('feature_flags').select('*').order('label');
  if (error) return ok(res, { items: [], note: 'run migration-005' });
  ok(res, { items: data || [] });
}));

router.post('/feature-flags/:id/toggle', authStaff('ops_manager'), wrap(async (req, res) => {
  const f = await one('feature_flags', { id: req.params.id });
  if (!f) return err(res, 'NOTFOUND', 'flag not found', 404);
  await sb.from('feature_flags').update({ enabled: !f.enabled }).eq('id', req.params.id);
  await audit(req, 'feature.toggle', 'feature_flags', req.params.id);
  ok(res, { id: req.params.id, enabled: !f.enabled });
}));

router.post('/risk-flags/scan', authStaff('trust_safety'), wrap(async (req, res) => {
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
  } catch { /* table missing */ }
  await audit(req, 'risk.scan', 'risk_flags', 'batch');
  ok(res, { created });
}));

router.get('/verification', authStaff('kyc_reviewer', 'trust_safety'), wrap(async (req, res) => {
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

router.get('/users/:id/360', authStaff('trust_safety', 'support', 'ops_manager', 'kyc_reviewer'), wrap(async (req, res) => {
  const id = req.params.id;
  await audit(req, 'identity.viewed', 'user', id);
  const user = await one('users', { id });
  const identity = await one('identities', { user_id: id }).catch(() => null);
  const bookings = await rows('bookings', { guest_id: id }).catch(() => []);
  const listings = await rows('listings', { host_id: id }).catch(() => []);
  const riskFlags = await rows('risk_flags', { user_id: id }).catch(() => []);
  ok(res, { user, identity, bookings, listings, riskFlags });
}));

router.get('/settlements', authStaff('finance', 'ops_manager'), wrap(async (req, res) => {
  const { data: bks } = await sb.from('bookings').select('*');
  const items = (bks || []).filter((b) => ['confirmed', 'completed'].includes(b.status)).map((b) => {
    const subtotal = b.subtotal_usd || 0, cleaning = b.cleaning_usd || 0, taxes = b.taxes_usd || 0;
    const guestPaid = b.total_usd || subtotal + cleaning + taxes;
    const hostEarns = subtotal + cleaning;
    const processorFee = Math.round((guestPaid * 0.029 + 0.30) * 100) / 100;
    const payout = b.payout_held ? 'on-hold' : (b.payout_paid || b.status === 'completed' ? 'paid' : 'scheduled');
    return { code: b.code, listing: b.listing_title, guestPaidUSD: guestPaid, taxesUSD: taxes, cleaningUSD: cleaning,
      hostEarnsUSD: hostEarns, processorFeeUSD: processorFee, hostReceivesUSD: hostEarns, payout };
  });
  const totals = items.reduce((a, x) => ({ gmv: a.gmv + x.guestPaidUSD, payouts: a.payouts + x.hostReceivesUSD, taxes: a.taxes + x.taxesUSD }), { gmv: 0, payouts: 0, taxes: 0 });
  ok(res, { items, totals });
}));

router.get('/satisfaction', authStaff('analyst', 'ops_manager'), wrap(async (req, res) => {
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

router.post('/step-up', authStaff(), wrap(async (req, res) => {
  const pin = String(req.body?.pin || '');
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  let good;
  if (me && me.totp_enabled && me.totp_secret && /^\d{6}$/.test(pin)) good = totp.verify(me.totp_secret, pin);
  else good = (me && me.pin) ? pin === me.pin : pin === (process.env.OPS_STEPUP_PIN || '2468');
  await audit(req, good ? 'stepup.ok' : 'stepup.fail', 'module', req.body?.module || '');
  if (!good) return err(res, 'PIN', 'Incorrect code', 401);
  ok(res, { unlocked: true, factor: (me && me.totp_enabled) ? '2fa' : 'pin' });
}));

router.post('/2fa/enroll', authStaff(), wrap(async (req, res) => {
  const secret = totp.generateSecret();
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  const { error } = await sb.from('staff').update({ totp_secret: secret, totp_enabled: false }).eq('id', req.auth.sub);
  if (error) return err(res, 'SERVER', /totp/.test(error.message || '') ? 'Run migration-010' : error.message, 500);
  ok(res, { secret, otpauth: totp.otpauthURL(secret, me?.email || 'staff') });
}));

router.post('/2fa/verify', authStaff(), wrap(async (req, res) => {
  const me = await one('staff', { id: req.auth.sub }).catch(() => null);
  if (!me?.totp_secret) return err(res, '2FA', 'Enroll first', 400);
  if (!totp.verify(me.totp_secret, String(req.body?.code || ''))) return err(res, '2FA', 'Invalid code', 401);
  await sb.from('staff').update({ totp_enabled: true }).eq('id', req.auth.sub);
  await audit(req, '2fa.enabled', 'staff', req.auth.sub);
  ok(res, { enabled: true });
}));

router.get('/listings/:id/detail', authStaff('content_mod', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
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

router.get('/hosts/:id/analytics', authStaff('analyst', 'ops_manager', 'trust_safety'), wrap(async (req, res) => {
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

router.post('/staff/set-pin', authStaff(), wrap(async (req, res) => {
  const pin = String(req.body?.pin || '');
  if (!/^\d{4,6}$/.test(pin)) return err(res, 'PIN', 'PIN must be 4–6 digits', 400);
  const { error } = await sb.from('staff').update({ pin }).eq('id', req.auth.sub);
  if (error) return err(res, 'SERVER', /pin/.test(error.message || '') ? 'Run migration-009' : error.message, 500);
  await audit(req, 'staff.set-pin', 'staff', req.auth.sub);
  ok(res, { ok: true });
}));

module.exports = router;
