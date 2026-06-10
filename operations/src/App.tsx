import React, { useEffect, useState, useCallback } from 'react';
import { OpsApi, type StaffRole } from './api/opsApi';
import { modulesFor, SENSITIVE, type ModuleKey } from './lib/roles';

type Staff = { id: string; name: string; email: string; role: StaffRole };

export default function App() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('ops_theme') || 'light');
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem('ops_theme', theme); }, [theme]);
  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const [staff, setStaff] = useState<Staff | null>(() => {
    try { return JSON.parse(localStorage.getItem('ops_staff') || 'null'); } catch { return null; }
  });
  if (!staff) return <Login onLogin={(s) => { localStorage.setItem('ops_staff', JSON.stringify(s)); setStaff(s); }} theme={theme} onToggleTheme={toggleTheme} />;
  return <Shell staff={staff} theme={theme} onToggleTheme={toggleTheme} onLogout={() => { OpsApi.logout(); localStorage.removeItem('ops_staff'); setStaff(null); }} />;
}

// ───────────────────────── Login ─────────────────────────
function Login({ onLogin, theme, onToggleTheme }: { onLogin: (s: Staff) => void; theme: string; onToggleTheme: () => void }) {
  const [email, setEmail] = useState('ops@stayon.com');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const submit = async () => {
    setBusy(true); setErr('');
    try { const s = await OpsApi.login(email.trim(), ''); onLogin(s); }
    catch (e: any) { setErr(e?.message || 'Login failed — is the backend running on :4000?'); }
    finally { setBusy(false); }
  };
  return (
    <div className="login">
      <div className="login-card">
        <h1>StayOn <span style={{ color: 'var(--teal)' }}>Ops</span></h1>
        <p>Operations control center — staff sign in.</p>
        <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="staff email" onKeyDown={(e) => e.key === 'Enter' && submit()} />
        <button className="btn" onClick={submit} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
        {err && <p className="err">{err}</p>}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14 }}>
          <span className="muted">Seed admin: <b>ops@stayon.com</b></span>
          <button className="a" onClick={onToggleTheme}>{theme === 'dark' ? '☀ Light' : '🌙 Dark'}</button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────── Shell ─────────────────────────
