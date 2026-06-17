const express = require('express');
const router = express.Router();
const { signAccess, createRefreshToken, rotateRefreshToken, revokeToken, authUser } = require('../auth');
const { one, insertRow, wrap, ok, err, userOut } = require('../utils/helpers');
const { createOtp, verifyOtp } = require('../services/otp');
const { otpSendLimiter, otpVerifyLimiter } = require('../middleware/rateLimiter');

// ── Step 1: Send OTP ───────────────────────────────────────────────────────
// POST /v1/auth/send-otp   { phone, countryCode?, name? }
router.post('/auth/send-otp', otpSendLimiter, wrap(async (req, res) => {
  const { phone, countryCode, name } = req.body || {};
  if (!phone) return err(res, 'PHONE', 'phone required');

  // Upsert user by phone (create if first time)
  let user = await one('users', { phone });
  if (!user) {
    user = await insertRow('users', {
      phone,
      name: name || 'Guest',
      country_code: countryCode || 'IN',
    });
  }

  // Generate, store, and send the OTP
  const result = await createOtp(phone, user.id);

  ok(res, {
    message: 'Verification code sent',
    expiresIn: result.expiresIn,
    ...(result.devCode ? { devCode: result.devCode } : {}),
  });
}));

// ── Step 2: Verify OTP ─────────────────────────────────────────────────────
// POST /v1/auth/verify-otp   { phone, code }
router.post('/auth/verify-otp', otpVerifyLimiter, wrap(async (req, res) => {
  const { phone, code } = req.body || {};
  if (!phone || !code) return err(res, 'PARAMS', 'phone and code required');

  // Verify the OTP against the DB
  const { userId } = await verifyOtp(phone, code);

  // Fetch the full user record
  const user = await one('users', { id: userId });
  if (!user) return err(res, 'USER', 'User not found', 404);

  // Determine if this is a brand-new user (no name set yet, or still 'Guest')
  const isNewUser = !user.name || user.name === 'Guest';

  // Issue tokens
  const accessToken = signAccess({ sub: user.id, kind: 'user', name: user.name });
  const refreshToken = await createRefreshToken(user.id);

  ok(res, { accessToken, refreshToken, user: userOut(user), isNewUser });
}));

// ── Token refresh ──────────────────────────────────────────────────────────
// POST /v1/auth/refresh   { refreshToken }
router.post('/auth/refresh', wrap(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) return err(res, 'TOKEN', 'refreshToken required');

  const { userId, newRefreshToken } = await rotateRefreshToken(refreshToken);

  const user = await one('users', { id: userId });
  if (!user) return err(res, 'USER', 'User not found', 404);

  const accessToken = signAccess({ sub: user.id, kind: 'user', name: user.name });

  ok(res, { accessToken, refreshToken: newRefreshToken });
}));

// ── Logout (revoke refresh token) ──────────────────────────────────────────
// POST /v1/auth/logout   { refreshToken }
router.post('/auth/logout', wrap(async (req, res) => {
  const { refreshToken } = req.body || {};
  if (refreshToken) await revokeToken(refreshToken);
  ok(res, { message: 'Logged out' });
}));

// ── Current user profile ───────────────────────────────────────────────────
// GET /v1/me
router.get('/me', authUser, wrap(async (req, res) => {
  if (req.auth.kind === 'staff') {
    return ok(res, await one('staff', { id: req.auth.sub }));
  }
  ok(res, userOut(await one('users', { id: req.auth.sub })));
}));

// ── Ops staff login (unchanged — email-only for now) ───────────────────────
// POST /v1/ops/auth/login   { email }
router.post('/ops/auth/login', wrap(async (req, res) => {
  const member = await one('staff', { email: req.body?.email });
  if (!member) return err(res, 'STAFF', 'unknown staff email', 401);
  ok(res, {
    accessToken: signAccess({ sub: member.id, kind: 'staff', role: member.role, name: member.name }),
    staff: member,
  });
}));

module.exports = router;
