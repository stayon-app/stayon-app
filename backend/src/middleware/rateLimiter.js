// Simple in-memory rate limiter. Good enough for a single-process backend.
// For multi-instance deployments, swap the Map for Redis.

/**
 * Create a rate-limiting middleware.
 * @param {{ windowMs: number, max: number, keyFn?: (req) => string }} opts
 */
function rateLimiter({ windowMs = 15 * 60 * 1000, max = 5, keyFn } = {}) {
  const hits = new Map(); // key → { count, resetAt }

  // Periodic cleanup so the Map doesn't grow unbounded
  setInterval(() => {
    const now = Date.now();
    for (const [k, v] of hits) {
      if (v.resetAt <= now) hits.delete(k);
    }
  }, windowMs).unref();

  return (req, res, next) => {
    const key = keyFn ? keyFn(req) : req.ip;
    const now = Date.now();
    let entry = hits.get(key);

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs };
      hits.set(key, entry);
    }

    entry.count++;

    // Set rate-limit headers
    res.set('X-RateLimit-Limit', String(max));
    res.set('X-RateLimit-Remaining', String(Math.max(0, max - entry.count)));
    res.set('X-RateLimit-Reset', String(Math.ceil(entry.resetAt / 1000)));

    if (entry.count > max) {
      const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
      res.set('Retry-After', String(retryAfter));
      return res.status(429).json({
        error: {
          code: 'RATE_LIMITED',
          message: `Too many requests. Try again in ${retryAfter} seconds.`,
          retryAfter,
        },
      });
    }

    next();
  };
}

/** Pre-configured limiter for OTP send: 5 requests per phone per 15 minutes. */
const otpSendLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyFn: (req) => `otp:${req.body?.phone || req.ip}`,
});

/** Pre-configured limiter for OTP verify: 10 attempts per phone per 15 minutes. */
const otpVerifyLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyFn: (req) => `verify:${req.body?.phone || req.ip}`,
});

module.exports = { rateLimiter, otpSendLimiter, otpVerifyLimiter };
