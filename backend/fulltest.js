// Comprehensive connection test — exercises EVERY backend flow across
// User · Host · Ops and asserts there are no mis-connections.
const B = 'http://localhost:4000/v1';
const J = (r) => r.json();
const call = (m, p, b, t) =>
  fetch(B + p, { method: m, headers: { 'Content-Type': 'application/json', ...(t ? { Authorization: `Bearer ${t}` } : {}) }, body: b ? JSON.stringify(b) : undefined }).then(async (r) => ({ status: r.status, body: await J(r).catch(() => ({})) }));
const post = (p, b, t) => call('POST', p, b, t);
const put = (p, b, t) => call('PUT', p, b, t);
const get = (p, t) => call('GET', p, b = undefined, t);
const del = (p, t) => call('DELETE', p, undefined, t);

// OTP login helper: send-otp (dev returns the code) → verify-otp → { accessToken, refreshToken, user }
const login = async (phone, name) => {
  const sent = (await post('/auth/send-otp', { phone, name })).body;
  return (await post('/auth/verify-otp', { phone, code: sent.devCode })).body;
};

let pass = 0, fail = 0;
function check(name, cond, extra) {
  if (cond) { pass++; console.log('  ✓', name); }
  else { fail++; console.log('  ✗', name, extra ? JSON.stringify(extra) : ''); }
}

