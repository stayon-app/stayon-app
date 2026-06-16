import React, { useState } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from '../components/Queue';

export function PayoutEscrow() {
  const [msg, setMsg] = useState('');
  const [k, setK] = useState(0);

  const run = async () => {
    setMsg('Running…');
    try {
      const r: any = await OpsApi.runPayoutScheduler();
      setMsg(`Paid ${r.paid} · on-hold ${r.held} · waiting ${r.waiting}`);
      setK((x) => x + 1);
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <button className="a ok" onClick={run}>▶ Run payout scheduler</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Queue
        key={k}
        title="Payout escrow — held → releasable → paid (pays hosts on time)"
        fetcher={OpsApi.escrow}
        rowOf={(r: any) => ({ title: `${r.code} · $${r.amountUSD}`, sub: `${r.status}${r.releaseAt ? ' · releases ' + r.releaseAt : ''}` })}
      />
    </>
  );
}
