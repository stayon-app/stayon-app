// Cancellation policy — website source of truth (mirrors the app).
export type CancellationTier = 'Flexible' | 'Moderate' | 'Strict';

const POLICIES: Record<CancellationTier, { tier: CancellationTier; summary: string }> = {
  Flexible: { tier: 'Flexible', summary: 'Full refund up to 24 hours before it starts.' },
  Moderate: { tier: 'Moderate', summary: 'Full refund up to 5 days before, then 50%.' },
  Strict: { tier: 'Strict', summary: 'Full refund up to 14 days before, then 50% up to 7 days.' },
};

const DEFAULT: CancellationTier = 'Moderate';

export function getPolicy(tier?: string | null) {
  const key = (['Flexible', 'Moderate', 'Strict'] as CancellationTier[])
    .find((t) => t.toLowerCase() === String(tier || '').trim().toLowerCase()) || DEFAULT;
  return POLICIES[key];
}

export function policySummary(tier?: string | null): string {
  return getPolicy(tier).summary;
}
