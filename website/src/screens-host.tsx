import React, { useEffect, useRef, useState } from 'react';
import { useApp } from './store';
import { Icon, GradientButton, Logo } from './ui';
import {
  RESERVATIONS, type Reservation, type HostListing,
  HOST_PLACE_TYPES, HOST_PLACE_KINDS, HOST_WHO_ELSE, HOST_AMENITY_GROUPS, ALL_HOST_AMENITIES,
  HOST_HIGHLIGHTS, HOST_DISCOUNTS, HOST_SAFETY, HOST_STOCK_PHOTOS, placeTypeLabel,
} from './data';
import { api } from './api';

/* ───────────────────────── Host landing — animated, image-rich, light premium ───────────────────────── */
function Reveal({ children, className = '', delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current; if (!el) return;
    const ob = new IntersectionObserver(([e]) => { if (e.isIntersecting) setSeen(true); }, { threshold: 0.15 });
    ob.observe(el); return () => ob.disconnect();
  }, []);
  return <div ref={ref} className={`reveal ${className}${seen ? ' in' : ''}`} style={delay ? { transitionDelay: `${delay}ms` } : undefined}>{children}</div>;
}

const u = (id: string, w = 2000) => `https://images.unsplash.com/${id}?w=${w}&q=85&auto=format&fit=crop`;

const HL_FEATURES = [
  { img: 'photo-1502672260266-1c1ef2d93688', tag: 'YOUR PRICE', title: 'Set your price.\nKeep all of it.', body: 'StayOn charges a 0% host fee — the number you set is the number you make, on every single booking.' },
  { img: 'photo-1560448204-e02f11c3d0e2', tag: 'STAYCOVER', title: 'Protected on\nevery stay.', body: 'Damage protection and verified guests come built into every booking, free — so you can host with peace of mind.' },
  { img: 'photo-1505691938895-1758d7feb511', tag: 'EFFORTLESS', title: 'Go live in\nminutes.', body: 'A few photos, a price and the basics — and your place is open to travellers around the world.' },
];

const HL_TOOLS = [
  ['cal', 'Smart calendar', 'Set prices, block dates and manage availability with ease.'],
  ['clipboard', 'Reservations', 'Accept or decline booking requests in a single tap.'],
  ['wallet', 'Fast payouts', 'Get paid about 24 hours after check-in — fee-free.'],
  ['chart', 'Earnings & insights', 'Track income, occupancy and trends at a glance.'],
  ['msg', 'Guest messaging', 'Chat with guests before, during and after their stay.'],
  ['shield', 'StayCover', 'Damage protection built into every booking, free.'],
];

const HL_TRUST = [
  ['shield', 'StayCover protection', 'Damage protection built into every single booking — free.'],
  ['user', 'Verified guests', 'Every guest is identity-checked before they can book.'],
  ['lock', 'Secure, on-time payouts', 'Paid reliably, about 24 hours after each check-in.'],
  ['msg', '24/7 host support', 'Real people on the line, any hour you need them.'],
];

const lines = (t: string) => t.split('\n').map((l, k) => <React.Fragment key={k}>{k > 0 && <br />}{l}</React.Fragment>);

