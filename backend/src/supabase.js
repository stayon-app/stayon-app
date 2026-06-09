// Supabase client (server-side, uses the SERVICE key → full DB + Storage access).
// Falls back to "not configured" so the app keeps working on the JSON store until
// you add keys to .env. See SUPABASE_SETUP.md.

let createClient;
try { ({ createClient } = require('@supabase/supabase-js')); } catch { /* sdk not installed yet */ }

const URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const configured = !!(URL && SERVICE_KEY && createClient);

const supabase = configured
  ? createClient(URL, SERVICE_KEY, { auth: { persistSession: false } })
  : null;

if (configured) console.log('Supabase: connected (database-backed mode)');
else console.log('Supabase: NOT configured — using local JSON store (add keys to .env)');

const BUCKET_LISTINGS = process.env.SUPABASE_BUCKET_LISTINGS || 'listings';
const BUCKET_REELS = process.env.SUPABASE_BUCKET_REELS || 'reels';

module.exports = { supabase, configured, BUCKET_LISTINGS, BUCKET_REELS };
