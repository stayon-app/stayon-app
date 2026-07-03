import React, { useEffect, useState } from 'react';
import { OpsApi, type StaffRole, type ModuleKey } from './api/opsApi';
import { modulesFor, SENSITIVE } from './lib/roles';
import { fmt, sinceShort, slaTag, groupBy } from './components/utils';
import { Queue } from './components/Queue';
import { Drawer, ReviewQueue } from './components/Drawer';
import { ListingQueue } from './components/ListingDrawer';
import { BookingQueue } from './components/BookingDrawer';
import { StepUpGate } from './components/StepUpGate';

// Page Views
import { Dashboard } from './pages/Dashboard';
import { Finance } from './pages/Finance';
import { RiskCenter } from './pages/RiskCenter';
import { DevOps } from './pages/DevOps';
import { Settlements } from './pages/Settlements';
import { PayoutEscrow } from './pages/PayoutEscrow';

type Staff = { id: string; name: string; email: string; role: StaffRole };
type Mod = { key: ModuleKey; label: string; group: string };

export default function App() {
  const [theme, setTheme] = useState<string>(() => localStorage.getItem('ops_theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('ops_theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((t) => (t === 'dark' ? 'light' : 'dark'));

  const [staff, setStaff] = useState<Staff | null>(() => {
    try {
      return JSON.parse(localStorage.getItem('ops_staff') || 'null');
    } catch {
      return null;
    }
  });

  if (!staff) {
    return (
      <Login
        onLogin={(s) => {
          localStorage.setItem('ops_staff', JSON.stringify(s));
          setStaff(s);
        }}
        theme={theme}
        onToggleTheme={toggleTheme}
      />
    );
  }

  return (
    <Shell
      staff={staff}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={() => {
        OpsApi.logout();
        localStorage.removeItem('ops_staff');
        setStaff(null);
      }}
    />
  );
}

// ───────────────────────── Login ─────────────────────────
function Login({ onLogin, theme, onToggleTheme }: { onLogin: (s: Staff) => void; theme: string; onToggleTheme: () => void }) {
  const [email, setEmail] = useState('ops@stayon.com');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const submit = async () => {
    setBusy(true);
    setErr('');
    try {
      const s = await OpsApi.login(email.trim(), '');
      onLogin(s);
    } catch (e: any) {
      setErr(e?.message || 'Login failed — is the backend running on :4000?');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="ops-login">
      {/* Branded hero — mirrors the user app splash/login */}
      <div className="ops-login-hero">
        <div className="ops-login-hero-overlay" />
        <div className="ops-login-hero-content">
          <div className="ops-login-brand">Stay<span className="ops-on">On</span></div>
          <div className="ops-login-tagline">Stay Beyond Ordinary</div>
          <div className="ops-login-kicker">Operations Control Center</div>
        </div>
      </div>

      {/* Sign-in panel */}
      <div className="ops-login-panel">
        <div className="ops-login-card">
          <h1 className="ops-login-h1">Stay<span className="ops-on">On</span> <small>Ops</small></h1>
          <p className="ops-login-p">Operations control center — staff sign in.</p>
          <input
            className="input"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="staff email"
            onKeyDown={(e) => e.key === 'Enter' && submit()}
          />
          <button className="btn ops-login-btn" onClick={submit} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
          {err && <p className="err">{err}</p>}
          <div className="ops-login-foot">
            <span className="muted">Seed admin: <b>ops@stayon.com</b></span>
            <button className="a" onClick={onToggleTheme}>{theme === 'dark' ? '☀ Light' : '🌙 Dark'}</button>
          </div>
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

  const [open, setOpen] = useState<Set<string>>(() => new Set(groups.map(([g]) => g)));
  const toggle = (g: string) => setOpen((s) => {
    const n = new Set(s);
    n.has(g) ? n.delete(g) : n.add(g);
    return n;
  });

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
                  <button key={m.key} className={`navitem${m.key === active ? ' active' : ''}`} onClick={() => setActive(m.key)}>
                    {m.label}
                  </button>
                ))}
              </div>
            );
          })}
        </nav>
      </aside>
      <main className="main">
        <div className="topbar">
          <h2>{current?.label}</h2>
          <div className="who">
            Signed in as <b>{staff.name}</b> · {staff.role}
            <button
              onClick={async () => {
                const p = window.prompt('Set your personal step-up PIN (4–6 digits):');
                if (p) {
                  try {
                    await OpsApi.setMyPin(p);
                    alert('PIN set ✓');
                  } catch (e: any) {
                    alert(e.message);
                  }
                }
              }}
            >
              Set PIN
            </button>
            <button
              onClick={async () => {
                try {
                  const e: any = await OpsApi.enroll2FA();
                  window.prompt('Add this secret to your authenticator app (Google Authenticator / Authy), then enter the 6-digit code below:\n\nSecret: ' + e.secret, '');
                  const code = window.prompt('Enter the 6-digit code from your authenticator app:');
                  if (code) {
                    await OpsApi.verify2FA(code);
                    alert('2FA enabled ✓ — your step-up now uses your authenticator code.');
                  }
                } catch (err: any) {
                  alert(err.message);
                }
              }}
            >
              Setup 2FA
            </button>
            <button onClick={onToggleTheme}>{theme === 'dark' ? '☀ Light' : '🌙 Dark'}</button>
            <button onClick={onLogout}>Sign out</button>
          </div>
        </div>
        {needsPin ? (
          <StepUpGate module={active} onUnlock={() => setUnlocked((s) => new Set(s).add(active))} />
        ) : (
          <Module key={active} module={active} modules={modules} go={setActive} />
        )}
      </main>
    </div>
  );
}

