import React, { useState } from 'react';
import { useApp, usd } from './store';
import type { Stay } from './data';

/* ───────────────────────── Icons (inline SVG, stroke-based) ───────────────────────── */
const PATHS: Record<string, React.ReactNode> = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /></>,
  heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.6l-1-1a5.5 5.5 0 1 0-7.8 7.8l1 1L12 21l7.8-7.6 1-1a5.5 5.5 0 0 0 0-7.8Z" />,
  star: <path d="m12 2 3 6.5 7 .9-5 4.8 1.3 7L12 18l-6.6 3.2L6.7 14l-5-4.8 7-.9L12 2Z" />,
  pin: <><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" /></>,
  chevL: <path d="m15 18-6-6 6-6" />,
  chevR: <path d="m9 18 6-6-6-6" />,
  close: <path d="M18 6 6 18M6 6l12 12" />,
  check: <path d="M20 6 9 17l-5-5" />,
  lock: <><rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>,
  shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />,
  sparkle: <path d="M12 3v6m0 6v6m9-9h-6M9 12H3m13.5-4.5L14 10m-4 4-2.5 2.5m9 0L14 14m-4-4L7.5 7.5" />,
  cal: <><rect x="3" y="4" width="18" height="18" rx="2" /><path d="M3 10h18M8 2v4M16 2v4" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" /></>,
  arrow: <path d="M5 12h14m-6-6 6 6-6 6" />,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  msg: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />,
  share: <><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" /></>,
  bolt: <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />,
  bell: <><path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.7 21a2 2 0 0 1-3.4 0" /></>,
};

export function Icon({ name, size = 20, fill = false, className, color }: { name: string; size?: number; fill?: boolean; className?: string; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" className={className}
      fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'}
      strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={color ? { color } : undefined} aria-hidden>
      {PATHS[name]}
    </svg>
  );
}

/* ───────────────────────── Brand logo (house + pin, teal gradient) ───────────────────────── */
export function Logo({ onClick }: { onClick?: () => void }) {
  return (
    <button className="brand" onClick={onClick} aria-label="StayOn home">
      <span className="brand-mark">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M4 11 12 4l8 7v8a1 1 0 0 1-1 1h-4v-5h-6v5H5a1 1 0 0 1-1-1Z" fill="#fff" />
          <circle cx="12" cy="10.5" r="2" fill="#0D9488" />
        </svg>
      </span>
      <span className="brand-name">Stay<span className="brand-on">On</span></span>
    </button>
  );
}

/* ───────────────────────── Gradient button ───────────────────────── */
export function GradientButton({ children, onClick, icon, full, disabled, type = 'button' }: {
  children: React.ReactNode; onClick?: () => void; icon?: string; full?: boolean; disabled?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`gbtn${full ? ' full' : ''}`} onClick={onClick} disabled={disabled}>
      {icon && <Icon name={icon} size={18} />}
      {children}
    </button>
  );
}

/* ───────────────────────── Rating ───────────────────────── */
export function Rating({ value, reviews, className }: { value: number; reviews?: number; className?: string }) {
  return (
    <span className={`rating${className ? ' ' + className : ''}`}>
      <Icon name="star" size={13} fill color="#F59E0B" />
      <b>{value.toFixed(2)}</b>
      {reviews != null && <span className="muted"> ({reviews})</span>}
    </span>
  );
}

