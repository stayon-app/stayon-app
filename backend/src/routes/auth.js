const express = require('express');
const router = express.Router();
const { signAccess, createRefreshToken, rotateRefreshToken, revokeToken, authUser } = require('../auth');
const { one, insertRow, updateByMatch, wrap, ok, err, userOut } = require('../utils/helpers');
const { createOtp, verifyOtp } = require('../services/otp');
const { verifyClerkToken } = require('../services/clerk');
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

// ── Clerk bridge: exchange a Clerk session for a StayOn session ─────────────
// POST /v1/auth/clerk   { clerkToken }
// Used by BOTH the website and the Expo app. Clerk is the front-end identity;
// this maps the Clerk user to a Supabase users row and issues StayOn tokens, so
// every other endpoint keeps working unchanged.
router.post('/auth/clerk', wrap(async (req, res) => {
  const { clerkToken } = req.body || {};
  if (!clerkToken) return err(res, 'TOKEN', 'clerkToken required');

  let info;
  try {
    info = await verifyClerkToken(clerkToken);
  } catch (e) {
    if (e.code === 'CLERK_DISABLED') return err(res, e.code, e.message, 503);
    return err(res, 'CLERK_INVALID', 'Invalid or expired Clerk session', 401);
  }

  // Find the StayOn user mapped to this Clerk id…
  let user = await one('users', { clerk_id: info.clerkUserId });
  let isNewUser = false;

  if (!user) {
    // …or link an existing account by email/phone (e.g. a prior OTP user)…
    if (info.email) user = await one('users', { email: info.email });
    if (!user && info.phone) user = await one('users', { phone: info.phone });

    if (user) {
      const linked = await updateByMatch('users', { id: user.id }, { clerk_id: info.clerkUserId });
      user = linked[0];
    } else {
      // …otherwise create a fresh StayOn user from the Clerk profile.
      user = await insertRow('users', {
        clerk_id: info.clerkUserId,
        email: info.email,
        phone: info.phone,
        name: info.name || 'Guest',
        avatar_url: info.avatarUrl,
        country_code: 'IN',
      });
      isNewUser = true;
    }
  }

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

// ── Update current user profile (name/email) ───────────────────────────────
// PUT /v1/me   { name?, email? }   — used by the account-creation step
router.put('/me', authUser, wrap(async (req, res) => {
  if (req.auth.kind === 'staff') return err(res, 'FORBIDDEN', 'staff profile not editable here', 403);

  const { name, email } = req.body || {};
  const patch = {};
  if (name !== undefined) patch.name = String(name).trim();
  if (email !== undefined) patch.email = String(email).trim().toLowerCase() || null;
  if (!Object.keys(patch).length) return err(res, 'NO_FIELDS', 'nothing to update');

  // Enforce one-email-per-account
  if (patch.email) {
    const clash = await one('users', { email: patch.email });
    if (clash && clash.id !== req.auth.sub) {
      return err(res, 'EMAIL_IN_USE', 'That email is already linked to another StayOn account.', 409);
    }
  }

  const updated = await updateByMatch('users', { id: req.auth.sub }, patch);
  ok(res, userOut(updated[0]));
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
