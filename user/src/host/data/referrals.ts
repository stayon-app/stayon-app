// Host referral program (frontend mock). A stable code + a list of invited hosts
// with their progress. StayOn's reward is non-cash (featured placement / perks),
// in keeping with the 0%-fee model.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReferralStatus = 'invited' | 'signed_up' | 'first_listing' | 'first_booking';

export interface Referral {
  id: string;
  name: string;
  avatar: string;
  status: ReferralStatus;
  joined: string;
}

const CODE_KEY = '@stayon_host_refcode';
const av = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0D9488&color=fff`;

export const STATUS_STEPS: { key: ReferralStatus; label: string }[] = [
  { key: 'invited', label: 'Invited' },
  { key: 'signed_up', label: 'Signed up' },
  { key: 'first_listing', label: 'Listed a place' },
  { key: 'first_booking', label: 'Got first booking' },
];

const SEED: Referral[] = [
  { id: 'rf1', name: 'Priya Nair', avatar: av('Priya Nair'), status: 'first_booking', joined: 'May 2026' },
  { id: 'rf2', name: 'Marcus Lee', avatar: av('Marcus Lee'), status: 'first_listing', joined: 'May 2026' },
  { id: 'rf3', name: 'Sara Khan', avatar: av('Sara Khan'), status: 'invited', joined: 'Jun 2026' },
];

/** A stable, friendly referral code generated once and persisted. */
export async function getReferralCode(): Promise<string> {
  try {
    const saved = await AsyncStorage.getItem(CODE_KEY);
    if (saved) return saved;
  } catch {}
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'HOST-';
  for (let i = 0; i < 5; i++) code += letters[Math.floor(Math.random() * letters.length)];
  try { await AsyncStorage.setItem(CODE_KEY, code); } catch {}
  return code;
}

export async function getReferrals(): Promise<Referral[]> {
  return SEED;
}

export function referralStats(list: Referral[]) {
  const joined = list.filter((r) => r.status !== 'invited').length;
  const earning = list.filter((r) => r.status === 'first_booking').length;
  return { invited: list.length, joined, earning };
}
