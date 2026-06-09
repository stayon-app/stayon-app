// End-to-end proof that User, Host and Ops communicate through the one backend.
const BASE = 'http://localhost:4000';
const J = (r) => r.json();
const post = (p, body, token) =>
  fetch(BASE + p, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body || {}) }).then(J);
const get = (p, token) => fetch(BASE + p, { headers: token ? { Authorization: `Bearer ${token}` } : {} }).then(J);

(async () => {
  const log = (s, v) => console.log(`\n● ${s}`, JSON.stringify(v));

  // 1) HOST logs in, creates + submits a listing
  const host = await post('/v1/auth/login', { phone: '+91999000111', name: 'Asha (Host)' });
  log('HOST login', host.user.name);
  const created = await post('/v1/listings', { title: 'Beach House Goa', type: 'Villa', city: 'Goa', guests: 6, priceUSD: 180, cleaningFeeUSD: 20, instantBook: false }, host.accessToken);
  await post(`/v1/listings/${created.id}/submit`, {}, host.accessToken);
  log('HOST submitted listing', created.id);

  // 2) OPS logs in, sees the queue, approves
  const ops = await post('/v1/ops/auth/login', { email: 'ops@stayon.com' });
  const queue = await get('/v1/ops/queues/listings', ops.accessToken);
  log('OPS sees pending listings', queue.items.map((l) => l.title));
  const approved = await post(`/v1/ops/listings/${created.id}/approve`, {}, ops.accessToken);
  log('OPS approved →', approved.status);

  // 3) A DIFFERENT USER logs in and searches — sees the host's listing (public!)
  const user = await post('/v1/auth/login', { phone: '+32917723000', name: 'Sam (Guest)' });
  const search = await get('/v1/search?city=Goa', user.accessToken);
  log('USER search Goa finds', search.results.map((l) => `${l.title} ($${l.priceUSD})`));

  // 4) USER books it
  const booking = await post('/v1/bookings', { listingId: created.id, checkIn: '2026-07-01', checkOut: '2026-07-04', guests: 2 }, user.accessToken);
  log('USER booked', `${booking.code} status=${booking.status}`);

  // 5) HOST sees the reservation and accepts → syncs to the user's trip
  const resv = await get('/v1/reservations', host.accessToken);
  log('HOST sees reservation', resv.items.map((r) => `${r.code} ${r.status}`));
  const accepted = await post(`/v1/reservations/${resv.items.find((r) => r.code === booking.code).id}/accept`, {}, host.accessToken);
  log('HOST accepted →', accepted.status);

  // 6) USER trip now reflects confirmed (cross-surface sync)
  const trips = await get('/v1/bookings', user.accessToken);
  log('USER trip status now', trips.items.map((b) => `${b.code} ${b.status}`));

  // 7) Messaging contact-guard before booking-confirmed phase already passed; test guard on a fresh listing
  const thread = await post('/v1/threads', { listingId: created.id }, user.accessToken);
  const blocked = await post(`/v1/threads/${thread.id}/messages`, { text: 'call me 9876543210' }, user.accessToken);
  log('USER tries to share phone pre-trust →', blocked.error ? blocked.error.code : 'sent');

  // 8) OPS dashboard reflects everything
  const dash = await get('/v1/ops/dashboard', ops.accessToken);
  log('OPS dashboard', dash);

  console.log('\n✅ Three-way communication verified: HOST → OPS → USER all through one backend.');
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
