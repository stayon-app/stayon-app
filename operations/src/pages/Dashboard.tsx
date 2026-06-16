import React, { useEffect, useState } from 'react';
import { OpsApi, type ModuleKey } from '../api/opsApi';
import { groupBy } from '../components/utils';

type Mod = { key: ModuleKey; label: string; group: string };

const GROUP_META: Record<string, { icon: string; blurb: string; color: string }> = {
  'Overview': { icon: '▣', blurb: 'Metrics & history', color: '#64748b' },
  'Guest Operations': { icon: '🧳', blurb: 'Manage guests & their bookings', color: '#0ea5e9' },
  'Host Operations': { icon: '🏠', blurb: 'Manage hosts & their listings', color: '#0d9488' },
  'Trust & Safety': { icon: '🛡', blurb: 'KYC, reports, safety', color: '#14b8a6' },
  'Support': { icon: '🎧', blurb: 'Tickets & disputes', color: '#6366f1' },
  'Finance': { icon: '💳', blurb: 'Bookings, refunds, payouts', color: '#10b981' },
  'Quality': { icon: '★', blurb: 'Host scorecards & insights', color: '#f59e0b' },
  'Growth': { icon: '🌍', blurb: 'Markets, partners, field ops', color: '#ec4899' },
  'Compliance': { icon: '⚖', blurb: 'Regulations & GDPR', color: '#a78bfa' },
};

export function Dashboard({ modules, go }: { modules: Mod[]; go: (k: ModuleKey) => void }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    OpsApi.dashboard()
      .then(setData)
      .catch(() => setData(null));
  }, []);

  const metrics = data ? Object.entries(data.metrics || data).filter(([, v]) => typeof v === 'number' || typeof v === 'string') : [];
  const groups = groupBy(modules).filter(([g]) => g !== 'Overview');

  return (
    <>
      {metrics.length > 0 && (
        <div className="metrics" style={{ marginBottom: 26 }}>
          {metrics.slice(0, 6).map(([k, v]) => (
            <div className="metric" key={k}>
              <div className="v">{String(v)}</div>
              <div className="k">{k.replace(/([A-Z])/g, ' $1')}</div>
            </div>
          ))}
        </div>
      )}

      <p className="muted" style={{ margin: '0 0 12px' }}>Choose an area to work in</p>
      <div className="tilegrid">
        {groups.map(([group, mods]) => {
          const meta = GROUP_META[group] || { icon: '◆', blurb: '', color: '#6366f1' };
          return (
            <div className="tile" key={group} onClick={() => go(mods[0].key)}>
              <div className="tile-icon" style={{ background: meta.color + '22', color: meta.color }}>{meta.icon}</div>
              <div className="tile-title">{group}</div>
              <div className="tile-blurb">{meta.blurb}</div>
              <div className="tile-mods">
                {mods.map((m) => (
                  <span
                    key={m.key}
                    className="chip"
                    onClick={(e) => {
                      e.stopPropagation();
                      go(m.key);
                    }}
                  >
                    {m.label}
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
