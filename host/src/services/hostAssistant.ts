// Host Assistant — ADVISORY ONLY. Answers questions about the host's earnings,
// stats and outcomes from their own reservation data. It explains and suggests;
// it NEVER acts (no accepting bookings, changing prices, messaging guests, payouts).

import type { HostReservation } from '../data/reservations';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export interface AssistantReply {
  text: string;
  quickReplies?: string[];
}

interface Stats {
  total: number;
  pendingPayout: number;
  bookings: number;
  nights: number;
  avgRate: number;
  occupancy: number;
  pending: number;
  cancelled: number;
  completed: number;
  confirmed: number;
  bestMonth?: { label: string; value: number };
  cancelRate: number;
}

function computeStats(res: HostReservation[]): Stats {
  const earning = res.filter((r) => r.status === 'confirmed' || r.status === 'completed');
  const total = earning.reduce((s, r) => s + r.payout, 0);
  const pendingPayout = res.filter((r) => r.status === 'confirmed').reduce((s, r) => s + r.payout, 0);
  const nights = earning.reduce((s, r) => s + r.nights, 0);
  const avgRate = earning.length ? Math.round(earning.reduce((s, r) => s + r.subtotal / r.nights, 0) / earning.length) : 0;
  const confirmed = res.filter((r) => r.status === 'confirmed').length;
  const buckets: Record<string, number> = {};
  earning.forEach((r) => { const m = MONTHS.find((x) => r.checkIn.startsWith(x)); if (m) buckets[m] = (buckets[m] || 0) + r.payout; });
  const best = Object.entries(buckets).sort((a, b) => b[1] - a[1])[0];
  const cancelled = res.filter((r) => r.status === 'cancelled').length;
  return {
    total, pendingPayout, bookings: earning.length, nights, avgRate,
    occupancy: Math.min(99, 40 + confirmed * 12),
    pending: res.filter((r) => r.status === 'pending').length,
    cancelled, completed: res.filter((r) => r.status === 'completed').length, confirmed,
    bestMonth: best ? { label: best[0], value: best[1] } : undefined,
    cancelRate: res.length ? Math.round((cancelled / res.length) * 100) : 0,
  };
}

const QUICK = ['Earnings so far', 'Next payout', 'Occupancy', 'Best month', 'Booking stats'];

export function respondHostAssistant(res: HostReservation[], question: string, money: (n: number) => string): AssistantReply {
  const s = computeStats(res);
  const q = question.toLowerCase();
  const has = (...w: string[]) => w.some((x) => q.includes(x));

  if (has('hi', 'hello', 'hey', 'help', 'what can you')) {
    return { text: "Hi! I'm your hosting assistant. I can explain your earnings, payouts, occupancy and booking stats — and suggest ideas. I don't change anything myself; you stay in control. What would you like to know?", quickReplies: QUICK };
  }
  if (has('payout', 'paid', 'when do i get', 'fee', 'commission')) {
    return { text: `You have ${money(s.pendingPayout)} in pending payouts from ${s.confirmed} confirmed ${s.confirmed === 1 ? 'stay' : 'stays'}. Each releases about 24 hours after the guest checks in. StayOn charges no host fee — you keep your full rate plus the cleaning fee (taxes pass through).`, quickReplies: QUICK };
  }
  if (has('earn', 'made', 'revenue', 'income', 'money')) {
    return { text: `So far you've earned ${money(s.total)} across ${s.bookings} ${s.bookings === 1 ? 'booking' : 'bookings'} (${s.nights} nights). StayOn takes no platform fee — that's 100% of your rate plus cleaning. ${s.bestMonth ? `Your best month is ${s.bestMonth.label} at ${money(s.bestMonth.value)}.` : ''}`, quickReplies: QUICK };
  }
  if (has('occupan', 'booked', 'how full')) {
    return { text: `Your occupancy is about ${s.occupancy}%. ${s.occupancy < 60 ? 'There’s room to fill — you could open more dates or tune weekend pricing.' : 'Nicely booked!'}`, quickReplies: QUICK };
  }
  if (has('best month', 'best', 'peak', 'highest')) {
    return { text: s.bestMonth ? `Your best month is ${s.bestMonth.label}, bringing in ${money(s.bestMonth.value)}. You could consider a small weekend premium in peak months.` : 'Not enough data yet to spot a peak month.', quickReplies: QUICK };
  }
  if (has('average', 'avg', 'rate', 'price', 'nightly')) {
    return { text: `Your average realised nightly rate is ${money(s.avgRate)}. Weekends often support a higher rate — you could try a modest weekend uplift.`, quickReplies: QUICK };
  }
  if (has('cancel')) {
    return { text: `You've had ${s.cancelled} cancellation${s.cancelled === 1 ? '' : 's'} (${s.cancelRate}% of bookings). A clear cancellation policy helps keep this low.`, quickReplies: QUICK };
  }
  if (has('pending', 'request', 'reply', 'respond')) {
    return { text: `You have ${s.pending} request${s.pending === 1 ? '' : 's'} awaiting your reply. Responding within 24 hours protects your response rate. I can't accept them for you — open Reservations → Requests to decide.`, quickReplies: QUICK };
  }
  if (has('booking', 'stats', 'how many', 'reservation', 'night')) {
    return { text: `Bookings: ${s.confirmed} confirmed, ${s.completed} completed, ${s.pending} pending, ${s.cancelled} cancelled — ${s.nights} nights earned so far.`, quickReplies: QUICK };
  }
  if (has('suggest', 'tip', 'advice', 'improve', 'how do i')) {
    return { text: `A few ideas (yours to apply): ${s.occupancy < 60 ? 'open more dates and consider lowering mid‑week rates; ' : ''}add a small weekend premium; respond to requests fast; and keep photos fresh. I only suggest — you make the changes.`, quickReplies: QUICK };
  }
  return { text: "I can help with earnings, payouts, occupancy, average rate, best month and booking stats — just ask. (I explain and suggest; I don't make changes for you.)", quickReplies: QUICK };
}

export const ASSISTANT_PROMPTS = QUICK;
