// Scheduled (automated) messages — the host enables auto-messages that send at
// key moments (booking confirmed, before check-in, checkout day, after stay).
// Frontend mock: rules are stored & toggled; no real scheduler runs.

import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ScheduledRule {
  id: string;
  label: string;
  timing: string;     // when it sends
  body: string;       // message ({guest} shortcode)
  enabled: boolean;
}

const KEY = '@stayon_host_scheduledmsgs';

const DEFAULTS: ScheduledRule[] = [
  { id: 'sched-welcome', label: 'Welcome message', timing: 'As soon as a booking is confirmed', enabled: true,
    body: 'Hi {guest}! Thanks for booking — I’m excited to host you. I’ll send check‑in details a day before. Any questions, just message me here.' },
  { id: 'sched-checkin', label: 'Check‑in details', timing: '1 day before check‑in', enabled: true,
    body: 'Hi {guest}, your stay is tomorrow! Check‑in is from 3 PM. I’ll share the exact address and door code shortly. Safe travels!' },
  { id: 'sched-during', label: 'Mid‑stay check‑in', timing: 'Morning after check‑in', enabled: false,
    body: 'Hope you’re settling in well, {guest}! Everything you need is in the house guide — just message me if anything comes up.' },
  { id: 'sched-checkout', label: 'Checkout reminder', timing: 'Morning of checkout', enabled: true,
    body: 'Hi {guest}, checkout is at 11 AM today. Just leave the keys inside and pull the door shut. Thanks so much for staying!' },
  { id: 'sched-thanks', label: 'Thank‑you & review', timing: 'A few hours after checkout', enabled: false,
    body: 'Thank you for staying, {guest}! It was a pleasure hosting you. A 5‑star review really helps — and you’re welcome back anytime.' },
];

export async function getScheduledRules(): Promise<ScheduledRule[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (raw) { const p = JSON.parse(raw); if (Array.isArray(p)) return p; }
  } catch {}
  await AsyncStorage.setItem(KEY, JSON.stringify(DEFAULTS)).catch(() => {});
  return DEFAULTS;
}

export async function setScheduledRules(rules: ScheduledRule[]): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(rules)); } catch {}
}
