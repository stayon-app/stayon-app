import React, { useEffect, useState } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from './Queue';
import { fmt } from './utils';

export type DrawerAction = { label: string; kind: 'ok' | 'no'; run: (id: string) => Promise<any> };

export function Drawer({
  id,
  onClose,
  title = '360° view',
  actions,
  onDone
}: {
  id: string;
  onClose: () => void;
  title?: string;
  actions?: DrawerAction[];
  onDone?: () => void;
}) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    OpsApi.user360(id)
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [id]);

  const act = async (a: DrawerAction) => {
    setBusy(a.label);
    try {
      await a.run(id);
      onDone?.();
      onClose();
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };

  const u = d?.user || {};
  const idn = d?.identity || {};
  const isHost = (d?.listings || []).length > 0;
  const [an, setAn] = useState<any>(null);

  useEffect(() => {
    if (isHost && id) {
      OpsApi.hostAnalytics(id)
        .then(setD => setAn(setD))
        .catch(() => {});
    }
  }, [isHost, id]);

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><b>{title}</b><button className="a" onClick={onClose}>Close</button></div>
        {err && <div className="empty">{err}</div>}
        {!d && !err && <div className="empty">Loading…</div>}
        {d && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {u.avatar_url ? (
                <img
                  src={u.avatar_url}
                  alt=""
                  style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid var(--border)' }}
                />
              ) : (
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 28,
                    background: 'var(--panel2)',
                    display: 'grid',
                    placeItems: 'center',
                    fontSize: 22,
                    fontWeight: 800
                  }}
                >
                  {(u.name || 'U')[0]}
                </div>
              )}
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{u.name || 'User'}</div>
                <div className="muted">{isHost ? 'Host' : 'Guest'} · account {u.status || 'active'}</div>
              </div>
              <span
                className={`pill ${idn.status === 'verified' ? 'green' : idn.status === 'rejected' ? 'red' : 'amber'}`}
                style={{ marginLeft: 'auto' }}
              >
                KYC: {idn.status || 'unverified'}
              </span>
            </div>

            <Sec title="ID submission (review before deciding)">
              <Kv k="Legal name" v={idn.legal_name} />
              <Kv k="Email" v={u.email} />
              <Kv k="Phone" v={u.phone} />
              <Kv k="Date of birth" v={idn.dob} />
              <Kv k="ID type" v={idn.id_type} />
              <Kv k="ID number" v={idn.id_number || (idn.id_last4 ? `•••• ${idn.id_last4}` : '—')} />
              <Kv k="Submitted" v={fmt(idn.submitted_at)} />
              <Kv k="Provider" v={idn.provider || 'manual review'} />
            </Sec>

            <Sec title="Documents & selfie — 🔒 view only">
              {(() => {
                const docs = idn.docs || {};
                const imgs = [['Front', docs.front], ['Back', docs.back], ['Selfie', docs.selfie]].filter(([, u]) => !!u);
                if (imgs.length === 0) {
                  return <span className="muted">No images on this submission (older record, or the app didn't capture them).</span>;
                }
                return (
                  <>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {imgs.map(([label, url]) => (
                        <div key={label as string} style={{ textAlign: 'center' }}>
                          <div
                            className="idimg"
                            title="Click to view full size"
                            onClick={() => window.open(url as string, '_blank', 'noopener')}
                            onContextMenu={(e) => e.preventDefault()}
                          >
                            <img src={url as string} alt={label as string} draggable={false} />
                            <div className="idimg-wm">STAYON OPS · VIEW ONLY</div>
                          </div>
                          <span className="muted" style={{ fontSize: 11 }}>{label}</span>
                        </div>
                      ))}
                    </div>
                    <span className="muted" style={{ fontSize: 11.5, marginTop: 4, display: 'block' }}>
                      Downloads disabled · do not save or share · every view is recorded in the audit log.
                    </span>
                  </>
                );
              })()}
            </Sec>

            <Sec title="Personal details">
              <Kv k="Display name" v={u.name} />
              <Kv k="Phone" v={u.phone} />
              <Kv k="Email" v={u.email} />
              <Kv k="Joined" v={fmt(u.created_at)} />
            </Sec>

            {isHost && an && (
              <Sec title="Host analytics">
                <Kv k="Stays (published)" v={`${an.published}/${an.listings}`} />
                <Kv k="Avg rating · reviews" v={`★ ${an.avgRating || 'new'} · ${an.totalReviews}`} />
                <Kv k="Bookings · nights" v={`${an.bookings} · ${an.nightsBooked}`} />
                <Kv k="Revenue (host earns)" v={`$${an.revenueUSD}`} />
                <Kv k="Paid out" v={`$${an.payoutsUSD}`} />
              </Sec>
            )}

            <Sec title={`Activity — ${(d.bookings || []).length} booking(s) · ${(d.listings || []).length} listing(s)`}>
              {(d.bookings || []).slice(0, 4).map((b: any) => (
                <Kv key={b.id} k={`Booking ${b.code}`} v={`${b.status} · ${b.check_in || ''}`} />
              ))}
              {(d.listings || []).slice(0, 4).map((l: any) => (
                <Kv key={l.id} k={`Stay: ${l.title}`} v={l.status} />
              ))}
              {(d.bookings || []).length === 0 && (d.listings || []).length === 0 && (
                <span className="muted">no activity yet (new user)</span>
              )}
            </Sec>

            <Sec title={`Risk flags (${(d.riskFlags || []).length})`}>
              {(d.riskFlags || []).map((f: any) => (
                <Kv key={f.id} k={f.kind} v={f.severity} />
              ))}
              {(d.riskFlags || []).length === 0 && <span className="muted">clean ✓</span>}
            </Sec>

            {actions && actions.length > 0 && (
              <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12 }}>
                {actions.map((a) => (
                  <button
                    key={a.label}
                    className={`a ${a.kind}`}
                    style={{ flex: 1, padding: '11px' }}
                    disabled={!!busy}
                    onClick={() => act(a)}
                  >
                    {busy === a.label ? '…' : a.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ReviewQueue({ drawerActions, drawerTitle, idOf, ...props }: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(idOf ? idOf(r) : r.id)} />
      {sel && (
        <Drawer
          id={sel}
          title={drawerTitle}
          actions={drawerActions}
          onDone={() => setK((x) => x + 1)}
          onClose={() => setSel(null)}
        />
      )}
    </>
  );
}

export const Sec = ({ title, children }: any) => (
  <div>
    <div className="navgroup" style={{ padding: '0 0 6px' }}>{title}</div>
    <div className="panel" style={{ padding: 12, display: 'grid', gap: 6 }}>{children}</div>
  </div>
);

export const Kv = ({ k, v }: any) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
    <span className="muted">{k}</span>
    <span>{String(v ?? '—')}</span>
  </div>
);
