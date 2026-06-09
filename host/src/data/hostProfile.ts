// Minimal host profile — the editable public profile (name/avatar/bio). The
// verified identity (KYC) is separate and locked. Persisted to AsyncStorage.
// Real name flows in from auth/KYC later; seeded for now so the home greeting
// is personalised.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HostProfile {
  name: string;       // full name, e.g. "Sai Prakash Reddy"
  avatar?: string;
  bio?: string;
  languages?: string[];
}

const KEY = '@stayon_host_profile';
const DEFAULT: HostProfile = { name: 'Sai Prakash Reddy', languages: ['English'] };

export async function getHostProfile(): Promise<HostProfile> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {}
  return DEFAULT;
}

export async function setHostProfile(p: Partial<HostProfile>): Promise<void> {
  const cur = await getHostProfile();
  try { await AsyncStorage.setItem(KEY, JSON.stringify({ ...cur, ...p })); } catch {}
}

/** First name for a friendly greeting. */
export function firstName(name: string): string {
  return (name || '').trim().split(/\s+/)[0] || 'host';
}