function Shell({ staff, onLogout, theme, onToggleTheme }: { staff: Staff; onLogout: () => void; theme: string; onToggleTheme: () => void }) {
  const modules = modulesFor(staff.role);
  const groups = groupBy(modules);
  const [active, setActive] = useState<ModuleKey>(modules[0]?.key ?? 'dashboard');
  const current = modules.find((m) => m.key === active) ?? modules[0];
  // Collapsible groups — all open by default; click a header to fold/unfold.
  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.map(([g]) => g)));
  const toggle = (g: string) => setOpen((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });
  // Sensitive boxes unlocked this session (after step-up PIN).
  const [unlocked, setUnlocked] = useState<Set<ModuleKey>>(new Set());
  const needsPin = SENSITIVE.includes(active) && !unlocked.has(active);
  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">StayOn <small>Ops</small></div>
        <nav className="nav">
          {groups.map(([group, mods]) => {
            const isOpen = open.has(group);
            const hasActive = mods.some((m) => m.key === active);
            return (
              <div key={group}>
                <button className={`navgroup-btn${hasActive ? ' has-active' : ''}`} onClick={() => toggle(group)}>
                  <span>{group}</span>
                  <span className="chev">{isOpen ? '▾' : '▸'}</span>
                </button>
                {isOpen && mods.map((m) => (
                  <button key={m.key} className={`navitem${m.key === active ? ' active' : ''}`} onClick={() => setActive(m.key)}>{m.label}</button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <h2>{current?.label}</h2>
          <div className="who">Signed in as <b>{staff.name}</b> · {staff.role}
            <button onClick={async () => { const p = window.prompt('Set your personal step-up PIN (4–6 digits):'); if (p) { try { await OpsApi.setMyPin(p); alert('PIN set ✓'); } catch (e: any) { alert(e.message); } } }}>Set PIN</button>
            <button onClick={async () => {
              try {
                const e: any = await OpsApi.enroll2FA();
                window.prompt('Add this secret to your authenticator app (Google Authenticator / Authy), then enter the 6-digit code below:\n\nSecret: ' + e.secret, '');
                const code = window.prompt('Enter the 6-digit code from your authenticator app:');
                if (code) { await OpsApi.verify2FA(code); alert('2FA enabled ✓ — your step-up now uses your authenticator code.'); }
              } catch (err: any) { alert(err.message); }
            }}>Setup 2FA</button>
            <button onClick={onToggleTheme}>{theme === 'dark' ? '☀ Light' : '🌙 Dark'}</button>
            <button onClick={onLogout}>Sign out</button>
          </div>
        </div>
        {needsPin
          ? <StepUpGate module={active} onUnlock={() => setUnlocked((s) => new Set(s).add(active))} />
          : <Module key={active} module={active} modules={modules} go={setActive} />}
      </main>
    </div>
  );
}

// Step-up PIN gate — re-auth before opening a sensitive box.
function StepUpGate({ module, onUnlock }: { module: string; onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr('');
    try { await OpsApi.stepUp(pin, module); onUnlock(); }
    catch (e: any) { setErr(e?.message || 'Incorrect PIN'); }
    finally { setBusy(false); }
  };
  return (
    <div style={{ maxWidth: 300, margin: '60px auto', textAlign: 'center' }}>
      <div style={{ fontSize: 40 }}>🔒</div>
      <h3 style={{ margin: '8px 0 2px' }}>Protected box</h3>
      <p className="muted" style={{ marginTop: 0 }}>Enter your Ops PIN to open <b>{module}</b>.</p>
      <input className="input" type="password" inputMode="numeric" maxLength={6} value={pin}
        onChange={(e) => setPin(e.target.value)} placeholder="••••" onKeyDown={(e) => e.key === 'Enter' && submit()}
        style={{ textAlign: 'center', letterSpacing: '.3em', fontSize: 18 }} autoFocus />
      <button className="btn" onClick={submit} disabled={busy || pin.length < 4}>{busy ? 'Checking…' : 'Unlock'}</button>
      {err && <p className="err">{err}</p>}
      <p className="muted" style={{ fontSize: 11, marginTop: 10 }}>Demo PIN: <b>2468</b> · every attempt is audited</p>
    </div>
  );
}

type Mod = { key: ModuleKey; label: string; group: string };

// ───────────────────────── Module router ─────────────────────────
function Module({ module, modules, go }: { module: ModuleKey; modules: Mod[]; go: (k: ModuleKey) => void }) {
  switch (module) {
    case 'dashboard': return <Dashboard modules={modules} go={go} />;
    case 'guests': return <PeopleQueue title="Guests (user side)" fetcher={OpsApi.guests}
      rowOf={(r) => ({ title: r.name || r.phone || r.email || r.id, sub: `${r.status || 'active'} · ${r.bookings || 0} booking(s)${r.phone ? ' · ' + r.phone : ''}` })}
      actions={[
        { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
        { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
        { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
      ]} />;
    case 'hosts': return <PeopleQueue title="Hosts (host side)" fetcher={OpsApi.hosts}
      rowOf={(r) => ({ title: r.name, sub: `${r.published}/${r.listings} live · ★ ${r.rating || 'new'} · ${r.reviews} reviews · ${r.status || 'active'}` })}
      actions={[
        { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
        { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
        { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
      ]} />;
    case 'kyc': return <ReviewQueue title="KYC submissions — tap a row to review the person" fetcher={OpsApi.queues.kyc}
      rowOf={(r: any) => ({ title: r.legalName || r.legal_name || r.name || 'User', sub: `${r.idType || r.id_type || 'ID'} · ${r.status || 'pending'} — tap to review` })}
      idOf={(r: any) => r.userId || r.user_id || r.id}
      drawerTitle="Review identity"
      drawerActions={[
        { label: '✓ Verify identity', kind: 'ok', run: (id: string) => OpsApi.kycDecision(id, 'verify') },
        { label: '✕ Reject', kind: 'no', run: (id: string) => OpsApi.kycDecision(id, 'reject', window.prompt('Reason for rejection (logged + sent to the user):', 'ID unclear or details do not match') || 'rejected') },
      ]} />;
    case 'listings': return <ListingQueue title="Listings pending review — tap to inspect & publish" fetcher={OpsApi.queues.listings}
      rowOf={(r: any) => ({ title: r.title || 'Untitled stay', sub: `${[r.city, r.country].filter(Boolean).join(', ')} · ${r.status || 'pending'} — tap to review` })} />;
    case 'reels': return <Queue title="Reels pending review" fetcher={OpsApi.queues.reels}
      rowOf={(r) => ({ title: r.caption || r.title || 'Reel', sub: r.status || 'pending' })}
      actions={[
        { label: 'Approve', kind: 'ok', run: (r) => OpsApi.reelDecision(r.id, 'approve') },
        { label: 'Reject', kind: 'no', run: (r) => OpsApi.reelDecision(r.id, 'reject') },
      ]} />;
    case 'reports': return <Queue title="Reports" fetcher={OpsApi.reports}
      rowOf={(r) => ({ title: `${r.targetType || r.target_type || 'item'} · ${r.reason || ''}`, sub: r.status || 'open' })}
      actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.resolveReport(r.id, 'reviewed') }]} />;
    case 'users': return <PeopleQueue title="Users" fetcher={OpsApi.users}
      rowOf={(r) => ({ title: r.name || r.phone || r.email || r.id, sub: `${r.status || 'active'}${r.phone ? ' · ' + r.phone : ''}` })}
      actions={[
        { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
        { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
        { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
      ]} />;
    case 'bookings': return <BookingQueue title="Bookings — tap to see who pays whom + payout & hold" fetcher={OpsApi.bookings}
      rowOf={(r: any) => ({ title: `${r.code} · ${r.listingTitle || r.listing_title || ''}`, sub: `${r.status} · ${r.checkIn || r.check_in || ''}→${r.checkOut || r.check_out || ''} — tap` })} />;
    case 'finance': return <Finance />;
    case 'support': return <Queue title="Support tickets" fetcher={() => OpsApi.list('tickets')}
      rowOf={(r) => ({ title: `${r.subject || '(no subject)'}${slaTag(r)}`, sub: `${r.category || 'general'} · ${r.priority || 'normal'} · ${r.status || 'open'} · open ${sinceShort(r.created_at)}` })}
      actions={[
        { label: 'In progress', kind: 'ok', run: (r) => OpsApi.action('tickets', r.id, 'in_progress') },
        { label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('tickets', r.id, 'resolved') },
      ]}
      create={{ fields: [['subject', 'Subject'], ['category', 'Category'], ['body', 'Details']], submit: (v) => OpsApi.create('tickets', v) }} />;
    case 'disputes': return <Queue title="Disputes" fetcher={() => OpsApi.list('disputes')}
      rowOf={(r) => ({ title: `${r.kind || 'dispute'} · ${r.booking_code || ''}`, sub: `$${r.amount_usd || 0} · ${r.status || 'open'}` })}
      actions={[
        { label: 'Resolve (guest)', kind: 'ok', run: (r) => OpsApi.action('disputes', r.id, 'resolved', { resolution: 'guest' }) },
        { label: 'Resolve (host)', kind: 'ok', run: (r) => OpsApi.action('disputes', r.id, 'resolved', { resolution: 'host' }) },
        { label: 'Reject', kind: 'no', run: (r) => OpsApi.action('disputes', r.id, 'rejected') },
      ]}
      create={{ fields: [['kind', 'Kind'], ['booking_code', 'Booking code'], ['amount_usd', 'Amount (USD)']], submit: (v) => OpsApi.create('disputes', { ...v, amount_usd: Number(v.amount_usd) || 0 }) }} />;
    case 'safety': return <Queue title="Safety cases" fetcher={() => OpsApi.list('safety-cases')}
      rowOf={(r) => ({ title: `${r.kind || 'incident'} · ${r.severity || 'medium'}`, sub: `${r.description || ''} · ${r.status || 'open'}` })}
      actions={[
        { label: 'Escalate', kind: 'no', run: (r) => OpsApi.action('safety-cases', r.id, 'escalated') },
        { label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('safety-cases', r.id, 'resolved') },
      ]}
      create={{ fields: [['kind', 'Kind'], ['severity', 'Severity (low/medium/high)'], ['description', 'Description']], submit: (v) => OpsApi.create('safety-cases', v) }} />;
    case 'qa': return <Queue title="Host scorecards" fetcher={OpsApi.qaScorecards}
      rowOf={(r) => ({ title: r.host, sub: `${r.published}/${r.listings} live · ★ ${r.rating || 'new'} · ${r.reviews} reviews` })} />;
    case 'insights': return <Metrics fetcher={OpsApi.qaInsights} />;
    case 'markets': return <Queue title="Markets" fetcher={() => OpsApi.list('markets')}
      rowOf={(r) => ({ title: `${r.name} (${r.currency})`, sub: `${r.country} · ${r.enabled ? 'enabled' : 'disabled'} · tax ${Math.round((r.tax_rate || 0) * 100)}%` })}
      actions={[
        { label: 'Enable', kind: 'ok', run: (r) => OpsApi.action('markets', r.id, 'enabled', { enabled: true }) },
        { label: 'Disable', kind: 'no', run: (r) => OpsApi.action('markets', r.id, 'disabled', { enabled: false }) },
      ]}
      create={{ fields: [['name', 'Market name'], ['country', 'Country'], ['currency', 'Currency']], submit: (v) => OpsApi.create('markets', v) }} />;
    case 'partners': return <Queue title="Partners" fetcher={() => OpsApi.list('partners')}
      rowOf={(r) => ({ title: `${r.name} · ${r.kind || ''}`, sub: `${r.city || ''} · ${r.status || 'active'}` })}
      actions={[{ label: 'Deactivate', kind: 'no', run: (r) => OpsApi.action('partners', r.id, 'inactive') }]}
      create={{ fields: [['name', 'Partner name'], ['kind', 'Kind (cleaning/property_manager)'], ['city', 'City']], submit: (v) => OpsApi.create('partners', v) }} />;
    case 'field': return <Queue title="Field tasks" fetcher={() => OpsApi.list('field-tasks')}
      rowOf={(r) => ({ title: r.title || r.kind || 'Task', sub: `${r.city || ''} · ${r.assignee || 'unassigned'} · ${r.status || 'open'}` })}
      actions={[
        { label: 'Assign me', kind: 'ok', run: (r) => OpsApi.action('field-tasks', r.id, 'assigned', { assignee: 'me' }) },
        { label: 'Complete', kind: 'ok', run: (r) => OpsApi.action('field-tasks', r.id, 'done') },
      ]}
      create={{ fields: [['title', 'Task'], ['kind', 'Kind (inspection)'], ['city', 'City']], submit: (v) => OpsApi.create('field-tasks', v) }} />;
    case 'compliance': return <Queue title="Region rules (STR regulations)" fetcher={() => OpsApi.list('region-rules')}
      rowOf={(r) => ({ title: r.region, sub: `max ${r.max_nights || '∞'} nights · ${r.permit_required ? 'permit required' : 'no permit'} · ${r.tax_note || ''}` })}
      create={{ fields: [['region', 'Region'], ['max_nights', 'Max nights'], ['tax_note', 'Tax note']], submit: (v) => OpsApi.create('region-rules', { ...v, max_nights: Number(v.max_nights) || null }) }} />;
    case 'verification': return <ReviewQueue title="Guest verification — new vs existing (tap to review)" fetcher={OpsApi.verification}
      rowOf={(r: any) => ({ title: `${r.name} · ${r.tier === 'new' ? '🆕 NEW user' : 'existing'}`, sub: `${r.idType || 'ID'} · ${r.status} — tap to review` })}
      idOf={(r: any) => r.userId}
      drawerTitle="Review identity"
      drawerActions={[
        { label: '✓ Verify identity', kind: 'ok', run: (id: string) => OpsApi.kycDecision(id, 'verify') },
        { label: '✕ Reject', kind: 'no', run: (id: string) => OpsApi.kycDecision(id, 'reject', window.prompt('Reason for rejection (logged + sent to the user):', 'ID unclear or details do not match') || 'rejected') },
      ]} />;
    case 'risk': return <RiskCenter />;
    case 'maintenance': return <Queue title="Maintenance & damages" fetcher={() => OpsApi.list('maintenance')}
      rowOf={(r) => ({ title: `${r.kind || 'issue'} · ${r.listing_title || ''}`, sub: `${r.severity || 'medium'} · ${r.description || ''} · ${r.status || 'open'}` })}
      actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('maintenance', r.id, 'resolved') }]}
      create={{ fields: [['listing_title', 'Listing'], ['kind', 'Kind (repair/damage)'], ['description', 'Description'], ['severity', 'Severity']], submit: (v) => OpsApi.create('maintenance', v) }} />;
    case 'escrow': return <PayoutEscrow />;
    case 'bank': return <Queue title="Bank-account verification (before first payout)" fetcher={() => OpsApi.list('bank-accounts')}
      rowOf={(r) => ({ title: `${r.host_name || 'Host'} · ${r.bank || ''} ${r.masked || ''}`, sub: `${r.country || ''} · ${r.status || 'pending'}` })}
      actions={[
        { label: 'Verify', kind: 'ok', run: (r) => OpsApi.action('bank-accounts', r.id, 'verified') },
        { label: 'Reject', kind: 'no', run: (r) => OpsApi.action('bank-accounts', r.id, 'rejected') },
      ]}
      create={{ fields: [['host_name', 'Host'], ['bank', 'Bank'], ['masked', 'Masked account'], ['country', 'Country']], submit: (v) => OpsApi.create('bank-accounts', v) }} />;
    case 'devops': return <DevOps />;
    case 'settlements': return <Settlements />;
    case 'satisfaction': return <Metrics fetcher={OpsApi.satisfaction} />;
    case 'devrequests': return <Queue title="Dev requests → development team" fetcher={() => OpsApi.list('dev-requests')}
      rowOf={(r: any) => ({ title: `${r.kind || 'feature'} · ${r.title || ''}`, sub: `${r.area || ''} · ${r.priority || 'normal'} · ${r.status || 'open'}` })}
      actions={[
        { label: 'In dev', kind: 'ok', run: (r) => OpsApi.action('dev-requests', r.id, 'in_dev') },
        { label: 'Shipped', kind: 'ok', run: (r) => OpsApi.action('dev-requests', r.id, 'shipped') },
        { label: 'Decline', kind: 'no', run: (r) => OpsApi.action('dev-requests', r.id, 'declined') },
      ]}
      create={{ fields: [['title', 'Title'], ['kind', 'Kind (feature/bug/improvement)'], ['area', 'Area'], ['detail', 'Details']], submit: (v) => OpsApi.create('dev-requests', v) }} />;
    case 'audit': return <Queue title="Audit log" fetcher={OpsApi.audit}
      rowOf={(r) => ({ title: `${r.action || ''} · ${r.target_type || r.targetType || ''}`, sub: `${r.actor_name || r.actorName || 'system'} · ${fmt(r.created_at || r.createdAt)}` })} />;
    default: return <div className="empty">This module is in the build roadmap — see STAYON_OPS_SYSTEM_PLAN.md.</div>;
  }
}

// Simple metrics list (review insights)
function Metrics({ fetcher }: { fetcher: () => Promise<any> }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { fetcher().then((d) => setItems(d?.items || [])).catch((e) => setErr(e.message)); }, [fetcher]);
  if (err) return <div className="empty">{err}</div>;
  if (!items) return <div className="empty">Loading…</div>;
  return (
    <div className="metrics">
      {items.map((m) => (<div className="metric" key={m.id}><div className="v">{m.value}</div><div className="k">{m.label}</div></div>))}
    </div>
  );
}

// ───────────────────────── Dashboard (home of clickable boxes) ─────────────────────────
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

function Dashboard({ modules, go }: { modules: Mod[]; go: (k: ModuleKey) => void }) {
  const [data, setData] = useState<any>(null);
  useEffect(() => { OpsApi.dashboard().then(setData).catch(() => setData(null)); }, []);
  const metrics = data ? Object.entries(data.metrics || data).filter(([, v]) => typeof v === 'number' || typeof v === 'string') : [];
  const groups = groupBy(modules).filter(([g]) => g !== 'Overview');

  return (
    <>
      {/* top metrics strip */}
      {metrics.length > 0 && (
        <div className="metrics" style={{ marginBottom: 26 }}>
          {metrics.slice(0, 6).map(([k, v]) => (
            <div className="metric" key={k}><div className="v">{String(v)}</div><div className="k">{k.replace(/([A-Z])/g, ' $1')}</div></div>
          ))}
        </div>
      )}

      {/* clickable category boxes */}
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
                  <span key={m.key} className="chip" onClick={(e) => { e.stopPropagation(); go(m.key); }}>{m.label}</span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

// ───────────────────────── Finance ─────────────────────────
function Finance() {
  return (
    <Queue title="Payout-change requests (approve before bank edits apply)" fetcher={OpsApi.queues.payoutChanges}
      rowOf={(r) => ({ title: r.masked_label || r.masked || r.kind || 'Payout change', sub: r.status || 'pending' })}
      actions={[
        { label: 'Approve', kind: 'ok', run: (r) => OpsApi.payoutChangeDecision(r.id, 'approve') },
        { label: 'Reject', kind: 'no', run: (r) => OpsApi.payoutChangeDecision(r.id, 'reject') },
      ]} />
  );
}

// ───────────────────────── Fraud & Risk center ─────────────────────────
function RiskCenter() {
  const [msg, setMsg] = useState('');
  const [k, setK] = useState(0);
  const scan = async () => {
    setMsg('Scanning…');
    try { const r: any = await OpsApi.riskScan(); setMsg(`Scan complete — ${r.created} new flag(s)`); setK((x) => x + 1); }
    catch (e: any) { setMsg(e.message); }
  };
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <button className="a ok" onClick={scan}>⚡ Run fraud scan</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Queue key={k} title="Risk flags (identity dup · cancellations · bank/transfer)" fetcher={() => OpsApi.list('risk-flags')}
        rowOf={(r) => ({ title: `${r.kind || 'flag'} · ${r.subject || ''}`, sub: `${r.severity || 'medium'} · ${r.detail || ''} · ${r.status || 'open'}` })}
        actions={[
          { label: 'Hold money', kind: 'no', run: (r) => OpsApi.action('risk-flags', r.id, 'held') },
          { label: 'Dismiss', kind: 'ok', run: (r) => OpsApi.action('risk-flags', r.id, 'dismissed') },
        ]} />
    </>
  );
}

// ───────────────────────── Dev & Release Ops ─────────────────────────
function DevOps() {
  const [flags, setFlags] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const load = useCallback(() => { OpsApi.featureFlags().then((d: any) => setFlags(d.items || [])).catch((e) => setErr(e.message)); }, []);
  useEffect(() => { load(); }, [load]);
  const toggle = async (id: string) => { try { await OpsApi.toggleFlag(id); load(); } catch (e: any) { setErr(e.message); } };
  return (
    <>
      <p className="muted" style={{ margin: '0 0 12px' }}>Feature flags — toggle product features live for guest + host apps</p>
      {err && <div className="empty">{err}</div>}
      <div className="panel">
        {(flags || []).map((f) => (
          <div className="row" key={f.id}>
            <div className="grow"><div className="title">{f.label || f.key}</div><div className="sub">{f.description || f.key}</div></div>
            <button className={`a ${f.enabled ? 'ok' : 'no'}`} onClick={() => toggle(f.id)}>{f.enabled ? 'ON' : 'OFF'}</button>
          </div>
        ))}
        {flags && flags.length === 0 && <div className="empty">No flags — run migration-005.</div>}
        {!flags && !err && <div className="empty">Loading…</div>}
      </div>
      <div style={{ height: 20 }} />
      <Queue title="Incidents / release log" fetcher={() => OpsApi.list('incidents')}
        rowOf={(r) => ({ title: `${r.title || ''} · ${r.severity || 'minor'}`, sub: `${r.area || ''} · ${r.status || 'open'}` })}
        actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('incidents', r.id, 'resolved') }]}
        create={{ fields: [['title', 'Title'], ['severity', 'Severity (minor/major)'], ['area', 'Area']], submit: (v) => OpsApi.create('incidents', v) }} />
    </>
  );
}

// ───────────────────────── People queue + 360 drawer ─────────────────────────
function PeopleQueue(props: Parameters<typeof Queue>[0]) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      <Queue {...props} onRow={(r: any) => setSel(r.id)} />
      {sel && <Drawer id={sel} onClose={() => setSel(null)} />}
    </>
  );
}

type DrawerAction = { label: string; kind: 'ok' | 'no'; run: (id: string) => Promise<any> };
function Drawer({ id, onClose, title = '360° view', actions, onDone }: { id: string; onClose: () => void; title?: string; actions?: DrawerAction[]; onDone?: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { OpsApi.user360(id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const act = async (a: DrawerAction) => {
    setBusy(a.label);
    try { await a.run(id); onDone?.(); onClose(); } catch (e: any) { setErr(e.message); setBusy(''); }
  };
  const u = d?.user || {}; const idn = d?.identity || {};
  const isHost = (d?.listings || []).length > 0;
  const [an, setAn] = useState<any>(null);
  useEffect(() => { if (isHost && id) OpsApi.hostAnalytics(id).then(setAn).catch(() => {}); }, [isHost, id]);
  return (
    <div className="drawer-bg" onClick={onClose}>
      <div className="drawer" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-head"><b>{title}</b><button className="a" onClick={onClose}>Close</button></div>
        {err && <div className="empty">{err}</div>}
        {!d && !err && <div className="empty">Loading…</div>}
        {d && (
          <div style={{ display: 'grid', gap: 14 }}>
            {/* profile header */}
            <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
              {u.avatar_url
                ? <img src={u.avatar_url} alt="" style={{ width: 56, height: 56, borderRadius: 28, objectFit: 'cover', border: '2px solid var(--border)' }} />
                : <div style={{ width: 56, height: 56, borderRadius: 28, background: 'var(--panel2)', display: 'grid', placeItems: 'center', fontSize: 22, fontWeight: 800 }}>{(u.name || 'U')[0]}</div>}
              <div>
                <div style={{ fontSize: 18, fontWeight: 800 }}>{u.name || 'User'}</div>
                <div className="muted">{isHost ? 'Host' : 'Guest'} · account {u.status || 'active'}</div>
              </div>
              <span className={`pill ${idn.status === 'verified' ? 'green' : idn.status === 'rejected' ? 'red' : 'amber'}`} style={{ marginLeft: 'auto' }}>KYC: {idn.status || 'unverified'}</span>
            </div>

            <Sec title="ID submission (review before deciding)">
              <Kv k="Legal name" v={idn.legal_name} />
              <Kv k="Date of birth" v={idn.dob} />
              <Kv k="ID type" v={idn.id_type} />
              <Kv k="ID number (last 4)" v={idn.id_last4 ? `•••• ${idn.id_last4}` : '—'} />
              <Kv k="Submitted" v={fmt(idn.submitted_at)} />
              <Kv k="Provider" v={idn.provider || 'manual review'} />
            </Sec>

            {/* ID document + selfie — VIEW-ONLY (no download, access is logged) */}
            <Sec title="Documents & selfie — 🔒 view only">
              {(() => {
                const docs = idn.docs || {};
                const imgs = [['Front', docs.front], ['Back', docs.back], ['Selfie', docs.selfie]].filter(([, u]) => !!u);
                if (imgs.length === 0) return <span className="muted">No images on this submission (older record, or the app didn't capture them).</span>;
                return (
                  <>
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {imgs.map(([label, url]) => (
                        <div key={label as string} style={{ textAlign: 'center' }}>
                          <div className="idimg" onContextMenu={(e) => e.preventDefault()}>
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
              {(d.bookings || []).slice(0, 4).map((b: any) => <Kv key={b.id} k={`Booking ${b.code}`} v={`${b.status} · ${b.check_in || ''}`} />)}
              {(d.listings || []).slice(0, 4).map((l: any) => <Kv key={l.id} k={`Stay: ${l.title}`} v={l.status} />)}
              {(d.bookings || []).length === 0 && (d.listings || []).length === 0 && <span className="muted">no activity yet (new user)</span>}
            </Sec>

            <Sec title={`Risk flags (${(d.riskFlags || []).length})`}>
              {(d.riskFlags || []).map((f: any) => <Kv key={f.id} k={f.kind} v={f.severity} />)}
              {(d.riskFlags || []).length === 0 && <span className="muted">clean ✓</span>}
            </Sec>

            {actions && actions.length > 0 && (
              <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12 }}>
                {actions.map((a) => (
                  <button key={a.label} className={`a ${a.kind}`} style={{ flex: 1, padding: '11px' }} disabled={!!busy} onClick={() => act(a)}>
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

// Queue whose rows open the review Drawer (with decide actions inside it).
function ReviewQueue({ drawerActions, drawerTitle, idOf, ...props }: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(idOf ? idOf(r) : r.id)} />
      {sel && <Drawer id={sel} title={drawerTitle} actions={drawerActions} onDone={() => setK((x) => x + 1)} onClose={() => setSel(null)} />}
    </>
  );
}
const Sec = ({ title, children }: any) => (<div><div className="navgroup" style={{ padding: '0 0 6px' }}>{title}</div><div className="panel" style={{ padding: 12, display: 'grid', gap: 6 }}>{children}</div></div>);
const Kv = ({ k, v }: any) => (<div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span className="muted">{k}</span><span>{String(v ?? '—')}</span></div>);

// ───────────────────────── Listing review + publish ─────────────────────────
function ListingQueue(props: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(r.id)} />
      {sel && <ListingDrawer id={sel} onClose={() => setSel(null)} onDone={() => setK((x) => x + 1)} />}
    </>
  );
}

function ListingDrawer({ id, onClose, onDone }: { id: string; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  useEffect(() => { OpsApi.listingDetail(id).then(setD).catch((e) => setErr(e.message)); }, [id]);
  const act = async (label: string, fn: () => Promise<any>) => { setBusy(label); try { await fn(); onDone(); onClose(); } catch (e: any) { setErr(e.message); setBusy(''); } };
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
            {(d.photos || []).length > 0
              ? <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                  {(d.photos || []).map((p: any, i: number) => <img key={i} src={typeof p === 'string' ? p : p.url} alt="" style={{ width: 150, height: 110, objectFit: 'cover', borderRadius: 10, border: '1px solid var(--border)' }} />)}
                </div>
              : <div className="empty">No photos uploaded — ask host to add photos before publishing.</div>}
            <Sec title="Location">
              <Kv k="Address" v={d.address} /><Kv k="City" v={d.city} /><Kv k="Country" v={d.country} />
              {d.lat && d.lng && <div style={{ textAlign: 'right' }}><a href={`https://maps.google.com/?q=${d.lat},${d.lng}`} target="_blank" rel="noreferrer" style={{ color: 'var(--teal)', fontSize: 13 }}>View on map ↗</a></div>}
            </Sec>
            <Sec title="Details">
              <Kv k="Price / night" v={`$${d.priceUSD}`} /><Kv k="Max guests" v={d.guests} />
              <Kv k="Bedrooms · beds · baths" v={`${d.bedrooms ?? '—'} · ${d.beds ?? '—'} · ${d.baths ?? '—'}`} />
              <Kv k="Instant book" v={d.instantBook ? 'yes' : 'no'} />
            </Sec>
            <Sec title="Host"><Kv k="Name" v={d.hostName} /><Kv k="Phone" v={d.hostPhone} /></Sec>
            <Sec title={`Amenities (${(d.amenities || []).length})`}>
              <span style={{ fontSize: 13 }}>{(d.amenities || []).join(', ') || '— none listed'}</span>
            </Sec>
            {(d.houseRules || []).length > 0 && <Sec title="House rules"><span style={{ fontSize: 13 }}>{(d.houseRules || []).join(' · ')}</span></Sec>}
            {d.description && <Sec title="Description"><span style={{ fontSize: 13 }}>{d.description}</span></Sec>}
            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12 }}>
              <button className="a ok" style={{ flex: 1, padding: 11 }} disabled={!!busy} onClick={() => act('publish', () => OpsApi.approveListing(id))}>✓ Approve &amp; Publish</button>
              <button className="a no" style={{ padding: 11 }} disabled={!!busy} onClick={() => { const reason = window.prompt('Reason to reject this stay?', 'Photos/details incomplete') || 'Did not meet standards'; act('reject', () => OpsApi.rejectListing(id, reason)); }}>✕ Reject</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Settlements & tax ─────────────────────────
function Settlements() {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  useEffect(() => { OpsApi.settlements().then(setD).catch((e) => setErr(e.message)); }, []);
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

// ───────────────────────── Payout escrow + scheduler ─────────────────────────
function PayoutEscrow() {
  const [msg, setMsg] = useState('');
  const [k, setK] = useState(0);
  const run = async () => {
    setMsg('Running…');
    try { const r: any = await OpsApi.runPayoutScheduler(); setMsg(`Paid ${r.paid} · on-hold ${r.held} · waiting ${r.waiting}`); setK((x) => x + 1); }
    catch (e: any) { setMsg(e.message); }
  };
  return (
    <>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 14 }}>
        <button className="a ok" onClick={run}>▶ Run payout scheduler</button>
        {msg && <span className="muted">{msg}</span>}
      </div>
      <Queue key={k} title="Payout escrow — held → releasable → paid (pays hosts on time)" fetcher={OpsApi.escrow}
        rowOf={(r: any) => ({ title: `${r.code} · $${r.amountUSD}`, sub: `${r.status}${r.releaseAt ? ' · releases ' + r.releaseAt : ''}` })} />
    </>
  );
}

// ───────────────────────── Booking + payout (escrow + hold) ─────────────────────────
function BookingQueue(props: any) {
  const [sel, setSel] = useState<string | null>(null);
  const [k, setK] = useState(0);
  return (
    <>
      <Queue key={k} {...props} onRow={(r: any) => setSel(r.code)} />
      {sel && <BookingDrawer code={sel} onClose={() => setSel(null)} onDone={() => setK((x) => x + 1)} />}
    </>
  );
}

function BookingDrawer({ code, onClose, onDone }: { code: string; onClose: () => void; onDone: () => void }) {
  const [d, setD] = useState<any>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState('');
  const load = useCallback(() => { OpsApi.bookingDetail(code).then(setD).catch((e) => setErr(e.message)); }, [code]);
  useEffect(() => { load(); }, [load]);
  const act = async (label: string, fn: () => Promise<any>) => { setBusy(label); try { await fn(); load(); onDone(); } catch (e: any) { setErr(e.message); } finally { setBusy(''); } };
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
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 800 }}><span>Payout to host</span><span style={{ color: 'var(--teal)' }}>${d.payoutUSD}</span></div>
            </Sec>
            {d.payoutHeld && <Sec title="Hold"><Kv k="Reason" v={d.holdReason} /><span className="muted" style={{ fontSize: 11 }}>Money is paused. Release once the issue is resolved → it pays out on schedule.</span></Sec>}
            <div style={{ display: 'flex', gap: 10, position: 'sticky', bottom: 0, background: 'var(--bg)', paddingTop: 12, flexWrap: 'wrap' }}>
              {!d.payoutHeld
                ? <button className="a no" style={{ flex: 1 }} disabled={!!busy} onClick={() => { const reason = window.prompt('Reason to hold this payout?', 'Unresolved guest issue') || 'under review'; act('hold', () => OpsApi.holdPayout(code, reason, d.hostId)); }}>⏸ Hold payout</button>
                : <button className="a ok" style={{ flex: 1 }} disabled={!!busy} onClick={() => act('release', () => OpsApi.releasePayout(code, d.hostId))}>▶ Release payout</button>}
              <button className="a no" disabled={!!busy} onClick={() => act('cancel', () => OpsApi.forceCancel(code))}>Force-cancel</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───────────────────────── Generic Queue → Review → Decide ─────────────────────────
type Action = { label: string; kind: 'ok' | 'no'; run: (row: any) => Promise<any> };
type Create = { fields: [string, string][]; submit: (v: Record<string, string>) => Promise<any> };
function Queue({ title, fetcher, rowOf, actions = [], create, onRow }: {
  title: string; fetcher: () => Promise<any>;
  rowOf: (r: any) => { title: string; sub?: string };
  actions?: Action[]; create?: Create; onRow?: (row: any) => void;
}) {
  const [rows, setRows] = useState<any[] | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [adding, setAdding] = useState(false);
  const [detail, setDetail] = useState<any>(null);   // universal row detail drawer
  const load = useCallback(() => {
    setErr('');
    fetcher().then((d) => setRows(d?.items || d?.results || (Array.isArray(d) ? d : []))).catch((e) => setErr(e.message));
  }, [fetcher]);
  useEffect(() => { load(); const t = setInterval(load, 20000); return () => clearInterval(t); }, [load]); // auto-refresh every 20s

  const act = async (row: any, a: Action, i: number) => {
    setBusy(row.id + i);
    try { await a.run(row); load(); } catch (e: any) { setErr(e.message); } finally { setBusy(null); }
  };
  const addNew = async () => {
    if (!create) return;
    setBusy('new');
    try { await create.submit(form); setForm({}); setAdding(false); load(); }
    catch (e: any) { setErr(e.message); } finally { setBusy(null); }
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
            <input key={k} className="input" style={{ margin: 0 }} placeholder={label} value={form[k] || ''} onChange={(e) => setForm((f) => ({ ...f, [k]: e.target.value }))} />
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
      {detail && <RowDetailDrawer row={detail} title={rowOf(detail).title} actions={actions}
        onClose={() => setDetail(null)} onAct={async (a) => { try { await a.run(detail); setDetail(null); load(); } catch (e: any) { setErr(e.message); } }} />}
    </>
  );
}

// Universal row detail — shows EVERY field of a row + its actions. Makes every
// table-backed module deep (no "top layer" — see the full record before acting).
function RowDetailDrawer({ row, title, actions, onClose, onAct }: { row: any; title: string; actions: Action[]; onClose: () => void; onAct: (a: Action) => void }) {
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
            {actions.map((a, i) => <button key={i} className={`a ${a.kind}`} style={{ flex: 1, padding: '11px' }} onClick={() => onAct(a)}>{a.label}</button>)}
          </div>
        )}
      </div>
    </div>
  );
}

function fmt(d: any) { if (!d) return '—'; const t = new Date(d); return isNaN(t.getTime()) ? '—' : t.toLocaleString(); }
function hoursSince(d: any) { try { return (Date.now() - new Date(d).getTime()) / 3600000; } catch { return 0; } }
function sinceShort(d: any) { const h = hoursSince(d); if (h < 1) return `${Math.max(1, Math.round(h * 60))}m`; if (h < 24) return `${Math.round(h)}h`; return `${Math.round(h / 24)}d`; }
function slaTag(r: any) {
  const openish = (r.status || 'open') === 'open' || r.status === 'in_progress';
  if (!openish) return '';
  const h = hoursSince(r.created_at);
  if (h > 24) return '  ⚠ SLA breached';
  if (h > 12) return '  ⏰ due soon';
  return '';
}

function groupBy(mods: { key: ModuleKey; label: string; group: string }[]) {
  const order: string[] = [];
  const map: Record<string, typeof mods> = {};
  mods.forEach((m) => { if (!map[m.group]) { map[m.group] = []; order.push(m.group); } map[m.group].push(m); });
  return order.map((g) => [g, map[g]] as [string, typeof mods]);
}
