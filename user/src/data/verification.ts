import AsyncStorage from '@react-native-async-storage/async-storage';

// Identity verification state before a guest can book (mirrors the website).
// Verified once, then persisted so a returning verified guest books straight away.
const VERIFIED_KEY = '@stayon_verified';

// TEMP: the govt-ID verification pipeline isn't finished yet, so booking is
// gated on phone-OTP login only for now. Flip this back to `true` once
// identity verification is fully working end-to-end.
const REQUIRE_IDENTITY_VERIFICATION = false;

export async function isVerified(): Promise<boolean> {
  if (!REQUIRE_IDENTITY_VERIFICATION) return true;
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
