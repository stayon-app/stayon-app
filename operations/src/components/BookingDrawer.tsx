import React, { useEffect, useState, useCallback } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from './Queue';
import { Sec, Kv } from './Drawer';

export function BookingQueue(props: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(r.code)} />
      {sel && <BookingDrawer code={sel} onClose={() => setSel(null)} onDone={() => setK((x) => x + 1)} />}
    </>
  );
}

export function BookingDrawer({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  const load = useCallback(() => {
    OpsApi.bookingDetail(code)
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      await fn();
      load();
      onDone();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy('');
    }
  };

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><b>Booking & payout</b><button className="a" onClick={onClose}>Close</button></div>
        {err && <div className="empty">{err}</div>}
        {!d && !err && <div className="empty">Loading…</div>}
        {d && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{d.code}</div>
              <span className={`pill ${d.payoutHeld ? 'red' : d.status === 'completed' ? 'green' : 'amber'}`}>{d.payoutHeld ? 'PAYOUT ON HOLD' : d.status}</span>
            </div>
            <Sec title="Parties & stay">
              <Kv k="Guest (pays)" v={d.guestName} />
              <Kv k="Host (receives)" v={d.hostName} />
              <Kv k="Stay" v={d.listingTitle} />
              <Kv k="Dates" v={`${d.checkIn} → ${d.checkOut} · ${d.nights} night(s)`} />
            </Sec>
            <Sec title="Money">
              <Kv k="Subtotal" v={`$${d.subtotalUSD}`} />
              <Kv k="Cleaning fee" v={`$${d.cleaningUSD}`} />
              <Kv k="Taxes" v={`$${d.taxesUSD}`} />
              <Kv k="Guest paid (total)" v={`$${d.totalUSD}`} />
              <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}>
                <span>Payout to host</span>
                <span style={{ color: 'var(--teal)' }}>${d.payoutUSD}</span>
              </div>
            </Sec>
            {d.payoutHeld && (
              <Sec title="Hold">
                <Kv k="Reason" v={d.holdReason} />
                <span className="muted" style={{ fontSize: 11 }}>Money is paused. Release once the issue is resolved → it pays out on schedule.</span>
              </Sec>
            )}
            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12, flexWrap: 'wrap' }}>
              {!d.payoutHeld ? (
                <button
                  className="a no"
                  style={{ flex: 1 }}
                  disabled={!!busy}
                  onClick={() => {
                    const reason = window.prompt('Reason to hold this payout?', 'Unresolved guest issue') || 'under review';
                    act('hold', () => OpsApi.holdPayout(code, reason, d.hostId));
                  }}
                >
                  ⏸ Hold payout
                </button>
              ) : (
                <button className="a ok" style={{ flex: 1 }} disabled={!!busy} onClick={() => act('release', () => OpsApi.releasePayout(code, d.hostId))}>
                  ▶ Release payout
                </button>
              )}
              <button className="a no" disabled={!!busy} onClick={() => act('cancel', () => OpsApi.forceCancel(code))}>
                Force-cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
