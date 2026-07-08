const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authUser } = require('../auth');
const { verifyIdentity } = require('../kyc');
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
  softWrite,
  now
} = require('../utils/helpers');

// Salt for one-person-one-identity hash
const IDENTITY_SALT = process.env.IDENTITY_SALT || process.env.JWT_SECRET || 'stayon-identity-salt';

function identityHash(idType, idNumber, dob) {
  const norm = `${String(idType || '').trim().toLowerCase()}|${String(idNumber || '').replace(/\s|-/g, '').toLowerCase()}|${String(dob || '').trim()}`;
  return crypto.createHash('sha256').update(IDENTITY_SALT + '|' + norm).digest('hex');
}

// AI photo classification helpers
const PHOTO_ROOM_KEYS = ['living', 'kitchen', 'dining', 'bedroom', 'bathroom', 'balcony', 'workspace', 'pool', 'garden', 'parking', 'playground', 'exterior', 'other'];
const ROOM_PROMPT = `What room/area of a property is this photo? Reply with ONE word from: ${PHOTO_ROOM_KEYS.join(', ')}.`;
const pickRoom = (txt) => PHOTO_ROOM_KEYS.find((k) => String(txt || '').toLowerCase().includes(k)) || 'other';

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
      return txt ? pickRoom(txt) : null;
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
  } catch {}
  return null;
}

// Identity verification
router.post('/identity/submit', authUser, wrap(async (req, res) => {
  const { legalName, idType, idNumber, dob } = req.body || {};
  if (!idType || !idNumber) return err(res, 'ID_REQUIRED', 'idType and idNumber are required', 400);
  const id_hash = identityHash(idType, idNumber, dob);
  const id_last4 = String(idNumber).replace(/\s|-/g, '').slice(-4);

  const { data: clash, error: clashErr } = await sb.from('identities').select('user_id,status').eq('id_hash', id_hash).maybeSingle();
  const columnMissing = clashErr && /id_hash/.test(clashErr.message || '');
  if (clash && clash.user_id !== req.auth.sub) {
    return err(res, 'IDENTITY_IN_USE', 'This ID is already linked to another StayOn account. One person can hold only one account.', 409);
  }

  const verdict = await verifyIdentity({ idType, idNumber, dob, legalName, country: req.body.country });

  const docs = { front: req.body.docFront || null, back: req.body.docBack || null, selfie: req.body.selfie || null };
  const full = { user_id: req.auth.sub, legal_name: legalName, id_type: idType, id_last4, dob: dob || null, id_hash, docs, status: verdict.status, provider: process.env.KYC_PROVIDER || null, provider_ref: verdict.providerRef || null, submitted_at: now() };
  const { error: upErr } = await sb.from('identities').upsert(full);
  if (upErr && /id_hash|dob|docs/.test(upErr.message || '')) {
    await sb.from('identities').upsert({ user_id: req.auth.sub, legal_name: legalName, id_type: idType, status: verdict.status, submitted_at: now() });
    return ok(res, { status: verdict.status, dedup: false });
  } else if (upErr) { throw upErr; }
  ok(res, { status: verdict.status, dedup: !columnMissing });
}));

// AI Photo Classification
router.post('/ai/classify-photos', authUser, wrap(async (req, res) => {
  const imgs = Array.isArray(req.body?.images) ? req.body.images : [];
  const out = [];
  for (const img of imgs) {
    if (!img.b64) continue;
    const tag = await classifyOne(img);
    out.push({ id: img.id, tag });
  }
  ok(res, { images: out });
}));

