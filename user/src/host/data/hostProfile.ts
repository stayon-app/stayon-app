// Minimal host profile — the editable public profile (name/avatar/bio). The
// verified identity (KYC) is separate and locked. Persisted to AsyncStorage.
// Real name flows in from auth/KYC later; seeded for now so the home greeting
// is personalised.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface HostProfile {
  name: string;       // full name, e.g. "Sai Prakash Reddy"
  avatar?: string;
  bio?: string;             // short tagline
  about?: string;           // longer "about me", shown to guests
  languages?: string[];
  work?: string;            // what they do
  funFact?: string;         // a personable detail
  hostingSince?: string;    // e.g. "2024"
}

const KEY = '@stayon_host_profile';
const DEFAULT: HostProfile = {
  name: 'Sai Prakash Reddy',
  bio: 'Loves hosting & sharing the city',
  about: 'Hi! I’m a local who loves meeting travellers from everywhere. I keep my place spotless, reply fast, and I’m always happy to share my favourite spots nearby. Looking forward to hosting you!',
  languages: ['English', 'Hindi', 'Telugu'],
  work: 'Designer & weekend host',
  funFact: 'Can recommend the best filter coffee in town ☕',
  hostingSince: '2024',
};

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
