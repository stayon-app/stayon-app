'use client';

// Clerk lands the browser here after a Google/Apple OAuth redirect. This just
// finishes the handshake; StayonBridge (mounted at the app root) then exchanges
// the resulting Clerk session for a StayOn one, same as the phone/email path.

import { AuthenticateWithRedirectCallback } from '@clerk/nextjs';

export default function SsoCallbackPage() {
  return <AuthenticateWithRedirectCallback afterSignInUrl="/" afterSignUpUrl="/" />;
}
