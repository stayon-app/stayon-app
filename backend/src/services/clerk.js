// Clerk bridge — verifies a Clerk session token (issued to the website or the
// Expo app) and resolves the Clerk user's identity. The route layer then maps
// that to a Supabase users row and issues normal StayOn tokens, so the rest of
// the backend (authUser, all /v1 endpoints) is untouched.

const SECRET = process.env.CLERK_SECRET_KEY;
const enabled = !!SECRET;

let _clerk = null;
function clerkClient() {
  // Lazy-load so the backend still boots if @clerk/backend isn't installed yet.
  if (!_clerk) {
    const { createClerkClient } = require('@clerk/backend');
    _clerk = createClerkClient({ secretKey: SECRET });
  }
  return _clerk;
}

/**
 * Verify a Clerk session token and return the user's identity.
 * @param {string} token – Clerk session JWT (from getToken() on the client)
 * @returns {{ clerkUserId, email, phone, name, avatarUrl }}
 * @throws on invalid/expired tokens
 */
async function verifyClerkToken(token) {
  if (!enabled) {
    const e = new Error('Clerk is not configured on the backend (set CLERK_SECRET_KEY).');
    e.code = 'CLERK_DISABLED';
    throw e;
  }

  const { verifyToken } = require('@clerk/backend');
  // Networkless JWT verification against Clerk's JWKS (keyed by the secret).
  const payload = await verifyToken(token, { secretKey: SECRET });
  const clerkUserId = payload.sub;

  // Session tokens carry minimal claims, so fetch the full profile.
  const u = await clerkClient().users.getUser(clerkUserId);
  const email =
    u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || null;
  const phone =
    u.primaryPhoneNumber?.phoneNumber || u.phoneNumbers?.[0]?.phoneNumber || null;
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim() || null;

  return { clerkUserId, email, phone, name, avatarUrl: u.imageUrl || null };
}

module.exports = { verifyClerkToken, clerkEnabled: enabled };
