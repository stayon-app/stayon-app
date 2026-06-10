// StayOn Ops API client — typed wrapper around the backend's /v1/ops/* endpoints.
// Staff log in once; the JWT is attached to every call. RBAC is enforced server-side
// by authStaff(role); the UI mirrors it per role. Every action writes the audit log.

const API_BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE) ||
  'http://localhost:4000';

let token: string | null =
  typeof localStorage !== 'undefined' ? localStorage.getItem('ops_token') : null;

export function setToken(t: string | null) {
  token = t;
  if (typeof localStorage !== 'undefined') {
    if (t) localStorage.setItem('ops_token', t);
    else localStorage.removeItem('ops_token');
  }
}

export class OpsError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

async function req(method: string, path: string, body?: any) {
  const res = await fetch(`${API_BASE}/v1${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json?.error) {
    const e = json?.error || { code: `HTTP_${res.status}`, message: 'Request failed' };
    throw new OpsError(e.code, e.message);
  }
  return json;
}
const get = (p: string) => req('GET', p);
const post = (p: string, b?: any) => req('POST', p, b);

// ── API surface (mirrors backend /v1/ops/*) ────────────────────────────────
export const OpsApi = {
  // auth
  login: (email: string, password: string) =>
    post('/ops/auth/login', { email, password }).then((r) => { setToken(r.accessToken); return r.staff; }),
  logout: () => setToken(null),

  // overview
  dashboard: () => get('/ops/dashboard'),
  audit: () => get('/ops/audit'),

  // review queues
  queues: {
    kyc: () => get('/ops/queues/kyc'),
    listings: () => get('/ops/queues/listings'),
    reels: () => get('/ops/queues/reels'),
    payoutChanges: () => get('/ops/queues/payout-changes'),
  },

  // decisions / actions (each writes audit_log + notifies the user)
  kycDecision: (userId: string, decision: 'verify' | 'reject', reason?: string) => post(`/ops/kyc/${userId}/${decision}`, { reason }),
  approveListing: (id: string) => post(`/ops/listings/${id}/approve`),
  rejectListing: (id: string, reason?: string) => post(`/ops/listings/${id}/reject`, { reason }),
  reelDecision: (id: string, decision: 'approve' | 'reject') => post(`/ops/reels/${id}/${decision}`),
  payoutChangeDecision: (id: string, decision: 'approve' | 'reject') => post(`/ops/payout-changes/${id}/${decision}`),

  // trust & safety
  reports: () => get('/ops/reports'),
  resolveReport: (id: string, action?: string) => post(`/ops/reports/${id}/resolve`, { action }),
  users: () => get('/ops/users'),
  userAction: (id: string, action: 'suspend' | 'ban' | 'reinstate') => post(`/ops/users/${id}/${action}`),
  removeReview: (id: string) => post(`/ops/reviews/${id}/remove`),
  reviews: () => get('/ops/reviews'),

  // finance / bookings
  bookings: () => get('/ops/bookings'),
  bookingDetail: (code: string) => get(`/ops/bookings/${code}`),
  forceCancel: (code: string) => post(`/ops/bookings/${code}/force-cancel`),
  holdPayout: (code: string, reason: string, hostId?: string) => post(`/ops/bookings/${code}/hold`, { reason, hostId }),
  releasePayout: (code: string, hostId?: string) => post(`/ops/bookings/${code}/release`, { hostId }),
  refund: (data: { code: string; amountUSD?: number; reason?: string }) => post('/ops/refunds', data),

  // ── Phase 2 & 3 modules (migration-004) ──
  list: (slug: string) => get(`/ops/${slug}`),
  create: (slug: string, data: any) => post(`/ops/${slug}`, data),
  action: (slug: string, id: string, action: string, data?: any) => post(`/ops/${slug}/${id}/${action}`, data),

  // Guest & Host operations
  guests: () => get('/ops/guests'),
  hosts: () => get('/ops/hosts'),

  // QA (computed)
  qaScorecards: () => get('/ops/qa/scorecards'),
  qaInsights: () => get('/ops/qa/insights'),

  // GDPR
  gdprExport: (userId: string) => post(`/ops/users/${userId}/export`),
  gdprErase: (userId: string) => post(`/ops/users/${userId}/erase`),

  // v3: settlements, satisfaction, dev requests, step-up PIN
  settlements: () => get('/ops/settlements'),
  satisfaction: () => get('/ops/satisfaction'),
  stepUp: (pin: string, module: string) => post('/ops/step-up', { pin, module }),
  setMyPin: (pin: string) => post('/ops/staff/set-pin', { pin }),
  enroll2FA: () => post('/ops/2fa/enroll'),
  verify2FA: (code: string) => post('/ops/2fa/verify', { code }),
  hostAnalytics: (id: string) => get(`/ops/hosts/${id}/analytics`),
  listingDetail: (id: string) => get(`/ops/listings/${id}/detail`),

  // ── v2: fraud/risk, payout ops, verification, dev/release, 360 (migration-005) ──
  riskScan: () => post('/ops/risk-flags/scan'),
  escrow: () => get('/ops/escrow'),
  runPayoutScheduler: () => post('/ops/payouts/run-scheduler'),
  featureFlags: () => get('/ops/feature-flags'),
  toggleFlag: (id: string) => post(`/ops/feature-flags/${id}/toggle`),
  verification: () => get('/ops/verification'),
  user360: (id: string) => get(`/ops/users/${id}/360`),
};

export type StaffRole =
  | 'super_admin' | 'ops_manager' | 'trust_safety' | 'kyc_reviewer'
  | 'content_mod' | 'finance' | 'support' | 'compliance' | 'analyst';
