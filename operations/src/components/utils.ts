import { type ModuleKey } from '../api/opsApi';

export function fmt(d: any) {
  if (!d) return '—';
  const t = new Date(d);
  return isNaN(t.getTime()) ? '—' : t.toLocaleString();
}

export function hoursSince(d: any) {
  try {
    return (Date.now() - new Date(d).getTime()) / 3600000;
  } catch {
    return 0;
  }
}

export function sinceShort(d: any) {
  const h = hoursSince(d);
  if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`;
  if (h < 24) return `${Math.round(h)}h`;
  return `${Math.round(h / 24)}d`;
}

export function slaTag(r: any) {
  const openish = (r.status || 'open') === 'open' || r.status === 'in_progress';
  if (!openish) return '';
  const h = hoursSince(r.created_at);
  if (h > 24) return '  ⚠ SLA breached';
  if (h > 12) return '  ⏰ due soon';
  return '';
}

export function groupBy(mods: { key: ModuleKey; label: string; group: string }[]) {
  const order: string[] = [];
  const map: Record<string, typeof mods> = {};
  mods.forEach((m) => {
    if (!map[m.group]) {
      map[m.group] = [];
      order.push(m.group);
    }
    map[m.group].push(m);
  });
  return order.map((g) => [g, map[g]] as [string, typeof mods]);
}
