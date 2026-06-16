const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { authUser } = require('../auth');
const { BUCKET_LISTINGS } = require('../supabase');
const {
  sb,
  insertRow,
  updateByMatch,
  rows,
  one,
  wrap,
  ok,
  err,
  msgOut,
  reviewOut,
  hasContact,
  notify,
  now
} = require('../utils/helpers');

router.post('/threads', authUser, wrap(async (req, res) => {
  const l = await one('listings', { id: req.body?.listingId });
  if (!l) return err(res, 'NOTFOUND', 'listing not found', 404);
  let t = await one('threads', { listing_id: l.id, guest_id: req.auth.sub });
  if (!t) t = await insertRow('threads', { listing_id: l.id, listing_title: l.title, guest_id: req.auth.sub, guest_name: req.auth.name, host_id: l.host_id });
  ok(res, { id: t.id, hostId: t.host_id, guestId: t.guest_id });
}));

router.get('/threads', authUser, wrap(async (req, res) => {
  const { data, error } = await sb.from('threads').select('*').or(`guest_id.eq.${req.auth.sub},host_id.eq.${req.auth.sub}`);
  if (error) throw error;
  ok(res, { items: data || [] });
}));

router.get('/threads/:id/messages', authUser, wrap(async (req, res) => {
  const { data, error } = await sb.from('messages').select('*').eq('thread_id', req.params.id).order('created_at');
  if (error) throw error;
  ok(res, { items: (data || []).map(msgOut) });
}));

router.post('/threads/:id/messages', authUser, wrap(async (req, res) => {
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

router.post('/reviews', authUser, wrap(async (req, res) => {
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

router.get('/reviews', authUser, wrap(async (req, res) => {
  if (req.query.listingId) return ok(res, { items: (await rows('reviews', { listing_id: req.query.listingId })).filter((r) => !r.removed).map(reviewOut) });
  const mine = await rows('listings', { host_id: req.auth.sub });
  const ids = new Set(mine.map((l) => l.id));
  const all = await rows('reviews');
  ok(res, { items: all.filter((r) => ids.has(r.listing_id) && !r.removed).map(reviewOut) });
}));

router.post('/reviews/:id/respond', authUser, wrap(async (req, res) => {
  await updateByMatch('reviews', { id: req.params.id }, { response: req.body.response });
  ok(res, { id: req.params.id, response: req.body.response });
}));

router.post('/guest-reviews', authUser, wrap(async (req, res) => {
  const { bookingCode, rating, text } = req.body || {};
  const b = await one('bookings', { code: bookingCode });
  if (!b) return err(res, 'NOTFOUND', 'booking not found', 404);
  const review = await insertRow('reviews', { booking_id: b.id, listing_id: b.listing_id, author_id: req.auth.sub, author_name: req.auth.name, direction: 'host_to_guest', rating, text });
  await notify(b.guest_id, 'guest-review.posted', { code: bookingCode });
  ok(res, { id: review.id, status: 'published' });
}));

router.post('/reels', authUser, wrap(async (req, res) => {
  const r = await insertRow('reels', { author_id: req.auth.sub, kind: req.body.kind, media_url: req.body.mediaUrl, thumb_url: req.body.thumbUrl, caption: req.body.caption, listing_id: req.body.listingId, status: 'pending' });
  ok(res, { id: r.id, status: 'pending' });
}));

router.get('/reels', wrap(async (req, res) => ok(res, { items: await rows('reels', { status: 'live' }) })));

router.get('/wishlists', authUser, wrap(async (req, res) => ok(res, { items: await rows('wishlists', { user_id: req.auth.sub }) })));

router.post('/wishlists', authUser, wrap(async (req, res) => {
  await sb.from('wishlists').upsert({ user_id: req.auth.sub, listing_id: req.body.listingId }, { onConflict: 'user_id,listing_id' });
  ok(res, { saved: true });
}));

router.delete('/wishlists/:listingId', authUser, wrap(async (req, res) => {
  await sb.from('wishlists').delete().match({ user_id: req.auth.sub, listing_id: req.params.listingId });
  ok(res, { removed: true });
}));

router.post('/media/presign', authUser, wrap(async (req, res) => {
  const ext = (req.body?.contentType || 'image/jpeg').split('/')[1] || 'jpg';
  const path = `${req.auth.sub}/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await sb.storage.from(BUCKET_LISTINGS).createSignedUploadUrl(path);
  if (error) throw error;
  const { data: pub } = sb.storage.from(BUCKET_LISTINGS).getPublicUrl(path);
  ok(res, { path, token: data.token, signedUrl: data.signedUrl, fileUrl: pub.publicUrl });
}));

router.post('/media/upload', authUser, wrap(async (req, res) => {
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

module.exports = router;
