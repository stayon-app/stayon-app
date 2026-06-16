import React, { useState, useEffect, useCallback } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from '../components/Queue';

export function DevOps() {
  const [flags, setFlags] = useState<any[] | null>(null);
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    OpsApi.featureFlags()
      .then((d: any) => setFlags(d.items || []))
      .catch((e) => setErr(e.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (id: string) => {
    try {
      await OpsApi.toggleFlag(id);
      load();
    } catch (e: any) {
      setErr(e.message);
    }
  };

  return (
    <>
      <p className="muted" style={{ margin: '0 0 12px' }}>Feature flags — toggle product features live for guest + host apps</p>
      {err && <div className="empty">{err}</div>}
      <div className="panel">
        {(flags || []).map((f) => (
          <div className="row" key={f.id}>
            <div className="grow">
              <div className="title">{f.label || f.key}</div>
              <div className="sub">{f.description || f.key}</div>
            </div>
            <button className={`a ${f.enabled ? 'ok' : 'no'}`} onClick={() => toggle(f.id)}>{f.enabled ? 'ON' : 'OFF'}</button>
          </div>
        ))}
        {flags && flags.length === 0 && <div className="empty">No flags — run migration-005.</div>}
        {!flags && !err && <div className="empty">Loading…</div>}
      </div>
      <div style={{ height: 20 }} />
      <Queue
        title="Incidents / release log"
        fetcher={() => OpsApi.list('incidents')}
        rowOf={(r) => ({ title: `${r.title || ''} · ${r.severity || 'minor'}`, sub: `${r.area || ''} · ${r.status || 'open'}` })}
        actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('incidents', r.id, 'resolved') }]}
        create={{ fields: [['title', 'Title'], ['severity', 'Severity (minor/major)'], ['area', 'Area']], submit: (v) => OpsApi.create('incidents', v) }}
      />
    </>
  );
}