(async () => {
  console.log('\n== AUTH ==');
  const host = await login('+91900', 'Asha Host');
  const user = await login('+32100', 'Sam Guest');
  const ops = (await post('/ops/auth/login', { email: 'ops@stayon.com' })).body;
  check('host token', !!host.accessToken);
  check('user token', !!user.accessToken);
  check('ops token', !!ops.accessToken);
  check('me(host)', (await get('/me', host.accessToken)).body.name === 'Asha Host');

  console.log('\n== LISTING publish → Ops approve → search → detail → quote ==');
  const created = (await post('/listings', { title: 'Cliff Villa', type: 'Villa', city: 'Goa', country: 'India', lat: 15.5, lng: 73.8, guests: 6, priceUSD: 150, cleaningFeeUSD: 20, instantBook: false }, host.accessToken)).body;
  await post(`/listings/${created.id}/submit`, {}, host.accessToken);
  const q1 = (await get('/ops/queues/listings', ops.accessToken)).body;
  check('listing in ops queue', q1.items.some((l) => l.id === created.id));
  const appr = (await post(`/ops/listings/${created.id}/approve`, {}, ops.accessToken)).body;
  check('approved → published', appr.status === 'published');
  const srch = (await get('/search?city=Goa', user.accessToken)).body;
  check('appears in user search', srch.results.some((l) => l.id === created.id));
  const det = (await get(`/listings/${created.id}`)).body;
  check('listing detail', det.title === 'Cliff Villa');
  const quote = (await get(`/listings/${created.id}/quote?checkIn=2026-07-01&checkOut=2026-07-04`)).body;
  check('quote 0% fee', quote.platformFeeUSD === 0 && quote.nights === 3, quote);

  console.log('\n== BOOKING create → host accept → checkout → cancel (by code) ==');
  const CODE = 'STY-' + Math.random().toString(36).slice(2, 8).toUpperCase();
  const bk = (await post('/bookings', { listingId: created.id, code: CODE, checkIn: '2026-07-01', checkOut: '2026-07-04', guests: 2 }, user.accessToken)).body;
  check('booking created (shared code)', bk.code === CODE);
  const resv = (await get('/reservations', host.accessToken)).body;
  check('host sees reservation', resv.items.some((r) => r.code === CODE));
  check('host accept', (await post(`/reservations/by-code/${CODE}/accept`, {}, host.accessToken)).body.status === 'confirmed');
  check('guest trip confirmed', (await get('/bookings', user.accessToken)).body.items.find((b) => b.code === CODE).status === 'confirmed');
  check('host checkout', (await post(`/reservations/by-code/${CODE}/checkout`, {}, host.accessToken)).body.status === 'completed');
  check('guest trip completed', (await get('/bookings', user.accessToken)).body.items.find((b) => b.code === CODE).status === 'completed');

  console.log('\n== REVIEW (guest) → host sees ==');
  const rv = (await post('/reviews', { bookingCode: CODE, rating: 5, text: 'Amazing!' }, user.accessToken)).body;
  check('review created', rv.status === 'published');
  check('host sees review', (await get('/reviews', host.accessToken)).body.items.some((r) => r.text === 'Amazing!'));
  check('listing rating updated', (await get(`/listings/${created.id}`)).body.ratingCount >= 1);

  console.log('\n== MESSAGING + contact guard ==');
  const u2 = await login('+32999', 'NoBook');
  const th = (await post('/threads', { listingId: created.id }, u2.accessToken)).body;
  const blocked = await post(`/threads/${th.id}/messages`, { text: 'call me 9876543210' }, u2.accessToken);
  check('contact blocked pre-booking', blocked.status === 422 && blocked.body.error.code === 'CONTACT_BLOCKED', blocked.body);
  const okMsg = await post(`/threads/${th.id}/messages`, { text: 'Is parking available?' }, u2.accessToken);
  check('normal message sent', okMsg.status === 200);
  check('host reads thread messages', (await get(`/threads/${th.id}/messages`, host.accessToken)).body.items.length >= 1);

  console.log('\n== REELS post → Ops approve → feed ==');
  const reel = (await post('/reels', { kind: 'reel', mediaUrl: 'x.mp4', caption: 'Sunset', listingId: created.id }, host.accessToken)).body;
  check('reel pending', reel.status === 'pending');
  check('reel in ops queue', (await get('/ops/queues/reels', ops.accessToken)).body.items.some((r) => r.id === reel.id));
  check('reel approved', (await post(`/ops/reels/${reel.id}/approve`, {}, ops.accessToken)).body.status === 'live');
  check('reel in public feed', (await get('/reels')).body.items.some((r) => r.id === reel.id));

  console.log('\n== REPORT → Ops resolve ==');
  const rep = (await post('/reports', { targetType: 'listing', targetId: created.id, reason: 'test' }, u2.accessToken)).body;
  check('report open', rep.status === 'open');
  check('report in ops queue', (await get('/ops/reports', ops.accessToken)).body.items.some((r) => r.id === rep.id));
  check('report resolved', (await post(`/ops/reports/${rep.id}/resolve`, { resolution: 'dismissed_ok' }, ops.accessToken)).body.status === 'resolved');

  console.log('\n== KYC submit → Ops verify ==');
  await post('/identity/submit', { legalName: 'Asha R', idType: 'aadhaar' }, host.accessToken);
  check('kyc in ops queue', (await get('/ops/queues/kyc', ops.accessToken)).body.items.length >= 1);
  check('kyc approved', (await post(`/ops/kyc/${host.user.id}/approve`, {}, ops.accessToken)).body.status === 'verified');

  console.log('\n== PAYOUT change → Ops approve ; earnings/payouts ==');
  const pcr = (await post('/payout-method/change-request', { kind: 'bank', masked: 'HDFC ••4321' }, host.accessToken)).body;
  check('payout-change pending', pcr.status === 'pending');
  check('payout-change in ops queue', (await get('/ops/queues/payout-changes', ops.accessToken)).body.items.some((r) => r.id === pcr.id));
  check('payout-change approved', (await post(`/ops/payout-changes/${pcr.id}/approve`, {}, ops.accessToken)).body.status === 'approved');
  check('host earnings', (await get('/earnings', host.accessToken)).body.feeUSD === 0);
  check('host payouts list', Array.isArray((await get('/payouts', host.accessToken)).body.items));

  console.log('\n== WISHLISTS ==');
  await post('/wishlists', { listingId: created.id }, user.accessToken);
  check('wishlist added', (await get('/wishlists', user.accessToken)).body.items.length === 1);
  await del(`/wishlists/${created.id}`, user.accessToken);
  check('wishlist removed', (await get('/wishlists', user.accessToken)).body.items.length === 0);

  console.log('\n== CALENDAR & PRICING (host) ==');
  const cal = await put(`/listings/${created.id}/calendar`, { days: [{ day: '2026-09-01', priceUSD: 199, blocked: false }, { day: '2026-09-02', blocked: true }] }, host.accessToken);
  check('calendar saved', cal.body.updated === 2, cal.body);
  check('calendar read back', (await get(`/listings/${created.id}/calendar`, host.accessToken)).body.items.length >= 2);
  const pr = await put(`/listings/${created.id}/pricing`, { priceUSD: 175, cleaningFeeUSD: 25 }, host.accessToken);
  check('pricing updated', pr.body.priceUSD === 175, pr.body);

  console.log('\n== GEO-RADIUS SEARCH ==');
  const near = (await get('/search?lat=15.50&lng=73.83&radius=30')).body;
  check('geo search returns nearby', near.results.length >= 1 && near.results[0].distanceKm != null, near.results[0]);

  console.log('\n== HOST → GUEST review ==');
  check('host reviews guest', (await post('/guest-reviews', { bookingCode: CODE, rating: 5, text: 'Great guest' }, host.accessToken)).body.status === 'published');

  console.log('\n== OPS bookings + reviews moderation ==');
  check('ops sees bookings', (await get('/ops/bookings', ops.accessToken)).body.items.some((b) => b.code === CODE));
  check('ops force-cancel', (await post(`/ops/bookings/${CODE}/force-cancel`, {}, ops.accessToken)).body.status === 'cancelled');
  check('ops refund', (await post('/ops/refunds', { bookingCode: CODE, amountUSD: 100 }, ops.accessToken)).body.refundUSD === 100);
  const opsReviews = (await get('/ops/reviews', ops.accessToken)).body;
  check('ops sees reviews', opsReviews.items.length >= 1);
  check('ops remove review', (await post(`/ops/reviews/${rv.id}/remove`, {}, ops.accessToken)).body.removed === true);

  console.log('\n== NOTIFICATIONS ==');
  check('host has notifications', (await get('/notifications', host.accessToken)).body.items.length >= 1);
  check('mark read', (await post('/notifications/read', {}, host.accessToken)).body.read === true);

  console.log('\n== OPS dashboard / users / audit ==');
  const dash = (await get('/ops/dashboard', ops.accessToken)).body;
  check('dashboard ok', dash.today.bookings >= 1 && typeof dash.queues.listings === 'number', dash);
  check('ops list users', (await get('/ops/users', ops.accessToken)).body.items.length >= 2);
  check('ops suspend user', (await post(`/ops/users/${u2.user.id}/suspend`, {}, ops.accessToken)).body.status === 'suspended');
  check('audit log populated', (await get('/ops/audit', ops.accessToken)).body.items.length >= 3);

  console.log('\n== RBAC guard ==');
  const asUser = await post(`/ops/listings/${created.id}/approve`, {}, user.accessToken);
  check('user cannot call ops', asUser.status === 403, asUser.body);

  console.log(`\n${fail === 0 ? '✅ ALL CONNECTED' : '❌ MIS-CONNECTIONS'} — ${pass} passed, ${fail} failed`);
  process.exit(fail === 0 ? 0 : 1);
})().catch((e) => { console.error('FATAL', e); process.exit(1); });