// Host Public Profiles
router.get('/hosts/:id', wrap(async (req, res) => {
  const host = await one('users', { id: req.params.id });
  if (!host) return err(res, 'NOTFOUND', 'host not found', 404);
  const stays = (await rows('listings', { host_id: host.id, status: 'published' })).map(listingOut);
  const reviews = (await rows('reviews', { listing_id: req.params.id })).filter((r) => !r.removed);
  const hostRev = await rows('reviews').then((arr) => {
    const s = new Set(stays.map((st) => st.id));
    return arr.filter((r) => s.has(r.listing_id) && !r.removed);
  });
  ok(res, {
    id: host.id, name: host.name, phone: host.phone, createdAt: host.created_at,
    payoutsEnabled: !!host.payouts_enabled, stays, reviewsCount: hostRev.length,
    ratingAvg: hostRev.length ? Math.round((hostRev.reduce((s, r) => s + r.rating, 0) / hostRev.length) * 10) / 10 : 0
  });
}));

// Notifications
router.get('/notifications', authUser, wrap(async (req, res) => {
  const { data } = await sb.from('notifications').select('*').eq('user_id', req.auth.sub).order('created_at', { ascending: false }).limit(50);
  ok(res, { items: data || [] });
}));

router.post('/notifications/read', authUser, wrap(async (req, res) => {
  await sb.from('notifications').update({ read: true }).eq('user_id', req.auth.sub);
  ok(res, { read: true });
}));

// Earnings & Payouts
router.get('/earnings', authUser, wrap(async (req, res) => {
  const mine = (await rows('bookings', { host_id: req.auth.sub })).filter((b) => b.status === 'confirmed' || b.status === 'completed');
  const gross = mine.reduce((s, b) => s + (b.subtotal_usd || 0) + (b.cleaning_usd || 0), 0);
  ok(res, { bookings: mine.length, grossUSD: gross, feeUSD: 0, netUSD: gross });
}));

router.get('/payouts', authUser, wrap(async (req, res) => {
  const items = (await rows('bookings', { host_id: req.auth.sub })).filter((b) => b.status === 'confirmed' || b.status === 'completed')
    .map((b) => ({ code: b.code, amountUSD: (b.subtotal_usd || 0) + (b.cleaning_usd || 0), status: b.status === 'completed' ? 'paid' : 'scheduled' }));
  ok(res, { items });
}));

router.post('/payout-method/change-request', authUser, wrap(async (req, res) => {
  const r = await insertRow('payout_change_requests', { host_id: req.auth.sub, requested: req.body, status: 'pending' });
  ok(res, { id: r.id, status: 'pending' });
}));

// Device register for push notifications
router.post('/push/register', authUser, wrap(async (req, res) => {
  const token = String(req.body?.token || '');
  if (!token) return err(res, 'BAD', 'token required', 400);
  await sb.from('users').update({ push_token: token }).eq('id', req.auth.sub).then(() => {}, () => {});
  ok(res, { registered: true });
}));

// Payout onboarding
router.post('/payout-account/connect', authUser, wrap(async (req, res) => {
  const acct = await payments.connectAccount({ id: req.auth.sub });
  await sb.from('users').update({ payout_account_id: acct.accountId, payouts_enabled: acct.enabled }).eq('id', req.auth.sub).then(() => {}, () => {});
  ok(res, { accountId: acct.accountId, onboardingUrl: acct.onboardingUrl, payoutsEnabled: acct.enabled, provider: payments.PROVIDER });
}));

// Public feature flags
router.get('/feature-flags', wrap(async (req, res) => {
  try {
    const { data } = await sb.from('feature_flags').select('key,enabled');
    const map = {};
    (data || []).forEach((f) => { map[f.key] = !!f.enabled; });
    ok(res, { flags: map });
  } catch { ok(res, { flags: {} }); }
}));

