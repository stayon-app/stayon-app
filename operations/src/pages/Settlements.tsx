import React, { useState, useEffect } from 'react';
import { OpsApi } from '../api/opsApi';

export function Settlements() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    OpsApi.settlements()
      .then(setD)
      .catch((e) => setErr(e.message));
  }, []);

  if (err) return <div className="empty">{err}</div>;
  if (!d) return <div className="empty">Loading…</div>;

  return (
    <>
      <div className="metrics" style={{ marginBottom: 20 }}>
        <div className="metric"><div className="v">${Math.round(d.totals.gmv)}</div><div className="k">GMV (guest paid)</div></div>
        <div className="metric"><div className="v">${Math.round(d.totals.payouts)}</div><div className="k">Host payouts</div></div>
        <div className="metric"><div className="v">${Math.round(d.totals.taxes)}</div><div className="k">Taxes collected</div></div>
      </div>
      <p className="muted" style={{ margin: '0 0 12px' }}>Per stay: guest paid → host earns → host receives (0% StayOn fee). {(d.items || []).length} stays.</p>
      <div className="panel">
        {(d.items || []).map((s: any, i: number) => (
          <div className="row" key={s.code || i}>
            <div className="grow">
              <div className="title">{s.code} · {s.listing}</div>
              <div className="sub">Guest paid ${s.guestPaidUSD} · taxes ${s.taxesUSD} · cleaning ${s.cleaningUSD} · host earns ${s.hostEarnsUSD} → receives <b>${s.hostReceivesUSD}</b></div>
            </div>
            <span className={`pill ${s.payout === 'paid' ? 'green' : s.payout === 'on-hold' ? 'red' : 'amber'}`}>{s.payout}</span>
          </div>
        ))}
        {(d.items || []).length === 0 && <div className="empty">No settlements yet.</div>}
      </div>
    </>
  );
}
