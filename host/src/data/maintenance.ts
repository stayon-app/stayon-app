// Maintenance log + damage register. Both persisted to AsyncStorage.
// Maintenance = host-reported upkeep tasks. Damages = reports filed at checkout.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type IssueStatus = 'open' | 'in_progress' | 'fixed';
export type IssueCategory = 'cleaning' | 'plumbing' | 'electrical' | 'appliance' | 'furniture' | 'hvac' | 'safety' | 'other';

export interface MaintenanceIssue {
  id: string;
  listingId?: string;
  listingTitle?: string;
  title: string;
  category: IssueCategory;
  status: IssueStatus;
  note?: string;
  createdAt: number;
}

export interface DamageReport {
  id: string;
  reservationId: string;
  guestName: string;
  listingTitle: string;
  note: string;
  photos: string[];
  createdAt: number;
  resolved: boolean;
}

const M_KEY = '@stayon_host_maintenance';
const D_KEY = '@stayon_host_damages';

export const ISSUE_CATEGORIES: { key: IssueCategory; label: string; icon: string }[] = [
  { key: 'cleaning', label: 'Cleaning', icon: 'sparkles-outline' },
  { key: 'plumbing', label: 'Plumbing', icon: 'water-outline' },
  { key: 'electrical', label: 'Electrical', icon: 'flash-outline' },
  { key: 'appliance', label: 'Appliance', icon: 'tv-outline' },
  { key: 'furniture', label: 'Furniture', icon: 'bed-outline' },
  { key: 'hvac', label: 'Heating / AC', icon: 'thermometer-outline' },
  { key: 'safety', label: 'Safety', icon: 'shield-checkmark-outline' },
  { key: 'other', label: 'Other', icon: 'construct-outline' },
];

export const STATUS_META: Record<IssueStatus, { label: string; next: IssueStatus }> = {
  open: { label: 'Open', next: 'in_progress' },
  in_progress: { label: 'In progress', next: 'fixed' },
  fixed: { label: 'Fixed', next: 'open' },
};

// Seed a couple so the screen isn't empty for the demo.
const SEED_ISSUES: MaintenanceIssue[] = [
  { id: 'mi1', listingTitle: 'Sunlit Loft in the City', title: 'AC not cooling in bedroom', category: 'hvac', status: 'in_progress', note: 'Technician booked for this week.', createdAt: 3 },
  { id: 'mi2', listingTitle: 'Palm Garden Villa', title: 'Replace pool filter', category: 'other', status: 'open', createdAt: 2 },
];

export async function getIssues(): Promise<MaintenanceIssue[]> {
  try { const raw = await AsyncStorage.getItem(M_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  await AsyncStorage.setItem(M_KEY, JSON.stringify(SEED_ISSUES)).catch(() => {});
  return SEED_ISSUES;
}
async function writeIssues(list: MaintenanceIssue[]) { try { await AsyncStorage.setItem(M_KEY, JSON.stringify(list)); } catch {} }

export async function addIssue(i: Omit<MaintenanceIssue, 'id' | 'createdAt' | 'status'> & { status?: IssueStatus }): Promise<MaintenanceIssue[]> {
  const all = await getIssues();
  const next: MaintenanceIssue[] = [{ ...i, status: i.status ?? 'open', id: `mi_${all.length + 1}_${Math.round(Math.random() * 1e6)}`, createdAt: all.length + 10 }, ...all];
  await writeIssues(next);
  return next;
}

export async function cycleIssueStatus(id: string): Promise<MaintenanceIssue[]> {
  const all = await getIssues();
  const next = all.map((x) => (x.id === id ? { ...x, status: STATUS_META[x.status].next } : x));
  await writeIssues(next);
  return next;
}

export async function deleteIssue(id: string): Promise<MaintenanceIssue[]> {
  const all = await getIssues();
  const next = all.filter((x) => x.id !== id);
  await writeIssues(next);
  return next;
}

// ── Damage reports ─────────────────────────────────────────────────────────
export async function getDamages(): Promise<DamageReport[]> {
  try { const raw = await AsyncStorage.getItem(D_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  return [];
}

export async function addDamage(d: Omit<DamageReport, 'id' | 'createdAt' | 'resolved'>): Promise<DamageReport[]> {
  const all = await getDamages();
  const next: DamageReport[] = [{ ...d, id: `dmg_${all.length + 1}_${Math.round(Math.random() * 1e6)}`, createdAt: all.length + 1, resolved: false }, ...all];
  try { await AsyncStorage.setItem(D_KEY, JSON.stringify(next)); } catch {}
  return next;
}

export async function resolveDamage(id: string): Promise<DamageReport[]> {
  const all = await getDamages();
  const next = all.map((x) => (x.id === id ? { ...x, resolved: !x.resolved } : x));
  try { await AsyncStorage.setItem(D_KEY, JSON.stringify(next)); } catch {}
  return next;
}
