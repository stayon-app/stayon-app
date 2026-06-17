// JWT auth shared by all clients. End users (guest/host are the SAME account in
// two modes) get a user token; Ops staff get a staff token with a role claim.
//
// v2: access tokens are short-lived (15 min); refresh tokens are long-lived
// opaque strings stored in the refresh_tokens table.

const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const { supabase } = require('./supabase');

const SECRET = process.env.JWT_SECRET || 'stayon-dev-secret-change-me';
const ACCESS_EXPIRY = '15m';
const REFRESH_EXPIRY_DAYS = 30;

// ── Access tokens (short-lived JWT) ────────────────────────────────────────

const signAccess = (payload) => jwt.sign(payload, SECRET, { expiresIn: ACCESS_EXPIRY });

// Backward compat: `sign` still works for ops/other code that doesn't use refresh tokens yet
const sign = signAccess;

// ── Refresh tokens (long-lived opaque, stored in DB) ───────────────────────

/**
 * Create a refresh token for a user, store it in the DB, and return the token string.
 * @param {string} userId
 * @returns {Promise<string>} opaque refresh token
 */
async function createRefreshToken(userId) {
  const token = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from('refresh_tokens').insert({
    user_id: userId,
    token,
    expires_at: expiresAt,
  });
  if (error) throw new Error(`Failed to create refresh token: ${error.message}`);
  return token;
}

/**
 * Validate a refresh token and rotate it (old one is revoked, new one issued).
 * @param {string} token – the opaque refresh token
 * @returns {{ userId: string, newRefreshToken: string }}
 */
async function rotateRefreshToken(token) {
  const { data: row, error } = await supabase
    .from('refresh_tokens')
    .select('*')
    .eq('token', token)
    .eq('revoked', false)
    .maybeSingle();

  if (error) throw new Error(`Refresh token lookup failed: ${error.message}`);
  if (!row) {
    const err = new Error('Invalid or revoked refresh token.');
    err.code = 'INVALID_REFRESH';
    throw err;
  }

  if (new Date(row.expires_at) < new Date()) {
    await supabase.from('refresh_tokens').update({ revoked: true }).eq('id', row.id);
    const err = new Error('Refresh token expired. Please log in again.');
    err.code = 'EXPIRED_REFRESH';
    throw err;
  }

  // Revoke the old token
  await supabase.from('refresh_tokens').update({ revoked: true }).eq('id', row.id);

  // Issue a new one
  const newToken = await createRefreshToken(row.user_id);
  return { userId: row.user_id, newRefreshToken: newToken };
}

/**
 * Revoke all refresh tokens for a user (used on logout / password change).
 */
async function revokeAllTokens(userId) {
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('user_id', userId)
    .eq('revoked', false);
}

/**
 * Revoke a single refresh token (used on single-device logout).
 */
async function revokeToken(token) {
  await supabase
    .from('refresh_tokens')
    .update({ revoked: true })
    .eq('token', token)
    .eq('revoked', false);
}

// ── Middleware ──────────────────────────────────────────────────────────────

function authUser(req, res, next) {
  const token = (req.headers.authorization || '').replace('Bearer ', '');
  try {
    req.auth = jwt.verify(token, SECRET);
    next();
  } catch {
    res.status(401).json({ error: { code: 'UNAUTH', message: 'Login required' } });
  }
}

function authStaff(...roles) {
  return (req, res, next) =>
    authUser(req, res, () => {
      if (req.auth.kind !== 'staff') {
        return res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Ops access only' } });
      }
      if (roles.length && !roles.includes(req.auth.role) && req.auth.role !== 'super_admin') {
        return res.status(403).json({ error: { code: 'ROLE', message: `Requires role: ${roles.join('/')}` } });
      }
      next();
    });
}

module.exports = {
  sign,
  signAccess,
  createRefreshToken,
  rotateRefreshToken,
  revokeAllTokens,
  revokeToken,
  authUser,
  authStaff,
  SECRET,
};
