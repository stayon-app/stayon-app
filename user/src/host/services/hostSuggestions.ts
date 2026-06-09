// Host suggestions — an on-device "advisor" that reads guest reviews and the
// host's own numbers (occupancy, stay length, photos, guidebook) and turns them
// into concrete, ranked recommendations: what to fix, what to upgrade, what to
// highlight, and pricing/growth moves. Transparent heuristics, no real ML.

import type { GuestReview } from '../data/hostReviews';
import type { Trends } from '../data/analytics';
import type { HostListing } from '../data/listings';

export type SuggestionCategory = 'fix' | 'upgrade' | 'highlight' | 'pricing' | 'growth';

export interface HostSuggestion {
  id: string;
  title: string;
  detail: string;
  icon: string;            // Ionicons
  category: SuggestionCategory;
  priority: number;        // higher = more important
  evidence?: string;       // why we surfaced it (e.g. "3 reviews mentioned noise")
}

export interface Satisfaction {
  score: number;           // 0–100
  label: string;           // "Excellent", etc.
  tone: 'positive' | 'neutral' | 'action';
  avg: number;             // raw stars
  total: number;
}

export interface SuggestionReport {
  satisfaction: Satisfaction;
  positives: string[];     // what to keep doing
  suggestions: HostSuggestion[];
}

export const CATEGORY_META: Record<SuggestionCategory, { label: string; icon: string; color: string }> = {
  fix: { label: 'Fix', icon: 'build-outline', color: '#EF4444' },
  upgrade: { label: 'Upgrade', icon: 'arrow-up-circle-outline', color: '#6366F1' },
  highlight: { label: 'Highlight', icon: 'megaphone-outline', color: '#F59E0B' },
  pricing: { label: 'Pricing', icon: 'pricetag-outline', color: '#10B981' },
  growth: { label: 'Grow', icon: 'trending-up-outline', color: '#0EA5E9' },
};

// Review-driven rules: keyword → concrete recommendation.
const REVIEW_RULES: { match: string[]; title: string; detail: string; icon: string; category: SuggestionCategory; priority: number }[] = [
  { match: ['noise', 'noisy', 'loud', 'street'], title: 'Cut down the noise', icon: 'volume-mute-outline', category: 'fix', priority: 85,
    detail: 'Add acoustic/blackout curtains, a white-noise machine, or supply earplugs. Noise is the #1 thing that drops a 5★ to a 4★.' },
  { match: ['wifi', 'wi-fi', 'internet', 'slow connection'], title: 'Upgrade the Wi-Fi', icon: 'wifi-outline', category: 'upgrade', priority: 80,
    detail: 'Faster internet (or a mesh router) lifts ratings and unlocks remote-worker bookings. Add a clear "fast Wi-Fi" amenity once done.' },
  { match: ['cold', 'heating', 'heater', 'freezing'], title: 'Improve heating', icon: 'thermometer-outline', category: 'upgrade', priority: 70,
    detail: 'Add a quiet portable heater and warmer bedding for cooler nights — small spend, noticeable comfort jump.' },
  { match: ['hot', 'ac', 'air con', 'air-con', 'stuffy', 'fan'], title: 'Improve cooling', icon: 'snow-outline', category: 'upgrade', priority: 70,
    detail: 'Consider an AC unit or quality fans. Guests rarely forgive a hot, stuffy room in summer.' },
  { match: ['dirty', 'dusty', 'stain', 'smell', 'unclean', 'hair'], title: 'Tighten cleanliness', icon: 'sparkles-outline', category: 'fix', priority: 90,
    detail: 'Move to a professional turnover clean with a written checklist. Cleanliness has the strongest pull on your overall rating.' },
  { match: ['small', 'cramped', 'tight', 'tiny'], title: 'Make the space feel bigger', icon: 'resize-outline', category: 'fix', priority: 55,
    detail: 'Declutter, add mirrors and brighter lighting, then reshoot photos so expectations match reality.' },
  { match: ['parking', 'park'], title: 'Sort out parking', icon: 'car-outline', category: 'fix', priority: 50,
    detail: 'Add clear parking instructions or secure a nearby spot, and state it up front to avoid arrival stress.' },
  { match: ['water', 'shower', 'pressure', 'hot water', 'plumbing'], title: 'Fix water & shower', icon: 'water-outline', category: 'fix', priority: 75,
    detail: 'Service the heater and boost shower pressure. A cold or weak shower is a common rating-killer.' },
  { match: ['bed', 'mattress', 'uncomfortable', 'pillow'], title: 'Upgrade the bedding', icon: 'bed-outline', category: 'upgrade', priority: 65,
    detail: 'A better mattress/topper and quality linens directly raise comfort scores and repeat bookings.' },
  { match: ['check-in', 'check in', 'late', 'keys', 'access', 'lockbox'], title: 'Smoother check-in', icon: 'key-outline', category: 'fix', priority: 60,
    detail: 'Add a smart lock or self check-in with photo instructions so arrival is effortless at any hour.' },
  { match: ['kitchen', 'cook', 'utensils', 'pans'], title: 'Round out the kitchen', icon: 'restaurant-outline', category: 'upgrade', priority: 45,
    detail: 'Stock basic cookware, spices and a decent knife — a usable kitchen widens who books you.' },
];

