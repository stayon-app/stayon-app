import React from 'react';
import { useApp } from './store';
import { Icon, GradientButton, StayCard } from './ui';
import { STAYS } from './data';

/* ───────────────────────── Trips ───────────────────────── */
export function TripsScreen() {
  const { bookings, navigate, user, money } = useApp();
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <main className="wrap page">
      <h1 className="page-title">Trips</h1>
      {!user && <p className="muted page-sub">Log in to keep your trips across devices.</p>}
      {bookings.length === 0 ? (
        <div className="empty">
          <div className="empty-ico"><Icon name="briefcase" size={42} /></div>
          <h3>No trips yet</h3>
          <p>Time to dust off your bags and start planning your next adventure.</p>
          <GradientButton onClick={() => navigate('explore')}>Start exploring</GradientButton>
        </div>
      ) : (
        <div className="trips-list">
          {bookings.map((b) => (
            <article className="trip-card" key={b.code} onClick={() => navigate('stay', { id: b.stay.id })}>
              <img src={b.stay.images[0]} alt={b.stay.title} />
              <div className="trip-info">
                <div className="trip-row">
                  <b>{b.stay.title}</b>
                  <span className={`trip-status ${b.instant ? 'ok' : 'warn'}`}>{b.instant ? 'Confirmed' : 'Pending'}</span>
                </div>
                <div className="muted"><Icon name="pin" size={13} /> {b.stay.location}</div>
                <div className="muted">{fmt(b.checkIn)} – {fmt(b.checkOut)} · {b.nights} nights · {b.guests} guests</div>
                <div className="trip-foot"><span className="muted">{b.code}</span><b>{money(b.total)}</b></div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}

/* ───────────────────────── Profile ───────────────────────── */
export function ProfileScreen() {
  const { user, navigate, logout, favs, bookings, showToast } = useApp();
  const saved = STAYS.filter((s) => favs.has(s.id));

  if (!user) {
    return (
      <main className="wrap page">
        <div className="profile-guest">
          <div className="profile-guest-hero">
            <h1>Welcome to StayOn</h1>
            <p>Log in to plan trips, save favourites and unlock member perks.</p>
            <GradientButton onClick={() => navigate('auth')}>Log in or sign up</GradientButton>
          </div>
          <div className="perks">
            {[['briefcase', 'Your trips', 'Plan & track every stay'], ['heart', 'Wishlists', 'Save places you love'], ['msg', 'Messages', 'Chat with your hosts'], ['gift', '15% off', 'Your first booking']].map(([i, t, d]) => (
              <div className="perk" key={t}><span className="perk-ico"><Icon name={i} size={24} /></span><b>{t}</b><small>{d}</small></div>
            ))}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="wrap page">
      <div className="profile-head">
        <div className="profile-av">{user.name[0].toUpperCase()}</div>
        <div>
          <h1>{user.name}</h1>
          <div className="verified"><Icon name="star" size={14} fill color="#F59E0B" /> Gold member · {bookings.length} trips</div>
        </div>
      </div>

      <div className="profile-stats">
        <div><b>{bookings.length}</b><span>Trips</span></div>
        <div><b>{saved.length}</b><span>Saved</span></div>
        <div><b>{bookings.reduce((a, b) => a + Math.round(b.subtotal / b.nights), 0)}</b><span>StayCoins</span></div>
      </div>

      <div className="profile-menu">
        {[['briefcase', 'My trips', () => navigate('trips')], ['heart', 'Wishlist', () => document.getElementById('wishlist')?.scrollIntoView({ behavior: 'smooth' })], ['card', 'Payments & payouts', () => showToast('Payments & payouts — coming soon')], ['bell', 'Notifications', () => showToast('Notification settings — coming soon')], ['globe', 'Language & currency', () => showToast('Currently showing USD · more soon')], ['grid', 'Switch to hosting', () => navigate('host-today')], ['buoy', 'Help centre', () => showToast('Help centre — coming soon')]].map(([i, t, fn]: any) => (
          <button key={t} className="profile-row" onClick={fn}><span className="profile-row-ico"><Icon name={i} size={20} /></span> {t} <Icon name="chevR" size={16} /></button>
        ))}
      </div>

      {saved.length > 0 && (
        <section className="block" id="wishlist">
          <h2 className="stay-h2">Your wishlist</h2>
          <div className="grid">{saved.map((s) => <StayCard key={s.id} stay={s} />)}</div>
        </section>
      )}

      <button className="btn-outline logout-btn" onClick={logout}>Log out</button>
    </main>
  );
}
