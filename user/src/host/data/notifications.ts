// Host notifications. Persisted to AsyncStorage. Frontend-only for now.

import AsyncStorage from '@react-native-async-storage/async-storage';

export type NotifType = 'request' | 'confirmed' | 'message' | 'review' | 'payout' | 'checkin' | 'reminder';

export interface HostNotif {
  id: string;
  type: NotifType;
  title: string;
  body: string;
  time: string;
  read: boolean;
  route?: string;        // where tapping navigates
}

const KEY = '@stayon_host_notifs';

export const SEED_NOTIFS: HostNotif[] = [
  { id: 'n1', type: 'request', title: 'New booking request', body: 'Aarav Mehta wants to book Sunlit Loft for 3 nights.', time: '2m', read: false, route: 'ReservationsTab' },
  { id: 'n2', type: 'message', title: 'New message', body: 'Aarav Mehta: “Is early check‑in possible?”', time: '2m', read: false, route: 'InboxTab' },
  { id: 'n3', type: 'checkin', title: 'Check‑in today', body: 'Liam O’Brien checks in at 3:00 PM. Share access details.', time: '1h', read: false },
  { id: 'n4', type: 'payout', title: 'Payout sent', body: 'Your payout for Noah Williams has been processed.', time: '1d', read: true, route: 'Earnings' },
  { id: 'n5', type: 'review', title: 'New review', body: 'Emma Davis left you a 5‑star review.', time: '2d', read: true, route: 'Reviews' },
  { id: 'n6', type: 'reminder', title: 'Review your guest', body: 'Noah Williams checked out — leave a review.', time: '3d', read: true, route: 'Reviews' },
];

const ICON: Record<NotifType, string> = {
  request: 'hand-left', confirmed: 'checkmark-circle', message: 'chatbubble-ellipses',
  review: 'star', payout: 'cash', checkin: 'key', reminder: 'time',
};
export const notifIcon = (t: NotifType) => ICON[t];

export async function getNotifs(): Promise<HostNotif[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED_NOTIFS)).catch(() => {});
  return SEED_NOTIFS;
}

export async function markAllRead(): Promise<HostNotif[]> {
  const all = await getNotifs();
  const next = all.map((n) => ({ ...n, read: true }));
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}
