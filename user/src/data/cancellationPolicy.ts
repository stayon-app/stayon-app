// ---------------------------------------------------------------------------
// Cancellation policy — shared source of truth (stays + experiences).
// A host picks one preset tier; screens read these rules to show the policy and
// to compute refunds. Refund % applies to the booking amount, NOT to taxes.
// ---------------------------------------------------------------------------

export type CancellationTier = 'Flexible' | 'Moderate' | 'Strict';

export interface CancellationRule {
  minDaysBefore: number;
  refundPercent: number; // 0–100
}

export interface CancellationPolicySpec {
  tier: CancellationTier;
  summary: string;
  rules: CancellationRule[]; // sorted descending by minDaysBefore
}

export const CANCELLATION_POLICIES: Record<CancellationTier, CancellationPolicySpec> = {
  Flexible: {
    tier: 'Flexible',
    summary: 'Full refund up to 24 hours before check-in.',
    rules: [
      { minDaysBefore: 1, refundPercent: 100 },
      { minDaysBefore: 0, refundPercent: 0 },
    ],
  },
  Moderate: {
    tier: 'Moderate',
    summary: 'Full refund up to 5 days before, then 50%.',
    rules: [
      { minDaysBefore: 5, refundPercent: 100 },
      { minDaysBefore: 1, refundPercent: 50 },
      { minDaysBefore: 0, refundPercent: 0 },
    ],
  },
  Strict: {
    tier: 'Strict',
    summary: 'Full refund up to 14 days before, then 50% up to 7 days.',
    rules: [
      { minDaysBefore: 14, refundPercent: 100 },
      { minDaysBefore: 7, refundPercent: 50 },
      { minDaysBefore: 0, refundPercent: 0 },
    ],
  },
};

export const DEFAULT_CANCELLATION: CancellationTier = 'Moderate';

const TIERS: CancellationTier[] = ['Flexible', 'Moderate', 'Strict'];

export function normalizeTier(input?: string | null): CancellationTier {
  if (input) {
    const match = TIERS.find((t) => t.toLowerCase() === String(input).trim().toLowerCase());
    if (match) return match;
  }
  return DEFAULT_CANCELLATION;
}

export function getPolicy(tier?: string | null): CancellationPolicySpec {
  return CANCELLATION_POLICIES[normalizeTier(tier)];
}

export function policySummary(tier?: string | null): string {
  return getPolicy(tier).summary;
}

function fullRefundDays(spec: CancellationPolicySpec): number | null {
  const full = spec.rules.find((r) => r.refundPercent === 100);
  return full ? full.minDaysBefore : null;
}

export function freeCancelCutoff(tier: string | null | undefined, checkIn: Date): Date | null {
  const days = fullRefundDays(getPolicy(tier));
  if (days == null) return null;
  const d = new Date(checkIn);
  d.setDate(d.getDate() - days);
  return d;
}

function daysUntil(checkIn: Date, now: Date): number {
  const MS = 24 * 60 * 60 * 1000;
  return Math.floor((checkIn.getTime() - now.getTime()) / MS);
}

export function refundPercentFor(tier: string | null | undefined, checkIn: Date, now: Date = new Date()): number {
  const spec = getPolicy(tier);
  const left = daysUntil(checkIn, now);
  for (const rule of spec.rules) {
    if (left >= rule.minDaysBefore) return rule.refundPercent;
  }
  return 0;
}

export function computeRefund(
  tier: string | null | undefined, checkIn: Date, now: Date, refundableAmount: number,
): { percent: number; amount: number } {
  const percent = refundPercentFor(tier, checkIn, now);
  const amount = Math.round((refundableAmount * percent) / 100 * 100) / 100;
  return { percent, amount };
}

export function describePolicy(tier?: string | null, checkIn?: Date): string {
  const spec = getPolicy(tier);
  const fullDays = fullRefundDays(spec);
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  const lines: string[] = [];
  if (checkIn && fullDays != null) {
    const cutoff = freeCancelCutoff(tier, checkIn);
    if (cutoff) lines.push(`Free cancellation before ${fmt(cutoff)} (a full refund).`);
  } else if (fullDays != null) {
    lines.push(
      fullDays === 0
        ? 'Free cancellation any time before it starts.'
        : `Free cancellation up to ${fullDays} day${fullDays === 1 ? '' : 's'} before it starts.`,
    );
  }

  const partial = spec.rules.find((r) => r.refundPercent > 0 && r.refundPercent < 100);
  if (partial) {
    lines.push(`After that, cancel at least ${partial.minDaysBefore} day${partial.minDaysBefore === 1 ? '' : 's'} ahead for a ${partial.refundPercent}% refund.`);
  }
  lines.push('Closer to the date, the booking is non-refundable.');
  return lines.join(' ');
}
