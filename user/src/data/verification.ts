import AsyncStorage from '@react-native-async-storage/async-storage';

// Identity verification state — MANDATORY before a guest can book (mirrors the website).
// Verified once, then persisted so a returning verified guest books straight away.
const VERIFIED_KEY = '@stayon_verified';

export async function isVerified(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(VERIFIED_KEY);
    if (raw) return JSON.parse(raw)?.verified === true;
  } catch {
    // fall through
  }
  return false;
}

export async function setVerified(verified: boolean): Promise<void> {
  try {
    if (verified) await AsyncStorage.setItem(VERIFIED_KEY, JSON.stringify({ verified: true, at: Date.now() }));
    else await AsyncStorage.removeItem(VERIFIED_KEY);
  } catch {
    // best-effort persistence
  }
}
