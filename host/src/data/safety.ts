// Safety & security settings for the host's place(s). Persisted to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SafetySettings {
  accessCode: string;            // smart-lock / door code
  emergencyName: string;
  emergencyPhone: string;
  devices: {
    smokeAlarm: boolean;
    coAlarm: boolean;
    fireExtinguisher: boolean;
    firstAid: boolean;
    exteriorCamera: boolean;
  };
  cameraDisclosure: string;      // where exterior cameras are, if any
  requireVerifiedGuests: boolean;
}

const KEY = '@stayon_host_safety';

const DEFAULT: SafetySettings = {
  accessCode: '',
  emergencyName: '',
  emergencyPhone: '',
  devices: { smokeAlarm: true, coAlarm: false, fireExtinguisher: false, firstAid: true, exteriorCamera: false },
  cameraDisclosure: '',
  requireVerifiedGuests: true,
};

export async function getSafety(): Promise<SafetySettings> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) return { ...DEFAULT, ...JSON.parse(raw), devices: { ...DEFAULT.devices, ...(JSON.parse(raw).devices ?? {}) } };
  } catch {}
  return DEFAULT;
}

export async function setSafety(patch: Partial<SafetySettings>): Promise<SafetySettings> {
  const cur = await getSafety();
  const next = { ...cur, ...patch, devices: { ...cur.devices, ...(patch.devices ?? {}) } };
  try { await AsyncStorage.setItem(KEY, JSON.stringify(next)); } catch {}
  return next;
}

export const DEVICE_LABELS: { key: keyof SafetySettings['devices']; label: string; icon: string }[] = [
  { key: 'smokeAlarm', label: 'Smoke alarm', icon: 'flame-outline' },
  { key: 'coAlarm', label: 'Carbon‑monoxide alarm', icon: 'cloud-outline' },
  { key: 'fireExtinguisher', label: 'Fire extinguisher', icon: 'water-outline' },
  { key: 'firstAid', label: 'First‑aid kit', icon: 'medkit-outline' },
  { key: 'exteriorCamera', label: 'Exterior security camera', icon: 'videocam-outline' },
];
