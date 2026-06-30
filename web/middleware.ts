import { clerkMiddleware } from '@clerk/nextjs/server';

// Clerk middleware: attaches auth context to every request. All routes stay
// public here (browse/search/detail don't require login); protect specific
// routes later with createRouteMatcher if needed (e.g. /trips, /bookings).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next internals and static files, run on everything else
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpg|jpeg|gif|png|svg|ico|webp|woff2?|ttf)).*)',
    // Always run on API routes
    '/(api|trpc)(.*)',
  ],
};
