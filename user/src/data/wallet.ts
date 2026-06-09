// In-app "Trip Wallet" — confirmed bookings stored as Apple-Wallet-style passes.
// Pure client-side persistence (AsyncStorage); no Apple Developer signing required.
import AsyncStorage from '@react-native-async-storage/async-storage';

export const WALLET_STORAGE_KEY = '@stayon_wallet';

export interface WalletPass {
  id: string;
  confirmationCode: string;
  propertyTitle: string;
  location: string;
  image?: string;
  checkIn: string;   // display string e.g. "Jul 3, 2026"
  checkOut: string;
  nights: number;
  guests: number;
  total: number;     // USD
  latitude?: number;
  longitude?: number;
  status: 'confirmed' | 'pending';
  createdAt: number;
}

export async function getPasses(): Promise<WalletPass[]> {
  try {
    const raw = await AsyncStorage.getItem(WALLET_STORAGE_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw) as WalletPass[];
    if (!Array.isArray(arr)) return [];
    // Self-heal older data where `image` was stored as a {uri,caption} object.
    const cleaned = arr.map((p) => ({ ...p, image: toPassUri((p as any).image) }));
    return cleaned.sort((a, b) => b.createdAt - a.createdAt);
  } catch {
    return [];
  }
}

function toPassUri(v: any): string | undefined {
  if (typeof v === 'string') return v;
  if (v && typeof v.uri === 'string') return v.uri;
  return undefined;
}

export async function addPass(pass: WalletPass): Promise<WalletPass[]> {
  const existing = await getPasses();
  // de-dupe by confirmation code
  const next = [pass, ...existing.filter((p) => p.confirmationCode !== pass.confirmationCode)];
  await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(next));
  return next;
}

export async function removePass(id: string): Promise<WalletPass[]> {
  const existing = await getPasses();
  const next = existing.filter((p) => p.id !== id);
  await AsyncStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(next));
  return next;
}
