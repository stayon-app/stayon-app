import React, { useState } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from '../components/Queue';

export function RiskCenter() {
  const [msg, setMsg] = useState('');
  const [k, setK] = useState(0);

  const scan = async () => {
    setMsg('Scanning…');
    try {
      const r: any = await OpsApi.riskScan();
      setMsg(`Scan complete — ${r.created} new flag(s)`);
      setK((x) => x + 1);
    } catch (e: any) {
      setMsg(e.message);
    }
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <button className="a ok" onClick={scan}>⚡ Run fraud scan</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Queue
        key={k}
        title="Risk flags (identity dup · cancellations · bank/transfer)"
        fetcher={() => OpsApi.list('risk-flags')}
        rowOf={(r) => ({ title: `${r.kind || 'flag'} · ${r.subject || ''}`, sub: `${r.severity || 'medium'} · ${r.detail || ''} · ${r.status || 'open'}` })}
        actions={[
          { label: 'Hold money', kind: 'no', run: (r) => OpsApi.action('risk-flags', r.id, 'held') },
          { label: 'Dismiss', kind: 'ok', run: (r) => OpsApi.action('risk-flags', r.id, 'dismissed') },
        ]}
      />
    </>
  );
}
