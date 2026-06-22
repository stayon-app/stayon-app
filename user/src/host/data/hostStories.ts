// Hosting stories — short blog posts a host writes (tips, their place's story,
// neighbourhood guides). Submitted for ops review, then published. Mock store.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type StoryStatus = 'pending' | 'published' | 'rejected';

export interface HostStory {
  id: string;
  title: string;
  body: string;
  location?: string;  // where this story / place is about
  cover: string;
  status: StoryStatus;
  createdAt: number;
}

const KEY = '@stayon_host_stories';
const img = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

const SEED: HostStory[] = [
  { id: 'st1', title: 'How I turned my spare loft into a 5★ stay', cover: img('photo-1522708323590-d24dbb6b0267'),
    location: 'Hyderabad, India',
    body: 'When I started hosting, the loft was just a quiet room I never used. A deep clean, a fresh coat of paint, bright photos and a few thoughtful touches — fast Wi‑Fi, blackout curtains, a little welcome note — and the bookings followed. My biggest lesson: reply fast and keep the place spotless. The reviews take care of the rest.',
    status: 'published', createdAt: 4 },
  { id: 'st2', title: 'A local’s guide to my neighbourhood', cover: img('photo-1504609813442-a8924e83f76e'),
    location: 'Lisbon, Portugal',
    body: 'Guests always ask where to eat, so I wrote it down. Start your morning at the little bakery two streets over, spend the afternoon at the riverside market, and end with sunset from the old fort. Skip the tourist strip — the best food is in the lanes behind it.',
    status: 'published', createdAt: 3 },
];

export async function getStories(): Promise<HostStory[]> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED)).catch(() => {});
  return SEED;
}

export async function addStory(input: { title: string; body: string; cover: string; location?: string }): Promise<HostStory[]> {
  const all = await getStories();
  const next: HostStory[] = [
    { id: `st_${Date.now()}`, title: input.title.trim() || 'Untitled story', body: input.body.trim(), location: input.location?.trim() || undefined, cover: input.cover, status: 'pending', createdAt: Date.now() },
    ...all,
  ];
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function deleteStory(id: string): Promise<HostStory[]> {
  const all = await getStories();
  const next = all.filter((s) => s.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export const STORY_STATUS: Record<StoryStatus, { label: string; icon: string }> = {
  pending: { label: 'Pending review', icon: 'hourglass-outline' },
  published: { label: 'Published', icon: 'checkmark-circle' },
  rejected: { label: 'Not approved', icon: 'close-circle' },
};
