import React, { useEffect, useState, useCallback } from 'react';
import { fmt } from './utils';

export type Action = { label: string; kind: 'ok' | 'no'; run: (row: any) => Promise<any> };
export type Create = { fields: [string, string][]; submit: (v: Record<string, string>) => Promise<any> };

export function Queue({
  title,
  fetcher,
  rowOf,
  actions = [],
  create,
  onRow
}: {
  title: string;
  fetcher: () => Promise<any>;
  rowOf: (r: any) => { title: string; sub?: string };
  actions?: Action[];
  create?: Create;
  onRow?: (row: any) => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<any>(null);

  const load = useCallback(() => {
    setErr('');
    fetcher()
      .then((d) => setRows(d?.items || d?.results || (Array.isArray(d) ? d : [])))
      .catch((e) => setErr(e.message));
  }, [fetcher]);

  useEffect(() => {
    load();
    const t = setInterval(load, 20000);
    return () => clearInterval(t);
  }, [load]);

  const act = async (row: any, a: Action, i: number) => {
    setBusy(row.id + i);
    try {
      await a.run(row);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  const addNew = async () => {
    if (!create) return;
    setBusy('new');
    try {
      await create.submit(form);
      setForm({});
      setAdding(false);
      load();
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setBusy(null);
    }
  };

  if (err) return <div className="empty">{err}</div>;
  if (!rows) return <div className="empty">Loading…</div>;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '0 0 12px' }}>
        <p className="muted" style={{ margin: 0 }}>{title} · {rows.length}</p>
        {create && <button className="a ok" onClick={() => setAdding((v) => !v)}>{adding ? 'Cancel' : '+ New'}</button>}
      </div>
      {create && adding && (
        <div className="panel" style={{ padding: 14, marginBottom: 12, display: 'grid', gap: 8 }}>
          {create.fields.map(([k, label]) => (
            <input
              key={k}
              className="input"
              style={{ margin: 0 }}
              placeholder={label}
              value={form[k] || ''}
              onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))}
            />
          ))}
          <button className="btn" onClick={addNew} disabled={busy === 'new'}>{busy === 'new' ? 'Saving…' : 'Create'}</button>
        </div>
      )}
      <div className="panel">
        {rows.length === 0 && <div className="empty">Nothing here right now. ✦</div>}
        {rows.map((r, idx) => {
          const ro = rowOf(r);
          return (
            <div className="row" key={r.id || idx}>
              <div className="grow" style={{ cursor: 'pointer' }} onClick={() => (onRow ? onRow(r) : setDetail(r))}>
                <div className="title">{ro.title} ›</div>
                {ro.sub && <div className="sub">{ro.sub}</div>}
              </div>
              <div className="actions">
                {actions.map((a, i) => (
                  <button key={i} className={`a ${a.kind}`} disabled={busy === r.id + i} onClick={() => act(r, a, i)}>
                    {busy === r.id + i ? '…' : a.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {detail && (
        <RowDetailDrawer
          row={detail}
          title={rowOf(detail).title}
          actions={actions}
          onClose={() => setDetail(null)}
          onAct={async (a) => {
            try {
              await a.run(detail);
              setDetail(null);
              load();
            } catch (e: any) {
              setErr(e.message);
            }
          }}
        />
      )}
    </>
  );
}

function RowDetailDrawer({
  row,
  title,
  actions,
  onClose,
  onAct
}: {
  row: any;
  title: string;
  actions: Action[];
  onClose: () => void;
  onAct: (a: Action) => void;
}) {
  const HIDE = new Set(['id', 'created_at']);
  const label = (k: string) => k.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  const show = (v: any) => {
    if (v === null || v === undefined || v === '') return '— not provided';
    if (typeof v === 'object') return JSON.stringify(v);
    return String(v);
  };
  const entries = Object.entries(row).filter(([k]) => !HIDE.has(k));
  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><b>Details</b><button className="a" onClick={onClose}>Close</button></div>
        <div style={{ fontSize: 17, fontWeight: 800, marginBottom: 4 }}>{title}</div>
        <div className="muted" style={{ fontSize: 12, marginBottom: 14 }}>Created {fmt(row.created_at)}</div>
        <div className="panel" style={{ padding: 12, display: 'grid', gap: 7 }}>
          {entries.map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
              <span className="muted" style={{ flexShrink: 0 }}>{label(k)}</span>
              <span style={{ textAlign: 'right', wordBreak: 'break-word' }}>{show(v)}</span>
            </div>
          ))}
        </div>
        {actions.length > 0 && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            {actions.map((a, i) => (
              <button key={i} className={`a ${a.kind}`} style={{ flex: 1, padding: '11px' }} onClick={() => onAct(a)}>
                {a.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