export function HostLanding() {
  const { navigate, user, setPending, hostAccount, money, currency } = useApp();
  // New hosts go through Get started → identity → wizard; returning hosts open their dashboard.
  const start = () => {
    if (!user) { setPending({ name: 'host-create' }); navigate('auth'); return; }
    navigate(hostAccount?.verified ? 'host-today' : 'host-create');
  };

  return (
    <div className="hl">
      <header className="hl-nav">
        <div className="hl-nav-inner">
          <Logo host onClick={() => navigate('home')} />
          <div className="hl-nav-right">
            <button className="hl-back" onClick={() => navigate('home')}>Back to site</button>
            <GradientButton onClick={start}>Get started</GradientButton>
          </div>
        </div>
      </header>

      {/* HERO — animated gradient mesh + floating property cards */}
      <section className="hl-hero">
        <div className="hl-mesh"><span className="blob b1" /><span className="blob b2" /><span className="blob b3" /></div>
        <div className="hl-hero-inner">
          <div className="hl-hero-text">
            <span className="hl-eyebrow"><Icon name="home" size={13} /> STAYON FOR HOSTS</span>
            <h1>Turn your space into <span className="hl-accent">income</span>.</h1>
            <p>List in minutes, set your own price, and keep 100% of what you earn. StayOn never charges a host fee.</p>
            <div className="hl-hero-cta">
              <GradientButton icon="arrow" onClick={start}>Get started</GradientButton>
              <button className="hl-ghost" onClick={start}>See how it works</button>
            </div>
            <div className="hl-hero-meta">
              <span><Icon name="check" size={15} /> No host fees</span>
              <span><Icon name="check" size={15} /> Free to list</span>
              <span><Icon name="check" size={15} /> StayCover included</span>
            </div>
          </div>

          <div className="hl-collage">
            <div className="hl-fcard c1"><img src={u('photo-1613490493576-7fde63acd811', 700)} alt="" /><div className="hl-fcard-b"><b>Palm Garden Villa</b><span>Goa · {money(280)}/night</span></div></div>
            <div className="hl-fcard c2"><img src={u('photo-1502672260266-1c1ef2d93688', 700)} alt="" /><div className="hl-fcard-b"><b>Sunlit Loft</b><span>Hyderabad · {money(110)}/night</span></div></div>
            <div className="hl-chip ch1"><span className="hl-chip-ico"><Icon name="dollar" size={16} /></span><div><b>{money(2940)}</b><small>this month · 0% fee</small></div></div>
            <div className="hl-chip ch2"><Icon name="star" size={15} fill color="#F59E0B" /> 4.9 · Superhost</div>
          </div>
        </div>
      </section>

      {/* TOOLS — everything you need to host */}
      <section className="hl-tools">
        <Reveal><h2 className="hl-h2">Everything you need to host</h2></Reveal>
        <Reveal delay={80}><p className="hl-tools-sub">One calm dashboard for your listings, calendar, guests and payouts.</p></Reveal>
        <div className="hl-tools-grid">
          {HL_TOOLS.map(([ic, t, d], i) => (
            <Reveal className="hl-tool" delay={(i % 3) * 90} key={t}>
              <span className="hl-tool-ico"><Icon name={ic} size={22} /></span>
              <b>{t}</b><p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* IMAGE FEATURE BANDS (alternating) */}
      {HL_FEATURES.map((f, i) => (
        <section className={`hl-feat${i % 2 ? ' rev' : ''}`} key={i}>
          <Reveal className="hl-feat-media"><img src={u(f.img)} alt="" /></Reveal>
          <Reveal className="hl-feat-text" delay={120}>
            <span className="hl-tag">{f.tag}</span>
            <h2>{lines(f.title)}</h2>
            <p>{f.body}</p>
          </Reveal>
        </section>
      ))}

      {/* HOW IT WORKS */}
      <section className="hl-how">
        <Reveal><h2 className="hl-h2">From empty room to first booking</h2></Reveal>
        <div className="hl-steps">
          {[
            ['camera', 'List your space', 'Add photos, a price and the basics in a few simple steps.'],
            ['cal', 'Welcome guests', 'Approve requests or use instant book — you’re always in control.'],
            ['wallet', 'Get paid', 'Your payout arrives about 24 hours after each check-in.'],
          ].map(([ic, t, d], i) => (
            <Reveal className="hl-step" delay={i * 110} key={i}>
              <span className="hl-step-ico"><Icon name={ic} size={22} /></span>
              <span className="hl-step-n">{i + 1}</span>
              <b>{t}</b><p>{d}</p>
            </Reveal>
          ))}
        </div>
      </section>

      {/* TRUST / SAFETY */}
      <section className="hl-trust">
        <Reveal className="hl-trust-media"><img src={u('photo-1505691938895-1758d7feb511')} alt="" /></Reveal>
        <Reveal className="hl-trust-text" delay={120}>
          <span className="hl-tag">PEACE OF MIND</span>
          <h2>Earn with total<br />confidence.</h2>
          <p>Every booking on StayOn is protected end-to-end, so you can welcome guests without a second thought.</p>
          <div className="hl-trust-list">
            {HL_TRUST.map(([ic, t, d]) => (
              <div className="hl-trust-row" key={t}>
                <span className="hl-trust-ico"><Icon name={ic} size={20} /></span>
                <div><b>{t}</b><span>{d}</span></div>
              </div>
            ))}
          </div>
        </Reveal>
      </section>

      {/* CTA — clean gradient band */}
      <section className="hl-cta">
        <Reveal className="hl-cta-in">
          <span className="hl-cta-tag">START TODAY</span>
          <h2>Your first guest is waiting.</h2>
          <p>It’s free to list, and you keep 100% of what you earn.</p>
          <GradientButton icon="arrow" onClick={start}>Get started</GradientButton>
        </Reveal>
      </section>

      {/* FOOTER */}
      <footer className="hl-foot">
        <div className="hl-foot-grid">
          <div className="hl-foot-brand">
            <Logo host onClick={() => navigate('home')} />
            <p>Stay beyond ordinary — and keep 100% of what you earn.</p>
            <div className="hl-foot-social">
              <button aria-label="Instagram"><Icon name="camera" size={17} /></button>
              <button aria-label="Messages"><Icon name="msg" size={17} /></button>
              <button aria-label="Share"><Icon name="share" size={17} /></button>
            </div>
          </div>
          {[
            { h: 'Hosting', links: ['Host resources', 'Community forum', 'Hosting responsibly', 'Refer a host'] },
            { h: 'Support', links: ['Help centre', 'Safety information', 'Cancellation options', 'StayCover'] },
            { h: 'StayOn', links: ['About us', 'Newsroom', 'Careers', 'Investors'] },
          ].map((c) => (
            <div className="hl-foot-col" key={c.h}>
              <div className="hl-foot-h">{c.h}</div>
              {c.links.map((l) => <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>)}
            </div>
          ))}
        </div>
        <div className="hl-foot-bar">
          <span>© 2026 StayOn, Inc. · Privacy · Terms</span>
          <span className="hl-foot-region"><Icon name="globe" size={15} /> English (IN) · {currency}</span>
        </div>
      </footer>
    </div>
  );
}

/* ───────────────────────── Host chrome (header + tabs) ───────────────────────── */
const HOST_TABS: { name: any; label: string; icon: string }[] = [
  { name: 'host-today', label: 'Today', icon: 'grid' },
  { name: 'host-listings', label: 'Listings', icon: 'home' },
  { name: 'host-reservations', label: 'Reservations', icon: 'clipboard' },
  { name: 'host-calendar', label: 'Calendar', icon: 'cal' },
  { name: 'host-earnings', label: 'Earnings', icon: 'chart' },
];

export function HostChrome({ children }: { children: React.ReactNode }) {
  const { route, navigate, exitHost } = useApp();
  return (
    <div className="hostapp">
      <header className="hnav">
        <div className="hnav-inner">
          <Logo host onClick={() => navigate('host-today')} />
          <nav className="hnav-tabs">
            {HOST_TABS.map((t) => (
              <button key={t.name} className={`hnav-tab${route.name === t.name ? ' on' : ''}`} onClick={() => navigate(t.name)}>
                <Icon name={t.icon} size={18} /> {t.label}
              </button>
            ))}
          </nav>
          <button className="hnav-switch" onClick={exitHost}><Icon name="arrow" size={16} /> Switch to travelling</button>
        </div>
      </header>
      <div className="hbody">{children}</div>
      {/* mobile tab bar */}
      <nav className="htabbar">
        {HOST_TABS.map((t) => (
          <button key={t.name} className={route.name === t.name ? 'on' : ''} onClick={() => navigate(t.name)}>
            <Icon name={t.icon} size={20} /><span>{t.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

/* ───────────────────────── Today (dashboard) ───────────────────────── */
export function HostToday() {
  const { navigate, user, hostListings, showToast, money } = useApp();
  const place = hostListings[0];
  const confirmed = RESERVATIONS.filter((r) => r.status === 'Confirmed');
  const pending = RESERVATIONS.filter((r) => r.status === 'Pending');
  const monthEarnings = RESERVATIONS.filter((r) => r.status !== 'Cancelled').reduce((a, r) => a + r.payout, 0);
  const next = confirmed[0];
  const tools = [
    ['home', 'Listings', () => navigate('host-listings')], ['cal', 'Calendar', () => navigate('host-calendar')],
    ['clipboard', 'Reservations', () => navigate('host-reservations')], ['chart', 'Earnings', () => navigate('host-earnings')],
    ['inbox', 'Inbox', () => showToast('Inbox coming soon')], ['star', 'Reviews', () => showToast('Reviews coming soon')],
    ['trending', 'Trends', () => navigate('host-earnings')], ['wallet', 'Payouts', () => navigate('host-earnings')],
    ['sparkle', 'Assistant', () => showToast('Ask the Assistant — coming soon')], ['plus', 'New listing', () => navigate('host-create')],
  ];
  return (
    <main className="hwrap">
      <div className="htoday-head">
        <div>
          <span className="h-eyebrow">TODAY · {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
          <h1>Good {new Date().getHours() < 12 ? 'morning' : new Date().getHours() < 18 ? 'afternoon' : 'evening'}, {user ? user.name.split(' ')[0] : 'host'}</h1>
        </div>
        <button className="h-bell"><Icon name="bell" size={20} /><i /></button>
      </div>

      {place && (
        <div className="h-hero" onClick={() => navigate('host-listings')}>
          <img src={place.image} alt={place.title} />
          <span className="h-hero-pill"><Icon name="home" size={13} /> Your place</span>
          <span className="h-hero-rating"><Icon name="star" size={12} fill color="#F59E0B" /> {place.rating.toFixed(2)}</span>
          <div className="h-hero-info">
            <div className="h-hero-title">{place.title}</div>
            <div className="h-hero-loc">{place.city}, {place.country}</div>
            <div className="h-hero-foot"><b>{money(place.price)} / night</b><span>Manage <Icon name="chevR" size={14} /></span></div>
          </div>
        </div>
      )}

      <div className="h-earn" onClick={() => navigate('host-earnings')}>
        <div><span>{new Date().toLocaleDateString('en-US', { month: 'long' })} earnings · 0% fee</span><b>{money(monthEarnings)}</b><small><Icon name="trending" size={13} /> {RESERVATIONS.filter(r => r.status !== 'Cancelled').length} bookings this month</small></div>
        <Icon name="chevR" size={22} />
      </div>

      <div className="h-glance">
        <div><span className="h-glance-ico teal"><Icon name="chart" size={18} /></span><b>{place?.occupancy ?? 0}%</b><small>Occupancy</small></div>
        <div><span className="h-glance-ico cyan"><Icon name="cal" size={18} /></span><b>{confirmed.length}</b><small>Upcoming</small></div>
        <div><span className="h-glance-ico gold"><Icon name="clock" size={18} /></span><b>{pending.length}</b><small>Requests</small></div>
      </div>

      <div className="h-tip">
        <span className="h-tip-ico"><Icon name="sparkle" size={18} /></span>
        <div><span className="h-tip-kicker">SMART TIP</span><b>Add weekend pricing to earn ~15% more</b><p>Listings with a Fri–Sat premium earn more on peak nights. Set yours in the calendar.</p></div>
      </div>

      {next && (
        <div className="h-next">
          <img src={next.avatar} alt={next.guest} />
          <div><span className="h-next-when">Next check-in · {next.checkIn}</span><b>{next.guest}</b><small>{next.nights} nights · {next.guests} guests</small></div>
          <button className="btn-outline sm" style={{ marginTop: 0 }} onClick={() => navigate('host-reservations')}>Prep</button>
        </div>
      )}

      <h2 className="h-h2">Tools</h2>
      <div className="h-tools">
        {tools.map(([ic, label, fn]: any) => (
          <button key={label} onClick={fn}><span><Icon name={ic} size={22} /></span>{label}</button>
        ))}
      </div>
    </main>
  );
}

/* ───────────────────────── Listings ───────────────────────── */
export function HostListings() {
  const { hostListings, navigate, money } = useApp();
  return (
    <main className="hwrap">
      <div className="h-pagehead"><h1>Your listings</h1><GradientButton icon="plus" onClick={() => navigate('host-create')}>Create</GradientButton></div>
      <div className="h-listings">
        {hostListings.map((l) => (
          <article className="h-listing" key={l.id} onClick={() => navigate('stay', { id: l.id })}>
            <div className="h-listing-media">
              <img src={l.image} alt={l.title} />
              <span className={`h-status ${l.status.toLowerCase()}`}>{l.status}</span>
              <span className="h-listing-rating"><Icon name="star" size={12} fill color="#F59E0B" /> {l.rating.toFixed(2)}</span>
              <div className="h-listing-overlay">
                <b>{l.title}</b>
                <span>{l.city}, {l.country} · {l.type}</span>
                <div className="h-listing-price">{money(l.price)} / night {l.instant && <i className="h-instant"><Icon name="bolt" size={11} fill /> Instant</i>}</div>
              </div>
            </div>
            <div className="h-listing-body">
              <span>{l.guests} guests · {l.bedrooms} bd · {l.beds} beds · {l.baths} ba</span>
              <Icon name="chevR" size={18} />
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}

/* ───────────────────────── Reservations ───────────────────────── */
export function HostReservations() {
  const { showToast, money } = useApp();
  const [tab, setTab] = useState<Reservation['status']>('Pending');
  const [overrides, setOverrides] = useState<Record<string, Reservation['status']>>({});
  const list = RESERVATIONS.map((r) => ({ ...r, status: overrides[r.id] || r.status }));
  const tabs: Reservation['status'][] = ['Pending', 'Confirmed', 'Completed', 'Cancelled'];
  const counts = tabs.reduce((m, t) => ({ ...m, [t]: list.filter((r) => r.status === t).length }), {} as Record<string, number>);
  const shown = list.filter((r) => r.status === tab);

  const act = (id: string, status: Reservation['status'], msg: string) => { setOverrides((o) => ({ ...o, [id]: status })); showToast(msg); };

  return (
    <main className="hwrap">
      <h1 className="h-pagetitle">Reservations</h1>
      <div className="h-restabs">
        {tabs.map((t) => (
          <button key={t} className={tab === t ? 'on' : ''} onClick={() => setTab(t)}>{t} {counts[t] > 0 && <i>{counts[t]}</i>}</button>
        ))}
      </div>
      {shown.length === 0 ? (
        <div className="empty"><div className="empty-ico"><Icon name="clipboard" size={42} /></div><h3>Nothing here yet</h3><p>{tab} reservations will appear here.</p></div>
      ) : shown.map((r) => (
        <article className="h-res" key={r.id}>
          <div className="h-res-top">
            <img src={r.avatar} alt={r.guest} />
            <div className="h-res-id"><b>{r.guest}</b><span>{r.listing}</span></div>
            <span className={`h-status ${r.status.toLowerCase()}`}>{r.status}</span>
          </div>
          {r.message && <p className="h-res-msg">“{r.message}”</p>}
          <div className="h-res-facts">
            <div><Icon name="cal" size={15} /> {r.checkIn} – {r.checkOut}</div>
            <div><Icon name="moon2" size={15} /> {r.nights}n</div>
            <div><Icon name="users" size={15} /> {r.guests}</div>
          </div>
          <div className="h-res-foot">
            <div className="h-res-payout"><b>{money(r.payout)}</b><span>your payout · 0% fee</span></div>
            {r.status === 'Pending' && (
              <div className="h-res-actions">
                <button className="btn-outline sm" style={{ marginTop: 0 }} onClick={() => act(r.id, 'Cancelled', 'Request declined')}>Decline</button>
                <GradientButton onClick={() => act(r.id, 'Confirmed', 'Reservation confirmed')}>Accept</GradientButton>
              </div>
            )}
            {r.status === 'Confirmed' && <button className="btn-outline sm" style={{ marginTop: 0 }} onClick={() => showToast('Check-in prep sent to guest')}>Prep check-in</button>}
            {r.status === 'Completed' && <button className="btn-outline sm" style={{ marginTop: 0 }} onClick={() => showToast('Thanks for reviewing!')}><Icon name="star" size={14} /> Review</button>}
          </div>
        </article>
      ))}
    </main>
  );
}

/* ───────────────────────── Earnings ───────────────────────── */
export function HostEarnings() {
  const { money } = useApp();
  const active = RESERVATIONS.filter((r) => r.status !== 'Cancelled');
  const total = active.reduce((a, r) => a + r.payout, 0);
  const nights = active.reduce((a, r) => a + r.nights, 0);
  const pending = RESERVATIONS.filter((r) => r.status === 'Pending').reduce((a, r) => a + r.payout, 0);
  const avg = Math.round(total / Math.max(1, nights));
  const months = [['Jan', 1200], ['Feb', 1850], ['Mar', 2100], ['Apr', 2640], ['May', 1980], ['Jun', total]] as [string, number][];
  const max = Math.max(...months.map((m) => m[1]));
  const statuses: { k: Reservation['status']; c: string }[] = [{ k: 'Confirmed', c: 'var(--teal-light)' }, { k: 'Completed', c: 'var(--teal)' }, { k: 'Pending', c: 'var(--gold)' }, { k: 'Cancelled', c: 'var(--coral)' }];

  return (
    <main className="hwrap">
      <h1 className="h-pagetitle">Earnings &amp; analytics</h1>
      <div className="h-earn-hero">
        <span>Total earnings</span><b>{money(total)}</b><small>{active.length} bookings · {nights} nights</small>
      </div>
      <div className="h-earn-cards">
        <div><span className="h-glance-ico gold"><Icon name="clock" size={18} /></span><b>{money(pending)}</b><small>Pending payout</small></div>
        <div><span className="h-glance-ico teal"><Icon name="dollar" size={18} /></span><b>{money(avg)}</b><small>Avg nightly</small></div>
      </div>

      <h2 className="h-h2">Revenue by month</h2>
      <div className="h-barchart">
        {months.map(([m, v]) => (
          <div key={m} className="h-bar"><div className="h-bar-fill" style={{ height: `${(v / max) * 100}%` }} title={money(v)} /><span>{m}</span></div>
        ))}
      </div>

      <h2 className="h-h2">Bookings by status</h2>
      <div className="h-statusbar">
        {statuses.map((s) => { const n = RESERVATIONS.filter((r) => r.status === s.k).length; return n ? <div key={s.k} style={{ flex: n, background: s.c }} title={`${s.k}: ${n}`} /> : null; })}
      </div>
      <div className="h-legend">
        {statuses.map((s) => <span key={s.k}><i style={{ background: s.c }} /> {s.k} · {RESERVATIONS.filter((r) => r.status === s.k).length}</span>)}
      </div>

      <h2 className="h-h2">Payouts</h2>
      <div className="h-payouts">
        {active.slice(0, 5).map((r) => (
          <div key={r.id} className="h-payout">
            <span className={`h-pay-ico ${r.status === 'Completed' ? 'paid' : 'sched'}`}><Icon name={r.status === 'Completed' ? 'check' : 'clock'} size={15} /></span>
            <div><b>{r.guest}</b><span>{r.status === 'Completed' ? `Paid · ${r.checkOut}` : `Scheduled after ${r.checkOut}`}</span></div>
            <b>{money(r.payout)}</b>
          </div>
        ))}
      </div>
    </main>
  );
}

/* ───────────────────────── Calendar ───────────────────────── */
export function HostCalendar() {
  const { hostListings, showToast, money } = useApp();
  const place = hostListings[0];
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const booked = new Set([14, 15, 16, 17, 28, 29]); // demo booked nights
  const blocked = new Set([8, 9]);
  const move = (d: number) => { let m = month + d, y = year; if (m < 0) { m = 11; y--; } if (m > 11) { m = 0; y++; } setMonth(m); setYear(y); };
  const cells: (number | null)[] = [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => i + 1)];

  return (
    <main className="hwrap">
      <h1 className="h-pagetitle">Calendar</h1>
      <div className="h-cal-listing">{place ? place.title : 'Publish a listing first'}</div>
      <div className="h-cal">
        <div className="h-cal-nav">
          <button onClick={() => move(-1)}><Icon name="chevL" size={18} /></button>
          <b>{new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</b>
          <button onClick={() => move(1)}><Icon name="chevR" size={18} /></button>
        </div>
        <div className="h-cal-week">{['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => <span key={i}>{d}</span>)}</div>
        <div className="h-cal-grid">
          {cells.map((d, i) => d === null ? <span key={i} /> : (
            <button key={i} className={`h-cal-day${booked.has(d) ? ' booked' : ''}${blocked.has(d) ? ' blocked' : ''}`}
              disabled={booked.has(d)} onClick={() => showToast(blocked.has(d) ? 'Date unblocked' : `Custom price set for ${d}`)}>
              <b>{d}</b>
              {booked.has(d) ? <small>Booked</small> : blocked.has(d) ? <Icon name="lock" size={12} /> : <small className="h-cal-price">{place ? money(place.price) : ''}</small>}
            </button>
          ))}
        </div>
      </div>
      <div className="h-legend">
        <span><i style={{ background: '#fff', border: '1px solid var(--line)' }} /> Open</span>
        <span><i style={{ background: 'var(--teal-ultra)' }} /> Booked</span>
        <span><i style={{ background: 'var(--line)' }} /> Blocked</span>
      </div>
      {place && <div className="h-cal-pricing"><b>Default pricing</b><div><span>Weekday rate</span><span>{money(place.price)}</span></div><div><span>Weekend rate</span><span>{money(place.weekend)}</span></div><div><span>Cleaning fee</span><span>{money(place.cleaning)}</span></div></div>}
    </main>
  );
}

/* ───────────────────────── Create-listing wizard (full host-app flow) ───────────────────────── */
const PHASE1 = ['p1intro', 'type', 'kind', 'location', 'basics', 'bathrooms', 'whoelse'];
const PHASE2 = ['p2intro', 'amenities', 'photos', 'title', 'highlights', 'description'];
const PHASE3 = ['p3intro', 'booking', 'price', 'weekend', 'discounts', 'safety', 'final'];
const MIN_PHOTOS = 6;

const INTRO: Record<string, { n: number; t: string; s: string; img: string }> = {
  p1intro: { n: 1, t: 'Tell us about your place', s: "We'll ask which type of property you have and whether guests book the entire place or just a room. Then your location and how many guests can stay.", img: HOST_STOCK_PHOTOS[1] },
  p2intro: { n: 2, t: 'Make your place stand out', s: 'Add the amenities your place offers, plus 6 or more photos. Then create a title and a description.', img: HOST_STOCK_PHOTOS[2] },
  p3intro: { n: 3, t: 'Finish up and publish', s: 'Choose your booking settings, set up pricing and discounts, then publish your listing and go live.', img: HOST_STOCK_PHOTOS[6] },
};

type Draft = {
  type: string; placeType: 'entire' | 'room' | 'shared';
  address: string; area: string; city: string; state: string; country: string; zipcode: string;
  guests: number; bedrooms: number; beds: number; bathrooms: number; bedroomLock: boolean;
  bathroomKind: 'private' | 'dedicated' | 'shared';
  whoElse: string[]; amenities: string[]; images: string[]; title: string; highlights: string[];
  description: string; bookingApproval: 'approve5' | 'instant'; price: number; weekendPct: number;
  discounts: { newListing: boolean; lastMinute: boolean; weekly: boolean; monthly: boolean };
  safety: string[];
};

export function HostCreate() {
  const { navigate, addHostListing, registerHost, hostAccount, showToast, money } = useApp();
  // Identity is verified at login (mandatory before publishing), so the wizard is
  // purely the listing steps. `existingHost` just controls exit navigation.
  const existingHost = !!hostAccount?.verified;
  const STEPS = ['overview', ...PHASE1, ...PHASE2, ...PHASE3];

  const [i, setI] = useState(0);
  const id = STEPS[i];

  const [d, setD] = useState<Draft>({
    type: '', placeType: 'entire',
    address: '', area: '', city: '', state: '', country: '', zipcode: '',
    guests: 4, bedrooms: 1, beds: 1, bathrooms: 1, bedroomLock: false, bathroomKind: 'private',
    whoElse: [], amenities: [], images: [], title: '', highlights: [],
    description: '', bookingApproval: 'approve5', price: 120, weekendPct: 0,
    discounts: { newListing: true, lastMinute: false, weekly: true, monthly: false }, safety: [],
  });
  const set = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }));

  const toggle = (key: 'whoElse' | 'amenities' | 'safety' | 'highlights', val: string, max?: number) =>
    setD((prev) => {
      const has = prev[key].includes(val);
      let arr = has ? prev[key].filter((x) => x !== val) : [...prev[key], val];
      if (!has && max && arr.length > max) arr = arr.slice(arr.length - max);
      return { ...prev, [key]: arr };
    });

  const canNext = (() => {
    switch (id) {
      case 'type': return !!d.type;
      case 'location': return !!(d.address.trim() && d.city.trim() && d.country.trim());
      case 'amenities': return d.amenities.length > 0;
      case 'photos': return d.images.length >= MIN_PHOTOS;
      case 'title': return d.title.trim().length > 0;
      case 'price': return d.price > 0;
      default: return true;
    }
  })();

  const phaseIdx = PHASE1.includes(id) ? 0 : PHASE2.includes(id) ? 1 : PHASE3.includes(id) ? 2 : -1;
  const segFill = (p: number) => {
    if (phaseIdx === -1) return 0;
    if (phaseIdx > p) return 1;
    if (phaseIdx < p) return 0;
    const arr = [PHASE1, PHASE2, PHASE3][p];
    return (arr.indexOf(id) + 1) / arr.length;
  };

  const buildListing = (status: HostListing['status']): HostListing => ({
    id: 'hl-' + Date.now(),
    title: d.title || 'Untitled listing', type: placeTypeLabel(d.type),
    city: d.city || '—', country: d.country || '—', status,
    price: d.price, weekend: Math.round(d.price * (1 + d.weekendPct / 100)), cleaning: 0,
    rating: 0, reviews: 0,
    guests: d.guests, bedrooms: d.bedrooms, beds: d.beds, baths: d.bathrooms,
    instant: d.bookingApproval === 'instant',
    image: d.images[0] || HOST_STOCK_PHOTOS[0], occupancy: 0,
    placeType: d.placeType, bathroomKind: d.bathroomKind, whoElse: d.whoElse, bedroomLock: d.bedroomLock,
    address: d.address, area: d.area, state: d.state, zipcode: d.zipcode,
    amenities: d.amenities, images: d.images, description: d.description, highlights: d.highlights,
    discounts: d.discounts, safety: d.safety,
  });

  const next = () => {
    if (id === 'final') {
      addHostListing(buildListing('Published'));
      registerHost(true);
      // Best-effort: publish to the backend too (no-op if it isn't running).
      api.publishListing({
        title: d.title, type: placeTypeLabel(d.type), placeType: d.placeType, description: d.description,
        address: d.address, city: d.city, state: d.state, country: d.country, zipcode: d.zipcode,
        guests: d.guests, bedrooms: d.bedrooms, beds: d.beds, bathrooms: d.bathrooms,
        priceUSD: d.price, weekendPriceUSD: Math.round(d.price * (1 + d.weekendPct / 100)), cleaningFeeUSD: 0,
        images: d.images, amenities: d.amenities, highlights: d.highlights,
        instantBook: d.bookingApproval === 'instant', safety: d.safety,
      });
      showToast('Listing published — you are live');
      navigate('host-listings');
      return;
    }
    if (i < STEPS.length - 1) setI(i + 1);
  };
  const back = () => { if (i > 0) setI(i - 1); else navigate(existingHost ? 'host-today' : 'host-landing'); };
  const saveExit = () => {
    if (phaseIdx >= 0 && (d.title || d.city || d.type)) {
      addHostListing(buildListing('Draft'));
      registerHost(false);
      showToast('Saved as a draft');
    }
    navigate('host-today');
  };
  const nextLabel = id === 'overview' ? 'Get started' : id === 'final' ? 'Publish listing' : 'Next';

  const Counter = ({ label, val, on, min = 0 }: { label: string; val: number; on: (n: number) => void; min?: number }) => (
    <div className="hcw-counter"><span>{label}</span><div className="stepper">
      <button onClick={() => on(Math.max(min, val - 1))} disabled={val <= min}><Icon name="minus" size={16} /></button>
      <b>{val}</b><button onClick={() => on(val + 1)}><Icon name="plus" size={16} /></button>
    </div></div>
  );

  const intro = INTRO[id];

  return (
    <main className="hcw">
      <header className="hcw-top">
        <Logo host onClick={() => navigate('host-today')} />
        {phaseIdx >= 0 ? (
          <div className="hcw-prog">
            {[0, 1, 2].map((p) => <span key={p} className="hcw-seg"><i style={{ width: `${segFill(p) * 100}%` }} /></span>)}
          </div>
        ) : <span className="hcw-prog-spacer" />}
        <button className="hcw-exit" onClick={saveExit}>{i === 0 ? 'Exit' : 'Save & exit'}</button>
      </header>

      <div className="hcw-scroll">
        <div className={`hcw-body${id === 'overview' || intro ? ' wide' : ''}`}>

          {id === 'overview' && (
            <div className="hcw-overview">
              <h1>It’s easy to get started on StayOn</h1>
              <ol className="hcw-ov">
                {[
                  ['home', 'Tell us about your place', 'Share some basic info, like where it is and how many guests can stay.'],
                  ['camera', 'Make it stand out', 'Add 6 or more photos plus a title and description — we’ll help you out.'],
                  ['dollar', 'Finish up and publish', 'Choose a starting price, verify a few details, then publish your listing.'],
                ].map(([ic, t, s], n) => (
                  <li key={n}><span className="hcw-ov-n">{n + 1}</span><div><b>{t}</b><p>{s}</p></div><span className="hcw-ov-ic"><Icon name={ic} size={26} /></span></li>
                ))}
              </ol>
            </div>
          )}

          {intro && (
            <div className="hcw-intro">
              <div className="hcw-intro-text"><span className="hcw-stepno">Step {intro.n}</span><h1>{intro.t}</h1><p>{intro.s}</p></div>
              <div className="hcw-intro-media"><img src={intro.img} alt="" /></div>
            </div>
          )}

          {id === 'type' && (<>
            <h1 className="hcw-h1">Which of these best describes your place?</h1>
            <div className="hcw-typegrid">
              {HOST_PLACE_TYPES.map((t) => (
                <button key={t.id} className={`hcw-type${d.type === t.id ? ' on' : ''}`} onClick={() => set({ type: t.id })}>
                  <Icon name={t.icon} size={26} /><span>{t.label}</span>
                </button>
              ))}
            </div>
          </>)}

          {id === 'kind' && (<>
            <h1 className="hcw-h1">What type of place will guests have?</h1>
            <div className="hcw-opts">
              {HOST_PLACE_KINDS.map((k) => (
                <button key={k.id} className={`hcw-opt${d.placeType === k.id ? ' on' : ''}`} onClick={() => set({ placeType: k.id })}>
                  <div><b>{k.label}</b><span>{k.sub}</span></div><Icon name={k.icon} size={26} />
                </button>
              ))}
            </div>
          </>)}

          {id === 'location' && (<>
            <h1 className="hcw-h1">Where’s your place located?</h1>
            <p className="hcw-lead">Your address is only shared with guests after they’ve booked.</p>
            <input className="hc-input" placeholder="Street address" value={d.address} onChange={(e) => set({ address: e.target.value })} />
            <input className="hc-input" placeholder="Flat, suite, landmark (optional)" value={d.area} onChange={(e) => set({ area: e.target.value })} />
            <div className="hcw-row2">
              <input className="hc-input" placeholder="City" value={d.city} onChange={(e) => set({ city: e.target.value })} />
              <input className="hc-input" placeholder="State / region" value={d.state} onChange={(e) => set({ state: e.target.value })} />
            </div>
            <div className="hcw-row2">
              <input className="hc-input" placeholder="PIN / ZIP" value={d.zipcode} onChange={(e) => set({ zipcode: e.target.value })} />
              <input className="hc-input" placeholder="Country" value={d.country} onChange={(e) => set({ country: e.target.value })} />
            </div>
          </>)}

          {id === 'basics' && (<>
            <h1 className="hcw-h1">Let’s start with the basics</h1>
            <p className="hcw-lead">How many people can stay here?</p>
            <div className="hcw-counters">
              <Counter label="Guests" val={d.guests} on={(n) => set({ guests: n })} min={1} />
              <Counter label="Bedrooms" val={d.bedrooms} on={(n) => set({ bedrooms: n })} />
              <Counter label="Beds" val={d.beds} on={(n) => set({ beds: n })} min={1} />
            </div>
            <button className={`hcw-toggle${d.bedroomLock ? ' on' : ''}`} onClick={() => set({ bedroomLock: !d.bedroomLock })}>
              <div><b>Lock on every bedroom</b><span>Guests can lock the room they sleep in.</span></div><span className="hcw-switch" />
            </button>
          </>)}

          {id === 'bathrooms' && (<>
            <h1 className="hcw-h1">What kind of bathrooms are available?</h1>
            <div className="hcw-counters"><Counter label="Bathrooms" val={d.bathrooms} on={(n) => set({ bathrooms: n })} min={1} /></div>
            <div className="hcw-opts">
              {([['private', 'Private', 'Just for guests'], ['dedicated', 'Dedicated', 'Private, but just outside the room'], ['shared', 'Shared', 'Shared with other people']] as const).map(([k, l, s]) => (
                <button key={k} className={`hcw-opt${d.bathroomKind === k ? ' on' : ''}`} onClick={() => set({ bathroomKind: k })}><div><b>{l}</b><span>{s}</span></div></button>
              ))}
            </div>
          </>)}

          {id === 'whoelse' && (<>
            <h1 className="hcw-h1">Who else might be there?</h1>
            <p className="hcw-lead">Guests need to know whether they’ll encounter other people during their stay.</p>
            <div className="hcw-chips">
              {HOST_WHO_ELSE.map((w) => (
                <button key={w.id} className={`hcw-chip${d.whoElse.includes(w.id) ? ' on' : ''}`} onClick={() => toggle('whoElse', w.id)}>
                  <Icon name={w.icon} size={20} /> {w.label}
                </button>
              ))}
            </div>
          </>)}

          {id === 'amenities' && (<>
            <h1 className="hcw-h1">Tell guests what your place offers</h1>
            {HOST_AMENITY_GROUPS.map((g) => (
              <div className="hcw-amgroup" key={g.category}>
                <h3>{g.category}</h3>
                <div className="hcw-amgrid">
                  {g.items.map((a) => (
                    <button key={a.id} className={`hcw-am${d.amenities.includes(a.id) ? ' on' : ''}`} onClick={() => toggle('amenities', a.id)}>
                      <Icon name={a.icon} size={22} /><span>{a.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </>)}

          {id === 'photos' && (<>
            <h1 className="hcw-h1">Add some photos of your place</h1>
            <p className="hcw-lead">You’ll need at least {MIN_PHOTOS} photos to publish. ({d.images.length}/{MIN_PHOTOS})</p>
            <div className="hcw-photos">
              {d.images.map((src, idx) => (
                <div key={idx} className="hcw-photo"><img src={src} alt="" />{idx === 0 && <span className="hcw-cover">Cover</span>}
                  <button onClick={() => set({ images: d.images.filter((_, k) => k !== idx) })}><Icon name="close" size={13} /></button></div>
              ))}
              {d.images.length < HOST_STOCK_PHOTOS.length && (
                <button className="hcw-photo-add" onClick={() => set({ images: [...d.images, HOST_STOCK_PHOTOS[d.images.length]] })}>
                  <Icon name="plus" size={24} /><span>Add a photo</span>
                </button>
              )}
            </div>
          </>)}

          {id === 'title' && (<>
            <h1 className="hcw-h1">Now, give your place a title</h1>
            <p className="hcw-lead">Short titles work best. Have fun — you can always change it later.</p>
            <textarea className="hcw-bigtext" maxLength={50} value={d.title} onChange={(e) => set({ title: e.target.value })} placeholder="e.g. Sunlit loft near the river" />
            <span className="hcw-count">{d.title.length}/50</span>
          </>)}

          {id === 'highlights' && (<>
            <h1 className="hcw-h1">Next, let’s describe your place</h1>
            <p className="hcw-lead">Choose up to 2 highlights. We’ll use these to get your description started.</p>
            <div className="hcw-chips">
              {HOST_HIGHLIGHTS.map((h) => (
                <button key={h.id} className={`hcw-chip${d.highlights.includes(h.id) ? ' on' : ''}`} onClick={() => toggle('highlights', h.id, 2)}>
                  <Icon name={h.icon} size={18} /> {h.label}
                </button>
              ))}
            </div>
          </>)}

          {id === 'description' && (<>
            <h1 className="hcw-h1">Create your description</h1>
            <p className="hcw-lead">Share what makes your place special.</p>
            <textarea className="hcw-desc" maxLength={500} value={d.description} onChange={(e) => set({ description: e.target.value })} placeholder="You’ll have a great time at this comfortable place to stay." />
            <span className="hcw-count">{d.description.length}/500</span>
          </>)}

          {id === 'booking' && (<>
            <h1 className="hcw-h1">Pick your booking settings</h1>
            <p className="hcw-lead">You can change this at any time.</p>
            <div className="hcw-opts">
              {([['approve5', 'Approve your first 5 bookings', 'Start by reviewing each request, then switch to Instant Book.', 'clipboard'], ['instant', 'Use Instant Book', 'Guests can book automatically — fill your calendar faster.', 'bolt']] as const).map(([k, l, s, ic]) => (
                <button key={k} className={`hcw-opt${d.bookingApproval === k ? ' on' : ''}`} onClick={() => set({ bookingApproval: k })}>
                  <div><b>{l}</b><span>{s}</span></div><Icon name={ic} size={24} />
                </button>
              ))}
            </div>
          </>)}

          {id === 'price' && (<>
            <h1 className="hcw-h1">Now, set a weekday base price</h1>
            <p className="hcw-lead">Tip: price a little lower at first to land your first bookings and reviews.</p>
            <div className="hcw-price"><input type="number" value={d.price} onChange={(e) => set({ price: Math.max(0, Number(e.target.value) || 0) })} /><span>/ night</span></div>
            <div className="hcw-pricebreak">
              <div><span>Base price</span><span>{money(d.price)}</span></div>
              <div><span>StayOn service fee</span><span className="hcw-free">Free</span></div>
              <div className="hcw-earn"><b>You earn</b><b>{money(d.price)}</b></div>
            </div>
            <p className="hcw-fine">StayOn charges no service fee — to guests or to you. The guest pays your price plus taxes, and you keep the full amount.</p>
          </>)}

          {id === 'weekend' && (<>
            <h1 className="hcw-h1">Set a weekend price</h1>
            <p className="hcw-lead">Add a premium for Fridays and Saturdays.</p>
            <div className="hcw-chips center">
              {[0, 5, 10, 15, 20].map((p) => (
                <button key={p} className={`hcw-chip${d.weekendPct === p ? ' on' : ''}`} onClick={() => set({ weekendPct: p })}>{p === 0 ? 'No premium' : `+${p}%`}</button>
              ))}
            </div>
            <div className="hcw-pricebreak">
              <div><span>Weekday price</span><span>{money(d.price)}</span></div>
              <div className="hcw-earn"><b>Weekend price</b><b>{money(Math.round(d.price * (1 + d.weekendPct / 100)))}</b></div>
            </div>
          </>)}

          {id === 'discounts' && (<>
            <h1 className="hcw-h1">Add discounts</h1>
            <p className="hcw-lead">Help your place get booked faster and earn your first reviews.</p>
            <div className="hcw-disc">
              {HOST_DISCOUNTS.map((dc) => (
                <button key={dc.id} className={`hcw-disc-row${d.discounts[dc.id] ? ' on' : ''}`} onClick={() => set({ discounts: { ...d.discounts, [dc.id]: !d.discounts[dc.id] } })}>
                  <span className="hcw-disc-pct">{dc.pct}</span>
                  <div><b>{dc.title}</b><span>{dc.sub}</span></div>
                  <span className="hcw-check"><Icon name="check" size={14} /></span>
                </button>
              ))}
            </div>
          </>)}

          {id === 'safety' && (<>
            <h1 className="hcw-h1">Share safety details</h1>
            <p className="hcw-lead">Let guests know which safety features your place has.</p>
            <div className="hcw-safety">
              {HOST_SAFETY.map((s) => (
                <button key={s.id} className={`hcw-safe${d.safety.includes(s.id) ? ' on' : ''}`} onClick={() => toggle('safety', s.id)}>
                  <Icon name={s.icon} size={20} /><span>{s.label}</span><span className="hcw-check"><Icon name="check" size={13} /></span>
                </button>
              ))}
            </div>
          </>)}

          {id === 'final' && (<>
            <h1 className="hcw-h1">Review your listing</h1>
            <p className="hcw-lead">Here’s a quick look. You can edit anything later.</p>
            <div className="hcw-review">
              <div className="hcw-review-media">
                <img src={d.images[0] || HOST_STOCK_PHOTOS[0]} alt="" />
                {d.bookingApproval === 'instant' && <span className="hcw-review-instant"><Icon name="bolt" size={11} fill /> Instant</span>}
              </div>
              <div className="hcw-review-body">
                <b>{d.title || 'Untitled listing'}</b>
                <span>{[d.city, d.country].filter(Boolean).join(', ') || 'Location'}</span>
                <span>{placeTypeLabel(d.type)} · {d.guests} guests · {d.bedrooms} bd · {d.bathrooms} ba</span>
                <div className="hcw-review-price"><b>{money(d.price)}</b> / night · {d.images.length} photos · {d.amenities.length} amenities</div>
              </div>
            </div>
            <p className="hcw-fine"><Icon name="check" size={13} /> Identity verified · 0% host fee · StayCover included</p>
          </>)}

        </div>
      </div>

      <footer className="hcw-foot">
        <button className="hcw-back" onClick={back}>Back</button>
        <GradientButton disabled={!canNext} onClick={next}>{nextLabel}</GradientButton>
      </footer>
    </main>
  );
}
