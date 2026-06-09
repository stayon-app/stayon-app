// Saved message templates (a.k.a. quick/saved replies) — reusable messages a
// host can insert into a chat with one tap. Persisted to AsyncStorage. Supports
// a {guest} shortcode replaced with the guest's first name when used.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SavedMessage { id: string; title: string; body: string; }

const KEY = '@stayon_host_savedmsgs';

const SEED: SavedMessage[] = [
  { id: 'sm1', title: 'Welcome', body: 'Hi {guest}! Thanks for booking — I’m excited to host you. Let me know if you have any questions before your stay.' },
  { id: 'sm2', title: 'Check‑in details', body: 'Hi {guest}, here are your check‑in details. Check‑in is from 3 PM. I’ll share the exact address and door code the day before. Safe travels!' },
  { id: 'sm3', title: 'During stay', body: 'Hope you’re settling in well, {guest}! Everything you need is in the house guide. Just message me if anything comes up.' },
  { id: 'sm4', title: 'Checkout reminder', body: 'Hi {guest}, a gentle reminder that checkout is at 11 AM tomorrow. Just leave the keys inside and pull the door shut. Thanks for staying!' },
  { id: 'sm5', title: 'Thank you', body: 'Thank you for staying, {guest}! It was a pleasure hosting you. A 5‑star review really helps — and you’re welcome back anytime.' },
];

export async function getTemplates(): Promise<SavedMessage[]> {
  try { const raw = await AsyncStorage.getItem(KEY); if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; } } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(SEED)).catch(() => {});
  return SEED;
}

export async function addTemplate(title: string, body: string): Promise<SavedMessage[]> {
  const all = await getTemplates();
  const next = [...all, { id: `sm_${Date.now()}`, title: title.trim() || 'Saved reply', body: body.trim() }];
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

export async function deleteTemplate(id: string): Promise<SavedMessage[]> {
  const all = await getTemplates();
  const next = all.filter((t) => t.id !== id);
  await AsyncStorage.setItem(KEY, JSON.stringify(next)).catch(() => {});
  return next;
}

/** Fill {guest} (and {Guest}) with the guest's first name. */
export function fillTemplate(body: string, guestName?: string): string {
  const first = (guestName || 'there').trim().split(/\s+/)[0];
  return body.replace(/\{guest\}/gi, first);
}
