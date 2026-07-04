// Smart insights — lightweight, on-device heuristics that turn the host's live
// data (reservations, listings, reviews) into a few actionable "do this next"
// tips, Airbnb-style. No ML; just transparent rules ranked by priority.

import type { HostReservation } from '../data/reservations';
import type { HostListing } from '../data/listings';
import type { GuestReview } from '../data/hostReviews';

export type InsightTone = 'action' | 'opportunity' | 'positive';

export interface Insight {
  id: string;
  tone: InsightTone;
  icon: string;        // Ionicons
  title: string;
  body: string;
  cta?: string;
  route?: string;      // navigation target
  params?: any;
  priority: number;    // higher = shown first
}

export function buildInsights(
  reservations: HostReservation[],
  listings: HostListing[],
  reviews: GuestReview[]
): Insight[] {
  const out: Insight[] = [];

  const pending = reservations.filter((r) => r.status === 'pending');
  const confirmed = reservations.filter((r) => r.status === 'confirmed');
  const completed = reservations.filter((r) => r.status === 'completed');
  const published = listings.filter((l) => l.status === 'published');

  // No listing yet — the only thing that matters.
  if (listings.length === 0) {
    out.push({
      id: 'first-listing', tone: 'action', icon: 'add-circle', priority: 100,
      title: 'Create your first listing', body: 'You’re minutes away from your first booking. List your place to start earning.',
      cta: 'Start listing', route: 'ListingCreate',
    });
    return out;
  }

  // No bookings yet — push the first-booking hub.
  if (published.length > 0 && confirmed.length === 0 && completed.length === 0) {
    out.push({
      id: 'first-booking-hub', tone: 'opportunity', icon: 'rocket', priority: 90,
      title: 'Land your first booking', body: 'Finish your setup, add a first‑guest promo, and climb the search results.',
      cta: 'Open the guide', route: 'FirstBooking',
    });
  }

  // Pending requests — protect response rate.
  if (pending.length > 0) {
    out.push({
      id: 'respond', tone: 'action', icon: 'time', priority: 95,
      title: `Respond to ${pending.length} request${pending.length > 1 ? 's' : ''}`,
      body: 'Replying within 24 hours protects your response rate and ranking in search.',
      cta: 'Review requests', route: 'ReservationsTab',
    });
  }

  // Reviews to write.
  const toReview = completed.length;
  if (toReview > 0) {
    out.push({
      id: 'review-guests', tone: 'action', icon: 'star', priority: 70,
      title: `Review ${toReview} recent guest${toReview > 1 ? 's' : ''}`,
      body: 'Honest guest reviews help the whole community and nudge guests to review you back.',
      cta: 'Go to reservations', route: 'ReservationsTab',
    });
  }

  // Occupancy nudge — lots of open calendar.
  if (published.length > 0 && confirmed.length <= 1) {
    out.push({
      id: 'fill-calendar', tone: 'opportunity', icon: 'pricetag', priority: 60,
      title: 'Your calendar is wide open', body: 'Add a weekly or first-booking discount to win your next reservation faster.',
      cta: 'Adjust pricing', route: 'Listings',
    });
  } else if (confirmed.length >= 3) {
    out.push({
      id: 'raise-price', tone: 'opportunity', icon: 'trending-up', priority: 55,
      title: 'You’re booking up fast', body: 'Demand looks strong — a small price increase on peak nights could lift earnings.',
      cta: 'Review pricing', route: 'Listings',
    });
  }

  // Photo coaching — thin galleries convert worse.
  const thin = published.find((l) => (l.images?.length ?? 0) < 8);
  if (thin) {
    out.push({
      id: 'more-photos', tone: 'opportunity', icon: 'images', priority: 45,
      title: 'Add more photos to “' + (thin.title || 'your listing') + '”',
      body: 'Listings with 12+ bright photos get noticeably more bookings. You have ' + (thin.images?.length ?? 0) + '.',
      cta: 'Edit listing', route: 'ListingDetails', params: { id: thin.id },
    });
  }

  // Unanswered review — respond to build trust.
  const unanswered = reviews.find((r) => !r.response);
  if (unanswered) {
    out.push({
      id: 'reply-review', tone: 'opportunity', icon: 'chatbubble-ellipses', priority: 40,
      title: 'Reply to your latest review', body: `A warm reply to ${unanswered.guestName.split(' ')[0]} shows future guests how you host.`,
      cta: 'Open reviews', route: 'Reviews',
    });
  }

  // Positive reinforcement when nothing urgent.
  if (out.filter((i) => i.tone === 'action').length === 0) {
    const avg = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
    out.push({
      id: 'all-good', tone: 'positive', icon: 'checkmark-circle', priority: 10,
      title: avg >= 4.8 ? `You’re a ${avg.toFixed(1)}★ host` : 'You’re all caught up',
      body: avg >= 4.8 ? 'Guests love your place. Keep replies quick and your calendar fresh to stay on top.' : 'No actions need you right now. Nice work keeping things tidy.',
    });
  }

  return out.sort((a, b) => b.priority - a.priority).slice(0, 4);
}
