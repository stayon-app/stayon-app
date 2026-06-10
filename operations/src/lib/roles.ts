// RBAC — which Ops modules each staff role can open. Mirrors the backend's
// authStaff(role) guards and the permissions matrix in STAYON_OPS_SYSTEM_PLAN.md.
// The backend is the source of truth; this just hides modules a role can't use.

import type { StaffRole } from '../api/opsApi';

export type ModuleKey =
  | 'dashboard' | 'guests' | 'hosts' | 'kyc' | 'verification' | 'listings' | 'maintenance'
  | 'reels' | 'reports' | 'bookings' | 'users' | 'finance' | 'escrow' | 'bank' | 'settlements'
  | 'risk' | 'support' | 'disputes' | 'safety' | 'qa' | 'insights' | 'satisfaction'
  | 'markets' | 'partners' | 'field' | 'compliance' | 'devops' | 'devrequests' | 'audit';

// Sensitive boxes — opening one requires a step-up PIN (re-auth), then it's
// unlocked for the session. (The secure version of "each box has a password".)
export const SENSITIVE: ModuleKey[] = ['kyc', 'verification', 'finance', 'escrow', 'bank', 'settlements', 'compliance'];

export const MODULES: { key: ModuleKey; label: string; group: string }[] = [
  { key: 'dashboard', label: 'Dashboard', group: 'Overview' },
  // Guest (user) side operations
  { key: 'guests', label: 'Guests', group: 'Guest Operations' },
  { key: 'verification', label: 'Verification (KYC)', group: 'Guest Operations' },
  // Host side operations
  { key: 'hosts', label: 'Hosts', group: 'Host Operations' },
  { key: 'listings', label: 'Listings', group: 'Host Operations' },
  { key: 'maintenance', label: 'Maintenance', group: 'Host Operations' },
  // Trust & safety
  { key: 'kyc', label: 'KYC review', group: 'Trust & Safety' },
  { key: 'risk', label: 'Fraud & Risk', group: 'Trust & Safety' },
  { key: 'reels', label: 'Reels', group: 'Trust & Safety' },
  { key: 'reports', label: 'Reports', group: 'Trust & Safety' },
  { key: 'users', label: 'All users', group: 'Trust & Safety' },
  { key: 'safety', label: 'Safety cases', group: 'Trust & Safety' },
  // Support
  { key: 'support', label: 'Support tickets', group: 'Support' },
  { key: 'disputes', label: 'Disputes', group: 'Support' },
  // Finance & payouts
  { key: 'bookings', label: 'Bookings', group: 'Finance' },
  { key: 'finance', label: 'Refunds', group: 'Finance' },
  { key: 'escrow', label: 'Payout escrow', group: 'Finance' },
  { key: 'bank', label: 'Bank verification', group: 'Finance' },
  { key: 'settlements', label: 'Settlements & tax', group: 'Finance' },
  // Quality
  { key: 'qa', label: 'Host scorecards', group: 'Quality' },
  { key: 'insights', label: 'Review insights', group: 'Quality' },
  { key: 'satisfaction', label: 'Satisfaction', group: 'Quality' },
  // Growth & compliance
  { key: 'markets', label: 'Markets', group: 'Growth' },
  { key: 'partners', label: 'Partners', group: 'Growth' },
  { key: 'field', label: 'Field tasks', group: 'Growth' },
  { key: 'compliance', label: 'Compliance / GDPR', group: 'Compliance' },
  // Dev & release ops
  { key: 'devops', label: 'Feature flags / Releases', group: 'Dev & Release' },
  { key: 'devrequests', label: 'Dev requests', group: 'Dev & Release' },
  { key: 'audit', label: 'Audit log', group: 'Overview' },
];

// role → modules it may open. super_admin gets everything.
const ACCESS: Record<StaffRole, ModuleKey[]> = {
  super_admin: MODULES.map((m) => m.key),
  ops_manager: MODULES.map((m) => m.key),
  trust_safety: ['dashboard', 'guests', 'hosts', 'kyc', 'verification', 'risk', 'listings', 'reports', 'bookings', 'users', 'safety', 'audit'],
  kyc_reviewer: ['kyc', 'verification'],
  content_mod: ['listings', 'reels', 'reports', 'maintenance'],
  finance: ['dashboard', 'bookings', 'finance', 'escrow', 'bank', 'settlements', 'risk', 'disputes', 'audit'],
  support: ['dashboard', 'guests', 'reports', 'bookings', 'support', 'disputes', 'safety'],
  compliance: ['dashboard', 'markets', 'compliance', 'audit'],
  analyst: ['dashboard', 'hosts', 'qa', 'insights', 'satisfaction', 'devrequests', 'audit'],
};

export function canAccess(role: StaffRole, module: ModuleKey): boolean {
  return ACCESS[role]?.includes(module) ?? false;
}

export function modulesFor(role: StaffRole) {
  return MODULES.filter((m) => canAccess(role, m.key));
}
