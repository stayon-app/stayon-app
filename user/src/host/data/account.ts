// Host account state: identity verification (KYC) + payout method.
//
// Identity is FIXED once verified — the legal name & documents can't be edited
// afterwards (only the public profile is editable). Payout method is editable.
// Frontend-only mock persisted to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type KycStatus = 'unverified' | 'pending' | 'verified';

export interface Identity {
  status: KycStatus;
  legalName: string;
  dob: string;          // "1994-05-12"
  country: string;
  idType: 'passport' | 'driving_license' | 'national_id' | '';
  idLast4: string;      // last 4 of the document number, for display
  submittedAt?: string;
}

export type PayoutKind = 'bank' | 'upi' | 'paypal';

export interface Payout {
  kind: PayoutKind | '';
  label: string;        // masked, e.g. "HDFC •••• 4821" or "name@upi"
  holder: string;
  isDefault: boolean;
}

const IDENT_KEY = '@stayon_host_identity';
const PAYOUT_KEY = '@stayon_host_payout';
const PAYOUT_REQ_KEY = '@stayon_host_payout_request';

const DEFAULT_IDENTITY: Identity = {
  status: 'unverified', legalName: '', dob: '', country: '', idType: '', idLast4: '',
};

export async function getIdentity(): Promise<Identity> {
  try {
    const raw = await AsyncStorage.getItem(IDENT_KEY);
    if (raw) return { ...DEFAULT_IDENTITY, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT_IDENTITY;
}

export async function saveIdentity(i: Partial<Identity>): Promise<Identity> {
  const cur = await getIdentity();
  const next = { ...cur, ...i };
  try { await AsyncStorage.setItem(IDENT_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export async function getPayout(): Promise<Payout | null> {
  try {
    const raw = await AsyncStorage.getItem(PAYOUT_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function savePayout(p: Payout): Promise<void> {
  try { await AsyncStorage.setItem(PAYOUT_KEY, JSON.stringify(p)); } catch {}
}

export async function clearPayout(): Promise<void> {
  try { await AsyncStorage.removeItem(PAYOUT_KEY); } catch {}
}

// ── Payout change request ────────────────────────────────────────────────────
// Changing bank/payout details on an existing method is NOT applied instantly.
// The host submits a request; the StayOn operations team verifies the host's
// identity matches the new account, then approves — at which point it updates in
// both the operations console and the host app. Until then the old method stays.

export type PayoutReqStatus = 'pending' | 'approved' | 'rejected';

export interface PayoutChangeRequest {
  id: string;
  requested: Payout;        // the new details awaiting verification
  status: PayoutReqStatus;
  submittedAt: number;
  reviewedNote?: string;    // ops note on approval/rejection
}

export async function getPayoutRequest(): Promise<PayoutChangeRequest | null> {
  try {
    const raw = await AsyncStorage.getItem(PAYOUT_REQ_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return null;
}

export async function requestPayoutChange(requested: Payout): Promise<PayoutChangeRequest> {
  const req: PayoutChangeRequest = { id: `payreq_${Date.now()}`, requested, status: 'pending', submittedAt: Date.now() };
  try { await AsyncStorage.setItem(PAYOUT_REQ_KEY, JSON.stringify(req)); } catch {}
  return req;
}

export async function cancelPayoutRequest(): Promise<void> {
  try { await AsyncStorage.removeItem(PAYOUT_REQ_KEY); } catch {}
}

/**
 * Operations-side approval: applies the requested details to the live payout
 * method and clears the request. (In production the ops console calls this; the
 * host app then reflects the verified, updated method.)
 */
export async function approvePayoutRequest(): Promise<Payout | null> {
  const req = await getPayoutRequest();
  if (!req || req.status !== 'pending') return null;
  await savePayout(req.requested);
  await cancelPayoutRequest();
  return req.requested;
}
