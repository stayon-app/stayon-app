import React, { useEffect, useState } from 'react';
import { OpsApi } from '../api/opsApi';
import { Queue } from './Queue';
import { Sec, Kv } from './Drawer';

export function ListingQueue(props: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(r.id)} />
      {sel && <ListingDrawer id={sel} onClose={() => setSel(null)} onDone={() => setK((x) => x + 1)} />}
    </>
  );
}

export function ListingDrawer({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');

  useEffect(() => {
    OpsApi.listingDetail(id)
      .then(setD)
      .catch((e) => setErr(e.message));
  }, [id]);

  const act = async (label: string, fn: () => Promise<any>) => {
    setBusy(label);
    try {
      await fn();
      onDone();
      onClose();
    } catch (e: any) {
      setErr(e.message);
      setBusy('');
    }
  };

  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><b>Review stay</b><button className="a" onClick={onClose}>Close</button></div>
        {err && <div className="empty">{err}</div>}
        {!d && !err && <div className="empty">Loading…</div>}
        {d && (
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <div style={{ fontSize: 18, fontWeight: 800 }}>{d.title}</div>
              <div className="muted">{d.type || 'stay'} · <span className={`pill ${d.status === 'published' ? 'green' : 'amber'}`}>{d.status}</span></div>
            </div>
            {/* photo gallery */}
            {(d.photos || []).length > 0 ? (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {(d.photos || []).map((p: any, i: number) => (
                  <img
                    key={i}
                    src={typeof p === 'string' ? p : p.url}
                    alt=""
                    style={{ width: 150, height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }}
                  />
                ))}
              </div>
            ) : (
              <div className="empty">No photos uploaded — ask host to add photos before publishing.</div>
            )}
            <Sec title="Location">
              <Kv k="Address" v={d.address} />
              <Kv k="City" v={d.city} />
              <Kv k="Country" v={d.country} />
              {d.lat && d.lng && (
                <div style={{ textAlign: 'right' }}>
                  <a href={`https://maps.google.com/?q=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 13 }}>
                    View on map ↗
                  </a>
                </div>
              )}
            </Sec>
            <Sec title="Details">
              <Kv k="Price / night" v={`$${d.priceUSD}`} />
              <Kv k="Max guests" v={d.guests} />
              <Kv k="Bedrooms · beds · baths" v={`${d.bedrooms ?? '—'} · ${d.beds ?? '—'} · ${d.baths ?? '—'}`} />
              <Kv k="Instant book" v={d.instantBook ? 'yes' : 'no'} />
            </Sec>
            <Sec title="Host">
              <Kv k="Name" v={d.hostName} />
              <Kv k="Phone" v={d.hostPhone} />
            </Sec>
            <Sec title={`Amenities (${(d.amenities || []).length})`}>
              <span style={{ fontSize: 13 }}>{(d.amenities || []).join(', ') || '— none listed'}</span>
            </Sec>
            {(d.houseRules || []).length > 0 && (
              <Sec title="House rules"><span style={{ fontSize: 13 }}>{(d.houseRules || []).join(' · ')}</span></Sec>
            )}
            {d.description && <Sec title="Description"><span style={{ fontSize: 13 }}>{d.description}</span></Sec>}
            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12 }}>
              <button className="a ok" style={{ flex: 1, padding: 11 }} disabled={!!busy} onClick={() => act('publish', () => OpsApi.approveListing(id))}>
                ✓ Approve &amp; Publish
              </button>
              <button
                className="a no"
                style={{ padding: 11 }}
                disabled={!!busy}
                onClick={() => {
                  const reason = window.prompt('Reason to reject this stay?', 'Photos/details incomplete') || 'Did not meet standards';
                  act('reject', () => OpsApi.rejectListing(id, reason));
                }}
              >
                ✕ Reject
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
