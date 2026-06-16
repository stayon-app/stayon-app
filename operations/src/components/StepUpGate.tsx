import React, { useState } from 'react';
import { OpsApi } from '../api/opsApi';

export function StepUpGate({ module, onUnlock }: { module: string; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      await OpsApi.stepUp(pin, module);
      onUnlock();
    } catch (e: any) {
      setErr(e?.message || 'Incorrect PIN');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ maxWidth: 300, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <h3 style={{ margin: '8px 0 2px' }}>Protected box</h3>
      <p className="muted" style={{ marginTop: 0 }}>Enter your Ops PIN to open <b>{module}</b>.</p>
      <input
        className="input"
        type="password"
        inputMode="numeric"
        maxLength={6}
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        placeholder="••••"
        onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ textAlign: 'center', letterSpacing: '.3em', fontSize: 18 }}
        autoFocus
      />
      <button className="btn" onClick={submit} disabled={busy || pin.length < 4}>{busy ? 'Checking…' : 'Unlock'}</button>
      {err && <p className="err">{err}</p>}
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>Demo PIN: <b>2468</b> · every attempt is audited</p>
    </div>
  );
}