// ───────────────────────── Module Switcher ─────────────────────────
function Module({ module, modules, go }: { module: ModuleKey; modules: Mod[]; go: (k: ModuleKey) => void }) {
  switch (module) {
    case 'dashboard':
      return <Dashboard modules={modules} go={go} />;
    case 'guests':
      return (
        <PeopleQueue
          title="Guests (user side)"
          fetcher={OpsApi.guests}
          rowOf={(r) => ({
            title: r.name || r.phone || r.email || r.id,
            sub: `${r.status || 'active'} · ${r.bookings || 0} booking(s)${r.phone ? ' · ' + r.phone : ''}`
          })}
          actions={[
            { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
            { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
            { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
          ]}
        />
      );
    case 'hosts':
      return (
        <PeopleQueue
          title="Hosts (host side)"
          fetcher={OpsApi.hosts}
          rowOf={(r) => ({
            title: r.name,
            sub: `${r.published}/${r.listings} live · ★ ${r.rating || 'new'} · ${r.reviews} reviews · ${r.status || 'active'}`
          })}
          actions={[
            { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
            { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
            { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
          ]}
        />
      );
    case 'kyc':
      return (
        <ReviewQueue
          title="KYC submissions — tap a row to review the person"
          fetcher={OpsApi.queues.kyc}
          rowOf={(r: any) => ({
            title: r.legalName || r.legal_name || r.name || 'User',
            sub: `${r.idType || r.id_type || 'ID'} · ${r.status || 'pending'} — tap to review`
          })}
          idOf={(r: any) => r.userId || r.user_id || r.id}
          drawerTitle="Review identity"
          drawerActions={[
            { label: '✓ Verify identity', kind: 'ok', run: (id: string) => OpsApi.kycDecision(id, 'verify') },
            {
              label: '✕ Reject',
              kind: 'no',
              run: (id: string) =>
                OpsApi.kycDecision(
                  id,
                  'reject',
                  window.prompt('Reason for rejection (logged + sent to the user):', 'ID unclear or details do not match') || 'rejected'
                )
            },
          ]}
        />
      );
    case 'listings':
      return (
        <ListingQueue
          title="Listings pending review — tap to inspect & publish"
          fetcher={OpsApi.queues.listings}
          rowOf={(r: any) => ({
            title: r.title || 'Untitled stay',
            sub: `${[r.city, r.country].filter(Boolean).join(', ')} · ${r.status || 'pending'} — tap to review`
          })}
        />
      );
    case 'reels':
      return (
        <Queue
          title="Reels pending review"
          fetcher={OpsApi.queues.reels}
          rowOf={(r) => ({ title: r.caption || r.title || 'Reel', sub: r.status || 'pending' })}
          actions={[
            { label: 'Approve', kind: 'ok', run: (r) => OpsApi.reelDecision(r.id, 'approve') },
            { label: 'Reject', kind: 'no', run: (r) => OpsApi.reelDecision(r.id, 'reject') },
          ]}
        />
      );
    case 'reports':
      return (
        <Queue
          title="Reports"
          fetcher={OpsApi.reports}
          rowOf={(r) => ({ title: `${r.targetType || r.target_type || 'item'} · ${r.reason || ''}`, sub: r.status || 'open' })}
          actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.resolveReport(r.id, 'reviewed') }]}
        />
      );
    case 'users':
      return (
        <PeopleQueue
          title="Users"
          fetcher={OpsApi.users}
          rowOf={(r) => ({ title: r.name || r.phone || r.email || r.id, sub: `${r.status || 'active'}${r.phone ? ' · ' + r.phone : ''}` })}
          actions={[
            { label: 'Suspend', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'suspend') },
            { label: 'Ban', kind: 'no', run: (r) => OpsApi.userAction(r.id, 'ban') },
            { label: 'Reinstate', kind: 'ok', run: (r) => OpsApi.userAction(r.id, 'reinstate') },
          ]}
        />
      );
    case 'bookings':
      return (
        <BookingQueue
          title="Bookings — tap to see who pays whom + payout & hold"
          fetcher={OpsApi.bookings}
          rowOf={(r: any) => ({
            title: `${r.code} · ${r.listingTitle || r.listing_title || ''}`,
            sub: `${r.status} · ${r.checkIn || r.check_in || ''}→${r.checkOut || r.check_out || ''} — tap`
          })}
        />
      );
    case 'finance':
      return <Finance />;
    case 'support':
      return (
        <Queue
          title="Support tickets"
          fetcher={() => OpsApi.list('tickets')}
          rowOf={(r) => ({
            title: `${r.subject || '(no subject)'}${slaTag(r)}`,
            sub: `${r.category || 'general'} · ${r.priority || 'normal'} · ${r.status || 'open'} · open ${sinceShort(r.created_at)}`
          })}
          actions={[
            { label: 'In progress', kind: 'ok', run: (r) => OpsApi.action('tickets', r.id, 'in_progress') },
            { label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('tickets', r.id, 'resolved') },
          ]}
          create={{
            fields: [
              ['subject', 'Subject'],
              ['category', 'Category'],
              ['body', 'Details']
            ],
            submit: (v) => OpsApi.create('tickets', v)
          }}
        />
      );
    case 'disputes':
      return (
        <Queue
          title="Disputes"
          fetcher={() => OpsApi.list('disputes')}
          rowOf={(r) => ({ title: `${r.kind || 'dispute'} · ${r.booking_code || ''}`, sub: `$${r.amount_usd || 0} · ${r.status || 'open'}` })}
          actions={[
            { label: 'Resolve (guest)', kind: 'ok', run: (r) => OpsApi.action('disputes', r.id, 'resolved', { resolution: 'guest' }) },
            { label: 'Resolve (host)', kind: 'ok', run: (r) => OpsApi.action('disputes', r.id, 'resolved', { resolution: 'host' }) },
            { label: 'Reject', kind: 'no', run: (r) => OpsApi.action('disputes', r.id, 'rejected') },
          ]}
          create={{
            fields: [
              ['kind', 'Kind'],
              ['booking_code', 'Booking code'],
              ['amount_usd', 'Amount (USD)']
            ],
            submit: (v) => OpsApi.create('disputes', { ...v, amount_usd: Number(v.amount_usd) || 0 })
          }}
        />
      );
    case 'safety':
      return (
        <Queue
          title="Safety cases"
          fetcher={() => OpsApi.list('safety-cases')}
          rowOf={(r) => ({ title: `${r.kind || 'incident'} · ${r.severity || 'medium'}`, sub: `${r.description || ''} · ${r.status || 'open'}` })}
          actions={[
            { label: 'Escalate', kind: 'no', run: (r) => OpsApi.action('safety-cases', r.id, 'escalated') },
            { label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('safety-cases', r.id, 'resolved') },
          ]}
          create={{
            fields: [
              ['kind', 'Kind'],
              ['severity', 'Severity (low/medium/high)'],
              ['description', 'Description']
            ],
            submit: (v) => OpsApi.create('safety-cases', v)
          }}
        />
      );
    case 'qa':
      return (
        <Queue
          title="Host scorecards"
          fetcher={OpsApi.qaScorecards}
          rowOf={(r) => ({ title: r.host, sub: `${r.published}/${r.listings} live · ★ ${r.rating || 'new'} · ${r.reviews} reviews` })}
        />
      );
    case 'insights':
      return <Metrics fetcher={OpsApi.qaInsights} />;
    case 'markets':
      return (
        <Queue
          title="Markets"
          fetcher={() => OpsApi.list('markets')}
          rowOf={(r) => ({
            title: `${r.name} (${r.currency})`,
            sub: `${r.country} · ${r.enabled ? 'enabled' : 'disabled'} · tax ${Math.round((r.tax_rate || 0) * 100)}%`
          })}
          actions={[
            { label: 'Enable', kind: 'ok', run: (r) => OpsApi.action('markets', r.id, 'enabled', { enabled: true }) },
            { label: 'Disable', kind: 'no', run: (r) => OpsApi.action('markets', r.id, 'disabled', { enabled: false }) },
          ]}
          create={{
            fields: [
              ['name', 'Market name'],
              ['country', 'Country'],
              ['currency', 'Currency']
            ],
            submit: (v) => OpsApi.create('markets', v)
          }}
        />
      );
    case 'partners':
      return (
        <Queue
          title="Partners"
          fetcher={() => OpsApi.list('partners')}
          rowOf={(r) => ({ title: `${r.name} · ${r.kind || ''}`, sub: `${r.city || ''} · ${r.status || 'active'}` })}
          actions={[{ label: 'Deactivate', kind: 'no', run: (r) => OpsApi.action('partners', r.id, 'inactive') }]}
          create={{
            fields: [
              ['name', 'Partner name'],
              ['kind', 'Kind (cleaning/property_manager)'],
              ['city', 'City']
            ],
            submit: (v) => OpsApi.create('partners', v)
          }}
        />
      );
    case 'field':
      return (
        <Queue
          title="Field tasks"
          fetcher={() => OpsApi.list('field-tasks')}
          rowOf={(r) => ({ title: r.title || r.kind || 'Task', sub: `${r.city || ''} · ${r.assignee || 'unassigned'} · ${r.status || 'open'}` })}
          actions={[
            { label: 'Assign me', kind: 'ok', run: (r) => OpsApi.action('field-tasks', r.id, 'assigned', { assignee: 'me' }) },
            { label: 'Complete', kind: 'ok', run: (r) => OpsApi.action('field-tasks', r.id, 'done') },
          ]}
          create={{
            fields: [
              ['title', 'Task'],
              ['kind', 'Kind (inspection)'],
              ['city', 'City']
            ],
            submit: (v) => OpsApi.create('field-tasks', v)
          }}
        />
      );
    case 'compliance':
      return (
        <Queue
          title="Region rules (STR regulations)"
          fetcher={() => OpsApi.list('region-rules')}
          rowOf={(r) => ({
            title: r.region,
            sub: `max ${r.max_nights || '∞'} nights · ${r.permit_required ? 'permit required' : 'no permit'} · ${r.tax_note || ''}`
          })}
          create={{
            fields: [
              ['region', 'Region'],
              ['max_nights', 'Max nights'],
              ['tax_note', 'Tax note']
            ],
            submit: (v) => OpsApi.create('region-rules', { ...v, max_nights: Number(v.max_nights) || null })
          }}
        />
      );
    case 'verification':
      return (
        <ReviewQueue
          title="Guest verification — new vs existing (tap to review)"
          fetcher={OpsApi.verification}
          rowOf={(r: any) => ({
            title: `${r.name} · ${r.tier === 'new' ? '🆕 NEW user' : 'existing'}`,
            sub: `${r.idType || 'ID'} · ${r.status} — tap to review`
          })}
          idOf={(r: any) => r.userId}
          drawerTitle="Review identity"
          drawerActions={[
            { label: '✓ Verify identity', kind: 'ok', run: (id: string) => OpsApi.kycDecision(id, 'verify') },
            {
              label: '✕ Reject',
              kind: 'no',
              run: (id: string) =>
                OpsApi.kycDecision(
                  id,
                  'reject',
                  window.prompt('Reason for rejection (logged + sent to the user):', 'ID unclear or details do not match') || 'rejected'
                )
            },
          ]}
        />
      );
    case 'risk':
      return <RiskCenter />;
    case 'maintenance':
      return (
        <Queue
          title="Maintenance & damages"
          fetcher={() => OpsApi.list('maintenance')}
          rowOf={(r) => ({
            title: `${r.kind || 'issue'} · ${r.listing_title || ''}`,
            sub: `${r.severity || 'medium'} · ${r.description || ''} · ${r.status || 'open'}`
          })}
          actions={[{ label: 'Resolve', kind: 'ok', run: (r) => OpsApi.action('maintenance', r.id, 'resolved') }]}
          create={{
            fields: [
              ['listing_title', 'Listing'],
              ['kind', 'Kind (repair/damage)'],
              ['description', 'Description'],
              ['severity', 'Severity']
            ],
            submit: (v) => OpsApi.create('maintenance', v)
          }}
        />
      );
    case 'escrow':
      return <PayoutEscrow />;
    case 'bank':
      return (
        <Queue
          title="Bank-account verification (before first payout)"
          fetcher={() => OpsApi.list('bank-accounts')}
          rowOf={(r) => ({
            title: `${r.host_name || 'Host'} · ${r.bank || ''} ${r.masked || ''}`,
            sub: `${r.country || ''} · ${r.status || 'pending'}`
          })}
          actions={[
            { label: 'Verify', kind: 'ok', run: (r) => OpsApi.action('bank-accounts', r.id, 'verified') },
            { label: 'Reject', kind: 'no', run: (r) => OpsApi.action('bank-accounts', r.id, 'rejected') },
          ]}
          create={{
            fields: [
              ['host_name', 'Host'],
              ['bank', 'Bank'],
              ['masked', 'Masked account'],
              ['country', 'Country']
            ],
            submit: (v) => OpsApi.create('bank-accounts', v)
          }}
        />
      );
    case 'devops':
      return <DevOps />;
    case 'settlements':
      return <Settlements />;
    case 'satisfaction':
      return <Metrics fetcher={OpsApi.satisfaction} />;
    case 'devrequests':
      return (
        <Queue
          title="Dev requests → development team"
          fetcher={() => OpsApi.list('dev-requests')}
          rowOf={(r: any) => ({
            title: `${r.kind || 'feature'} · ${r.title || ''}`,
            sub: `${r.area || ''} · ${r.priority || 'normal'} · ${r.status || 'open'}`
          })}
          actions={[
            { label: 'In dev', kind: 'ok', run: (r) => OpsApi.action('dev-requests', r.id, 'in_dev') },
            { label: 'Shipped', kind: 'ok', run: (r) => OpsApi.action('dev-requests', r.id, 'shipped') },
            { label: 'Decline', kind: 'no', run: (r) => OpsApi.action('dev-requests', r.id, 'declined') },
          ]}
          create={{
            fields: [
              ['title', 'Title'],
              ['kind', 'Kind (feature/bug/improvement)'],
              ['area', 'Area'],
              ['detail', 'Details']
            ],
            submit: (v) => OpsApi.create('dev-requests', v)
          }}
        />
      );
    case 'audit':
      return (
        <Queue
          title="Audit log"
          fetcher={OpsApi.audit}
          rowOf={(r) => ({
            title: `${r.action || ''} · ${r.target_type || r.targetType || ''}`,
            sub: `${r.actor_name || r.actorName || 'system'} · ${fmt(r.created_at || r.createdAt)}`
          })}
        />
      );
    default:
      return <div className="empty">This module is in the build roadmap — see STAYON_OPS_SYSTEM_PLAN.md.</div>;
  }
}

// Simple metrics list
function Metrics({ fetcher }: { fetcher: () => Promise<any> }) {
  const [items, setItems] = useState<any[] | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    fetcher()
      .then((d) => setItems(d?.items || []))
      .catch((e) => setErr(e.message));
  }, [fetcher]);

  if (err) return <div className="empty">{err}</div>;
  if (!items) return <div className="empty">Loading…</div>;

  return (
    <div className="metrics">
      {items.map((m) => (
        <div className="metric" key={m.id}>
          <div className="v">{m.value}</div>
          <div className="k">{m.label}</div>
        </div>
      ))}
    </div>
  );
}

// People queue + 360 Drawer
function PeopleQueue(props: Parameters<typeof Queue>[0]) {
  const [sel, setSel] = useState<string | null>(null);
  return (
    <>
      <Queue {...props} onRow={(r: any) => setSel(r.id)} />
      {sel && <Drawer id={sel} onClose={() => setSel(null)} />}
    </>
  );
}
