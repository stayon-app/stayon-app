// StayOn central backend — ONE service for User app + Host app + Ops portal.
// Database-backed by Supabase (Postgres + Storage) → cross-device, persistent.

const express = require('express');
const cors = require('cors');
const { configured } = require('./supabase');

if (!configured) {
  console.error('FATAL: Supabase not configured. Add SUPABASE_URL + SUPABASE_SERVICE_KEY to backend/.env');
  process.exit(1);
}

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// ---- production hardening (no extra deps) --------------------------------
// Security headers — sensible API defaults (CSP belongs on the web app).
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
});

// Structured request log + latency metric (pipe to your log aggregator in prod).
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const ms = Date.now() - start;
    console.log(JSON.stringify({ t: new Date().toISOString(), method: req.method, path: req.path, status: res.statusCode, ms }));
  });
  next();
});

// Simple in-memory rate limiter (per IP). For multi-instance/global scale, swap
// for a Redis-backed limiter so the window is shared across nodes.
const RL_WINDOW_MS = 60_000, RL_MAX = Number(process.env.RATE_LIMIT_PER_MIN) || 240;
const rlHits = new Map();
app.use((req, res, next) => {
  if (req.path === '/health') return next();
  const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'unknown';
  const nowMs = Date.now();
  const rec = rlHits.get(ip);
  if (!rec || nowMs > rec.reset) { rlHits.set(ip, { count: 1, reset: nowMs + RL_WINDOW_MS }); return next(); }
  rec.count += 1;
  if (rec.count > RL_MAX) return res.status(429).json({ error: { code: 'RATE_LIMIT', message: 'Too many requests — slow down.' } });
  next();
});
setInterval(() => { const t = Date.now(); for (const [ip, r] of rlHits) if (t > r.reset) rlHits.delete(ip); }, RL_WINDOW_MS).unref();

// Lightweight reachability probe for frontends (no auth, no DB).
app.get('/health', (req, res) => res.json({ ok: true, service: 'stayon', ts: Date.now() }));

// Mount modular routers
app.use('/v1', require('./routes/auth'));
app.use('/v1', require('./routes/listings'));
app.use('/v1', require('./routes/bookings'));
app.use('/v1', require('./routes/social'));
app.use('/v1', require('./routes/misc'));
app.use('/v1/ops', require('./routes/ops')); // Mount ops routes under /v1/ops

app.get('/', (req, res) => res.json({
  service: 'StayOn backend',
  status: 'ok',
  store: 'supabase',
  clients: ['user', 'host', 'ops']
}));

// 404 + central error handler (defence in depth alongside per-route wrap()).
app.use((req, res) => res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No such endpoint' } }));
app.use((e, req, res, next) => { // eslint-disable-line no-unused-vars
  console.error(JSON.stringify({ t: new Date().toISOString(), level: 'error', path: req.path, msg: e && e.message }));
  if (res.headersSent) return;
  res.status(500).json({ error: { code: 'SERVER', message: 'Something went wrong' } });
});

const PORT = process.env.PORT || 4000;
const server = app.listen(PORT, () => console.log(`StayOn backend (Supabase) listening on http://localhost:${PORT}`));

// Graceful shutdown — finish in-flight requests, then exit (clean rolling deploys).
function shutdown(sig) {
  console.log(`${sig} received — shutting down gracefully`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason) => console.error(JSON.stringify({ t: new Date().toISOString(), level: 'error', msg: 'unhandledRejection', reason: String(reason) })));