const POSITIVE_THEMES: { words: string[]; keep: string }[] = [
  { words: ['clean', 'spotless', 'tidy'], keep: 'Guests love how clean it is — keep the professional turnover going.' },
  { words: ['location', 'central', 'walk', 'convenient'], keep: 'Your location is a winner — lead with it in your title and photos.' },
  { words: ['host', 'responsive', 'helpful', 'communication'], keep: 'Guests rave about your hosting — fast, warm replies are paying off.' },
  { words: ['view', 'sunset', 'balcony'], keep: 'The view is a standout — make it your first photo.' },
  { words: ['comfortable', 'cozy', 'quiet', 'bed'], keep: 'Comfort scores high — guests sleep well here.' },
  { words: ['value', 'worth', 'affordable'], keep: 'Guests feel it’s great value — you may have room to nudge price on peak dates.' },
];

function satisfactionFrom(avg: number, total: number): Satisfaction {
  const score = Math.round((avg / 5) * 100);
  let label = 'No reviews yet', tone: Satisfaction['tone'] = 'neutral';
  if (total > 0) {
    if (avg >= 4.8) { label = 'Outstanding'; tone = 'positive'; }
    else if (avg >= 4.5) { label = 'Excellent'; tone = 'positive'; }
    else if (avg >= 4.0) { label = 'Good — room to grow'; tone = 'neutral'; }
    else { label = 'Needs attention'; tone = 'action'; }
  }
  return { score, label, tone, avg, total };
}

export function buildSuggestions(
  reviews: GuestReview[],
  trends: Trends,
  listings: HostListing[]
): SuggestionReport {
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const satisfaction = satisfactionFrom(avg, total);

  const allText = reviews.map((r) => (r.text || '').toLowerCase());
  const out: HostSuggestion[] = [];

  // Review-driven fixes/upgrades (count how many reviews mention each issue).
  REVIEW_RULES.forEach((rule) => {
    const hits = allText.filter((t) => rule.match.some((w) => t.includes(w))).length;
    if (hits > 0) {
      out.push({
        id: `rev_${rule.title}`, title: rule.title, detail: rule.detail, icon: rule.icon,
        category: rule.category, priority: rule.priority + Math.min(hits, 4) * 3,
        evidence: `${hits} review${hits > 1 ? 's' : ''} mentioned this`,
      });
    }
  });

  // What guests already love (keep-doing).
  const positives: string[] = [];
  POSITIVE_THEMES.forEach((th) => {
    const hits = allText.filter((t) => th.words.some((w) => t.includes(w))).length;
    if (hits >= 1) positives.push(th.keep);
  });

  // Unanswered reviews — respond to build trust.
  const unanswered = reviews.filter((r) => !r.response).length;
  if (unanswered > 0) {
    out.push({
      id: 'respond', title: `Reply to ${unanswered} review${unanswered > 1 ? 's' : ''}`, icon: 'chatbubble-ellipses-outline',
      category: 'growth', priority: 78, evidence: 'Unanswered reviews',
      detail: 'A warm public reply shows future guests how you host and nudges happy guests to book again.',
    });
  }

  // Analytics-driven moves.
  if (trends.occupancy >= 70) {
    out.push({ id: 'raise-peak', title: 'Raise rates on peak dates', icon: 'pricetag-outline', category: 'pricing', priority: 72,
      detail: `You’re ${trends.occupancy}% booked over the next 30 nights — demand is strong. A modest weekend/peak increase should lift earnings without hurting occupancy.`, evidence: `${trends.occupancy}% occupancy` });
  } else if (trends.occupancy <= 35 && trends.totalBookings >= 0) {
    out.push({ id: 'fill-calendar', title: 'Win more bookings', icon: 'calendar-outline', category: 'pricing', priority: 68,
      detail: 'Lots of open nights ahead. Add a weekly discount or a first-booking promo, and turn on Smart Pricing to stay competitive.', evidence: `${trends.occupancy}% occupancy` });
  }
  if (trends.avgStay > 0 && trends.avgStay < 3) {
    out.push({ id: 'los-discount', title: 'Add a length-of-stay discount', icon: 'moon-outline', category: 'growth', priority: 58,
      detail: `Average stay is ${trends.avgStay} nights. A weekly discount encourages longer bookings and fewer turnover cleans.`, evidence: `Avg stay ${trends.avgStay} nights` });
  }
  if (trends.repeatRate > 0 && trends.repeatRate < 20) {
    out.push({ id: 'win-repeat', title: 'Turn guests into repeat guests', icon: 'refresh-outline', category: 'growth', priority: 40,
      detail: 'Send a thank-you message after checkout with a returning-guest perk. Repeat guests are your cheapest bookings.', evidence: `${trends.repeatRate}% repeat rate` });
  }

  // Listing completeness.
  const thinPhotos = listings.find((l) => l.status === 'published' && (l.images?.length ?? 0) < 8);
  if (thinPhotos) {
    out.push({ id: 'more-photos', title: `Add more photos to “${thinPhotos.title || 'your listing'}”`, icon: 'images-outline', category: 'highlight', priority: 50,
      detail: `It has ${thinPhotos.images?.length ?? 0} photos. Listings with 12+ bright photos book noticeably more.`, evidence: 'Thin photo gallery' });
  }

  out.sort((a, b) => b.priority - a.priority);
  return { satisfaction, positives: positives.slice(0, 4), suggestions: out };
}
