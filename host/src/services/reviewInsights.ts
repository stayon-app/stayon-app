// Review intelligence — surfaces what guests love and what needs attention,
// using simple keyword/sentiment heuristics over guest reviews (on-device).

import type { GuestReview } from '../data/hostReviews';

const THEMES: { key: string; label: string; icon: string; words: string[] }[] = [
  { key: 'clean', label: 'Cleanliness', icon: 'sparkles', words: ['clean', 'spotless', 'tidy', 'immaculate', 'fresh'] },
  { key: 'location', label: 'Location', icon: 'location', words: ['location', 'central', 'close', 'walk', 'nearby', 'convenient'] },
  { key: 'comfort', label: 'Comfort', icon: 'bed', words: ['comfortable', 'comfy', 'cozy', 'bed', 'quiet', 'spacious'] },
  { key: 'host', label: 'Great host', icon: 'happy', words: ['host', 'responsive', 'helpful', 'welcoming', 'friendly', 'communication'] },
  { key: 'value', label: 'Value', icon: 'pricetag', words: ['value', 'worth', 'affordable', 'reasonable', 'price'] },
  { key: 'pool', label: 'The pool', icon: 'water', words: ['pool', 'swim'] },
  { key: 'view', label: 'The view', icon: 'image', words: ['view', 'scenic', 'sunset', 'balcony'] },
  { key: 'wifi', label: 'Wi‑Fi / workspace', icon: 'wifi', words: ['wifi', 'wi-fi', 'internet', 'workspace', 'work'] },
  { key: 'checkin', label: 'Easy check‑in', icon: 'key', words: ['check-in', 'check in', 'self check', 'easy access', 'smooth'] },
];

const NEGATIVE = ['noise', 'noisy', 'dirty', 'broken', 'cold', 'smell', 'late', 'rude', 'issue', 'problem', 'disappoint', 'not clean', 'leak', 'slow', 'small'];

export interface LovedTheme { key: string; label: string; icon: string; count: number; }

export interface ReviewIntel {
  avg: number;
  total: number;
  positiveCount: number;          // reviews rated >= 4
  loved: LovedTheme[];            // top themes guests mention
  attention: GuestReview[];       // low/negative or unanswered, worth a response
  unansweredCount: number;
}

export function buildReviewIntel(reviews: GuestReview[]): ReviewIntel {
  const total = reviews.length;
  const avg = total ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0;
  const positive = reviews.filter((r) => r.rating >= 4);

  const counts: Record<string, LovedTheme> = {};
  positive.forEach((r) => {
    const text = (r.text || '').toLowerCase();
    THEMES.forEach((th) => {
      if (th.words.some((w) => text.includes(w))) {
        counts[th.key] ||= { key: th.key, label: th.label, icon: th.icon, count: 0 };
        counts[th.key].count++;
      }
    });
  });
  const loved = Object.values(counts).sort((a, b) => b.count - a.count).slice(0, 6);

  const attention = reviews.filter((r) => {
    const text = (r.text || '').toLowerCase();
    const negative = NEGATIVE.some((w) => text.includes(w));
    return r.rating < 4 || (r.rating < 5 && negative) || !r.response;
  }).sort((a, b) => a.rating - b.rating);

  return {
    avg, total,
    positiveCount: positive.length,
    loved,
    attention,
    unansweredCount: reviews.filter((r) => !r.response).length,
  };
}