/* ───────────────────────── Header / navbar ───────────────────────── */
export function Header() {
  const { navigate, user, route } = useApp();
  const [menu, setMenu] = useState(false);
  const tabs: { name: any; label: string; icon: string }[] = [
    { name: 'home', label: 'Stays', icon: '🏠' },
    { name: 'explore', label: 'Explore', icon: '🧭' },
  ];
  return (
    <header className="nav">
      <div className="nav-inner">
        <Logo onClick={() => navigate('home')} />

        <nav className="nav-tabs">
          {tabs.map((t) => (
            <button key={t.name} className={`nav-tab${route.name === t.name ? ' on' : ''}`} onClick={() => navigate(t.name)}>
              <span>{t.icon}</span> {t.label}
            </button>
          ))}
          <button className="nav-tab" onClick={() => navigate('explore', { tab: 'reels' })}>
            <span>🎬</span> Reels <i className="tag-new">NEW</i>
          </button>
        </nav>

        <div className="nav-right">
          <button className="nav-ghost" onClick={() => navigate('explore')}>Become a host</button>
          <button className="nav-globe" aria-label="Language & currency"><Icon name="globe" size={18} /></button>
          <button className="nav-acct" onClick={() => setMenu((m) => !m)}>
            <Icon name="menu" size={16} />
            <span className="nav-av">{user ? user.name[0].toUpperCase() : <Icon name="user" size={16} />}</span>
          </button>
          {menu && (
            <>
              <div className="menu-bg" onClick={() => setMenu(false)} />
              <div className="acct-menu">
                {user ? (
                  <>
                    <div className="acct-hello">Hi, {user.name.split(' ')[0]} 👋</div>
                    <button onClick={() => { setMenu(false); navigate('trips'); }}>My trips</button>
                    <button onClick={() => { setMenu(false); navigate('profile'); }}>Profile</button>
                    <div className="acct-sep" />
                    <LogoutItem onDone={() => setMenu(false)} />
                  </>
                ) : (
                  <>
                    <button className="acct-strong" onClick={() => { setMenu(false); navigate('auth'); }}>Log in</button>
                    <button onClick={() => { setMenu(false); navigate('auth'); }}>Sign up</button>
                    <div className="acct-sep" />
                    <button onClick={() => { setMenu(false); navigate('explore'); }}>Become a host</button>
                    <button onClick={() => { setMenu(false); navigate('home'); }}>Help centre</button>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
function LogoutItem({ onDone }: { onDone: () => void }) {
  const { logout } = useApp();
  return <button className="acct-danger" onClick={() => { logout(); onDone(); }}>Log out</button>;
}

/* ───────────────────────── Stay card ───────────────────────── */
export function StayCard({ stay, wide }: { stay: Stay; wide?: boolean }) {
  const { navigate, favs, toggleFav } = useApp();
  const [idx, setIdx] = useState(0);
  const total = stay.images.length;
  const fav = favs.has(stay.id);
  const go = (e: React.MouseEvent, dir: 1 | -1) => { e.stopPropagation(); setIdx((i) => (i + dir + total) % total); };
  return (
    <article className={`scard${wide ? ' wide' : ''}`} onClick={() => navigate('stay', { id: stay.id })}>
      <div className="scard-media">
        <img src={stay.images[idx]} alt={stay.title} loading="lazy" draggable={false} />
        {stay.guestFavourite && <span className="scard-badge">Guest favourite</span>}
        {!stay.guestFavourite && stay.badge && <span className="scard-badge alt">{stay.badge}</span>}
        <button className={`scard-heart${fav ? ' on' : ''}`} aria-label="Save"
          onClick={(e) => { e.stopPropagation(); toggleFav(stay.id); }}>
          <Icon name="heart" size={18} fill={fav} />
        </button>
        {total > 1 && (
          <>
            <button className="scard-nav prev" onClick={(e) => go(e, -1)} aria-label="Previous"><Icon name="chevL" size={16} /></button>
            <button className="scard-nav next" onClick={(e) => go(e, 1)} aria-label="Next"><Icon name="chevR" size={16} /></button>
            <div className="scard-dots">{stay.images.map((_, i) => <span key={i} className={i === idx ? 'on' : ''} />)}</div>
          </>
        )}
        {stay.instantBook && <span className="scard-instant"><Icon name="bolt" size={12} fill /> Instant</span>}
      </div>
      <div className="scard-body">
        <div className="scard-line">
          <span className="scard-title">{stay.title}</span>
          <Rating value={stay.rating} />
        </div>
        <div className="scard-loc">{stay.location}</div>
        <div className="scard-price"><b>{usd(stay.price)}</b> <span className="muted">night</span></div>
      </div>
    </article>
  );
}

/* ───────────────────────── Section header (icon badge + title + action) ───────────────────────── */
export function SectionHeader({ icon, title, subtitle, action, onAction }: {
  icon?: string; title: string; subtitle?: string; action?: string; onAction?: () => void;
}) {
  return (
    <div className="shead">
      <div className="shead-left">
        {icon && <span className="shead-ico">{icon}</span>}
        <div>
          <h2>{title}</h2>
          {subtitle && <p>{subtitle}</p>}
        </div>
      </div>
      {action && <button className="shead-action" onClick={onAction}>{action} <Icon name="chevR" size={15} /></button>}
    </div>
  );
}

/* ───────────────────────── Toast ───────────────────────── */
export function Toast() {
  const { toast } = useApp();
  if (!toast) return null;
  return <div className="toast"><Icon name="check" size={16} /> {toast}</div>;
}

/* ───────────────────────── Footer ───────────────────────── */
export function Footer() {
  const { navigate } = useApp();
  const cols = [
    { h: 'Support', links: ['Help centre', 'Safety information', 'Cancellation options', 'Report a concern'] },
    { h: 'Hosting', links: ['StayOn your home', 'Host resources', 'Community forum', 'Hosting responsibly'] },
    { h: 'StayOn', links: ['Newsroom', 'New features', 'Careers', 'Investors'] },
  ];
  return (
    <footer className="footer">
      <div className="footer-grid">
        {cols.map((c) => (
          <div key={c.h} className="footer-col">
            <div className="footer-h">{c.h}</div>
            {c.links.map((l) => <a key={l} href="#" onClick={(e) => e.preventDefault()}>{l}</a>)}
          </div>
        ))}
        <div className="footer-col footer-brandcol">
          <Logo onClick={() => navigate('home')} />
          <p className="footer-tag">Stay beyond ordinary.</p>
          <div className="footer-socials"><span>📷</span><span>🐦</span><span>📘</span></div>
        </div>
      </div>
      <div className="footer-bar">
        <span>© 2026 StayOn, Inc.</span>
        <span>Privacy · Terms · Sitemap</span>
      </div>
    </footer>
  );
}