// ---- GDPR / CCPA — data portability (export) + right to erasure (delete) ----
router.get('/me/export', authUser, wrap(async (req, res) => {
  const uid = req.auth.sub;
  const safe = (p) => p.then((v) => v, () => []); // missing table → empty
  const [user, identities, bookings, reservations, reviews, wishlists, threads, notifications] = await Promise.all([
    one('users', { id: uid }).catch(() => null),
    safe(rows('identities', { user_id: uid })), safe(rows('bookings', { guest_id: uid })),
    safe(rows('reservations', { guest_id: uid })), safe(rows('reviews', { author_id: uid })),
    safe(rows('wishlists', { user_id: uid })), safe(rows('threads', { guest_id: uid })),
    safe(rows('notifications', { user_id: uid })),
  ]);
  // Never export raw ID documents — only non-sensitive metadata.
  const identitiesSafe = identities.map((i) => ({ id_type: i.id_type, id_last4: i.id_last4, status: i.status, submitted_at: i.submitted_at }));
  ok(res, { exportedAt: now(), user, identities: identitiesSafe, bookings, reservations, reviews, wishlists, threads, notifications });
}));

router.post('/me/delete', authUser, wrap(async (req, res) => {
  const uid = req.auth.sub;
  const tryDel = (q) => q.then(() => {}, () => {});
  // Right to erasure: remove PII + identity docs; de-identify the account.
  // Bookings/reservations are RETAINED (legal/financial record) once anonymised.
  await tryDel(sb.from('identities').delete().eq('user_id', uid));
  await tryDel(sb.from('wishlists').delete().eq('user_id', uid));
  await tryDel(sb.from('notifications').delete().eq('user_id', uid));
  await tryDel(sb.from('users').update({ name: 'Deleted user', phone: null, email: null, push_token: null, status: 'deleted' }).eq('id', uid));
  ok(res, { deleted: true });
}));

// ── v2 (migration-013): synced settings ─────────────────────────────────────
// Falls back to sane defaults until the table exists, so it never 500s.
const DEFAULT_SETTINGS = { language: 'en', currency: 'USD', notif_push: true, notif_email: true, notif_sms: false, privacy: {}, accessibility: {} };
router.get('/me/settings', authUser, wrap(async (req, res) => {
  let row = null;
  try { row = await one('user_settings', { user_id: req.auth.sub }); } catch { /* table not migrated yet */ }
  ok(res, { settings: { ...DEFAULT_SETTINGS, ...(row || {}) } });
}));
router.put('/me/settings', authUser, wrap(async (req, res) => {
  const b = req.body || {};
  const patch = { user_id: req.auth.sub, updated_at: now() };
  for (const k of ['language', 'currency', 'notif_push', 'notif_email', 'notif_sms', 'privacy', 'accessibility']) {
    if (b[k] !== undefined) patch[k] = b[k];
  }
  const saved = await softWrite(() => sb.from('user_settings').upsert(patch, { onConflict: 'user_id' }));
  ok(res, { ok: true, applied: saved !== null });
}));

// ── v2: guest payment methods (masked; never raw card data) ─────────────────
router.get('/me/payment-methods', authUser, wrap(async (req, res) => {
  let items = [];
  try { items = await rows('payment_methods', { user_id: req.auth.sub }); } catch { /* not migrated */ }
  ok(res, { items });
}));
router.post('/me/payment-methods', authUser, wrap(async (req, res) => {
  const { kind, brand, maskedLast4, providerRef, isDefault } = req.body || {};
  if (!kind) return err(res, 'KIND', 'kind required');
  const row = await softWrite(() => sb.from('payment_methods')
    .insert({ user_id: req.auth.sub, kind, brand: brand || null, masked_last4: maskedLast4 || null, provider_ref: providerRef || null, is_default: !!isDefault })
    .select().single());
  if (!row) return err(res, 'NOT_READY', 'Payment methods are not enabled yet (run migration-013).', 503);
  ok(res, { method: row });
}));
router.delete('/me/payment-methods/:id', authUser, wrap(async (req, res) => {
  await softWrite(() => sb.from('payment_methods').delete().match({ id: req.params.id, user_id: req.auth.sub }));
  ok(res, { ok: true });
}));

module.exports = router;
