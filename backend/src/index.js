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
app.use(cors());
app.use(express.json({ limit: '10mb' }));

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

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`StayOn backend (Supabase) listening on http://localhost:${PORT}`));
