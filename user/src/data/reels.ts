// StayReels — short stay videos. Anyone (guests or hosts) can submit a reel;
// it goes to "Pending review" and the StayOn operations team approves it before
// it appears live in the feed. Frontend-only mock (no real backend/upload).

import AsyncStorage from '@react-native-async-storage/async-storage';

export type ReelStatus = 'pending' | 'live' | 'rejected';

export interface Reel {
  id: string;
  title: string;        // stay name / what it shows
  location: string;
  caption: string;
  thumbnail: string;    // cover image
  videoUri?: string;    // picked local video (mock)
  views: string;        // e.g. "12K"
  author: 'you' | 'host' | 'community';
  status: ReelStatus;
  createdAt: number;
}

const KEY = '@stayon_reels';

const SEED: Reel[] = [
  { id: 'r1', title: 'Malibu Cliff Villa', location: 'Malibu, USA', caption: 'Sunset from the infinity pool 🌅', thumbnail: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=700&fit=crop', views: '12K', author: 'community', status: 'live', createdAt: 5 },
  { id: 'r2', title: 'Miami Beach House', location: 'Miami, USA', caption: 'Morning swim & coffee', thumbnail: 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=700&fit=crop', views: '8.4K', author: 'host', status: 'live', createdAt: 4 },
  { id: 'r3', title: 'Santorini Cave Suite', location: 'Santorini, Greece', caption: 'Blue domes & golden hour', thumbnail: 'https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?w=400&h=700&fit=crop', views: '22K', author: 'community', status: 'live', createdAt: 3 },
  { id: 'r4', title: 'NYC Penthouse', location: 'New York, USA', caption: 'Skyline views all night', thumbnail: 'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400&h=700&fit=crop', views: '31K', author: 'host', status: 'live', createdAt: 2 },
];

export async function getReels(): Promise<Reel[]> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED)).catch(() => {});
  return SEED;
}

export async function getLiveReels(): Promise<Reel[]> {
  return (await getReels()).filter((r) => r.status === 'live');
}

/**
 * The StayReels feed — every published reel from users & hosts, PLUS the
 * viewer's own posts (so what you post appears for you immediately, marked
 * "in review" until the ops team approves it for everyone). Newest first.
 */
export async function getFeedReels(): Promise<Reel[]> {
  const all = await getReels();
  return all
    .filter((r) => r.status === 'live' || r.author === 'you' || r.author === 'host')
    .sort((a, b) => b.createdAt - a.createdAt);
}

export async function getMyReels(): Promise<Reel[]> {
  return (await getReels()).filter((r) => r.author === 'you');
}

export async function submitReel(
  input: { title: string; location: string; caption: string; thumbnail: string; videoUri?: string; author?: 'you' | 'host' }
): Promise<Reel[]> {
  const all = await getReels();
  const reel: Reel = {
    id: `reel_${Date.now()}`,
    title: input.title.trim() || 'My StayReel',
    location: input.location.trim(),
    caption: input.caption.trim(),
    thumbnail: input.thumbnail,
    videoUri: input.videoUri,
    views: '0',
    author: input.author ?? 'you',
    status: 'pending',     // backend ops review before going live
    createdAt: Date.now(),
  };
  const next = [reel, ...all];
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function deleteReel(id: string): Promise<Reel[]> {
  const all = await getReels();
  const next = all.filter((r) => r.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export const STATUS_META: Record<ReelStatus, { label: string; icon: string }> = {
  pending: { label: 'Pending review', icon: 'hourglass-outline' },
  live: { label: 'Live', icon: 'checkmark-circle' },
  rejected: { label: 'Not approved', icon: 'close-circle' },
};
