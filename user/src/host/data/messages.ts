// Host inbox — guest↔host conversation threads. Persisted to AsyncStorage.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ChatMessage { id: string; text: string; sender: 'host' | 'guest'; time: string; }
export interface Thread {
  id: string;
  guestName: string;
  guestAvatar: string;
  listingTitle: string;
  online: boolean;
  unread: number;
  lastTime: string;
  messages: ChatMessage[];
}

const KEY = '@stayon_host_threads';
const av = (n: string) => `https://ui-avatars.com/api/?name=${encodeURIComponent(n)}&background=0D9488&color=fff`;

export const SEED_THREADS: Thread[] = [
  {
    id: 't1', guestName: 'Aarav Mehta', guestAvatar: av('Aarav Mehta'), listingTitle: 'Sunlit Loft in the City',
    online: true, unread: 1, lastTime: '2m',
    messages: [
      { id: 'm1', sender: 'guest', text: 'Hi! Travelling for work — is early check‑in possible?', time: '2m' },
    ],
  },
  {
    id: 't2', guestName: 'Liam O’Brien', guestAvatar: av('Liam OBrien'), listingTitle: 'Sunlit Loft in the City',
    online: false, unread: 0, lastTime: '1h',
    messages: [
      { id: 'm1', sender: 'guest', text: 'Thanks for confirming — looking forward to it!', time: '1h' },
      { id: 'm2', sender: 'host', text: 'You’re very welcome, Liam. I’ll send check‑in details a day before.', time: '1h' },
    ],
  },
  {
    id: 't3', guestName: 'Mia Chen', guestAvatar: av('Mia Chen'), listingTitle: 'Palm Garden Villa',
    online: false, unread: 0, lastTime: '3h',
    messages: [
      { id: 'm1', sender: 'guest', text: 'Is the pool heated?', time: '3h' },
      { id: 'm2', sender: 'host', text: 'It is! Comfortable year‑round.', time: '3h' },
    ],
  },
];

export async function getThreads(): Promise<Thread[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED_THREADS)).catch(() => {});
  return SEED_THREADS;
}

async function writeAll(t: Thread[]) { try { await AsyncStorage.setItem(KEY, JSON.stringify(t)); } catch {} }

export async function sendHostMessage(threadId: string, text: string): Promise<Thread[]> {
  const all = await getThreads();
  const next = all.map((t) => t.id === threadId
    ? { ...t, unread: 0, lastTime: 'now', messages: [...t.messages, { id: `${Date.now()}`, sender: 'host' as const, text, time: 'now' }] }
    : t);
  await writeAll(next);
  return next;
}

// ── Guest-side access to the SAME thread store (the user app writes here, the
//    host inbox reads it — real two-way messaging in one app) ─────────────────
export async function getThreadById(id: string): Promise<Thread | undefined> {
  return (await getThreads()).find((t) => t.id === id);
}

/** Find the guest's thread for a listing (or create it) so both apps share it. */
export async function getOrCreateThread(p: { listingTitle: string; guestName: string; guestAvatar?: string }): Promise<Thread> {
  const all = await getThreads();
  const found = all.find((t) => t.listingTitle === p.listingTitle && t.guestName === (p.guestName || 'Guest'));
  if (found) return found;
  const thread: Thread = {
    id: `gt_${Date.now()}`,
    guestName: p.guestName || 'Guest',
    guestAvatar: p.guestAvatar || av(p.guestName || 'Guest'),
    listingTitle: p.listingTitle || 'your stay',
    online: true, unread: 0, lastTime: 'now', messages: [],
  };
  await writeAll([thread, ...all]);
  return thread;
}

/** A message sent by the GUEST — appears in the host inbox as unread. */
export async function sendGuestMessage(threadId: string, text: string): Promise<Thread[]> {
  const all = await getThreads();
  const next = all.map((t) => t.id === threadId
    ? { ...t, unread: t.unread + 1, lastTime: 'now', online: true, messages: [...t.messages, { id: `${Date.now()}`, sender: 'guest' as const, text, time: 'now' }] }
    : t);
  await writeAll(next);
  return next;
}

export async function markRead(threadId: string): Promise<void> {
  const all = await getThreads();
  await writeAll(all.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)));
}

export async function totalUnread(): Promise<number> {
  const all = await getThreads();
  return all.reduce((s, t) => s + t.unread, 0);
}

// ── Pinned threads ─────────────────────────────────────────────────────────
const PIN_KEY = '@stayon_host_pinned';

export async function getPinned(): Promise<string[]> {
  try { const raw = await AsyncStorage.getItem(PIN_KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  return [];
}

export async function togglePin(threadId: string): Promise<string[]> {
  const cur = new Set(await getPinned());
  if (cur.has(threadId)) cur.delete(threadId); else cur.add(threadId);
  const next = Array.from(cur);
  try { await AsyncStorage.setItem(PIN_KEY, JSON.stringify(next)); } catch {}
  return next;
}

/** Whether the host still owes a reply (last message was from the guest). */
export function needsReply(t: Thread): boolean {
  const last = t.messages[t.messages.length - 1];
  return !!last && last.sender === 'guest';
}
