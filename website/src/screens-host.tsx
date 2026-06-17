import React, { useState } from 'react';
import { useApp } from './store';
import { Icon, GradientButton, Logo } from './ui';
import { RESERVATIONS, PLACE_TYPES, HOST_AMENITIES, AMENITY_ICON, type Reservation, type HostListing } from './data';

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
  const { hostListings, navigate, showToast, money } = useApp();
  return (
    <main className="hwrap">
      <div className="h-pagehead"><h1>Your listings</h1><GradientButton icon="plus" onClick={() => navigate('host-create')}>Create</GradientButton></div>
      <div className="h-listings">
        {hostListings.map((l) => (
          <article className="h-listing" key={l.id} onClick={() => showToast('Listing editor coming soon')}>
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

/* ───────────────────────── Create listing wizard ───────────────────────── */
const u2 = (id: string) => `https://images.unsplash.com/${id}?w=900&q=80&auto=format&fit=crop`;

export function HostCreate() {
  const { navigate, addHostListing, showToast, money } = useApp();
  const [step, setStep] = useState(0);
  const [type, setType] = useState('');
  const [guests, setGuests] = useState(2);
  const [bedrooms, setBedrooms] = useState(1);
  const [beds, setBeds] = useState(1);
  const [baths, setBaths] = useState(1);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [amenities, setAmenities] = useState<Set<string>>(new Set());
  const [photos, setPhotos] = useState(0);
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState(120);

  const STEPS = ['Type', 'Basics', 'Location', 'Amenities', 'Photos', 'Title', 'Price'];
  const phase = step < 3 ? 0 : step < 5 ? 1 : 2;

  const canNext = [
    !!type, true, !!city.trim() && !!country.trim(), amenities.size > 0, photos >= 6, title.trim().length >= 6, price > 0,
  ][step];

  const publish = () => {
    addHostListing({
      id: 'new-' + Date.now(), title: title || 'New listing', type: type || 'Home', city, country, status: 'Published',
      price, weekend: Math.round(price * 1.15), cleaning: 20, rating: 0, reviews: 0,
      guests, bedrooms, beds, baths, instant: true, image: u2('photo-1505693416388-ac5ce068fe85'), occupancy: 0,
    });
    showToast('🎉 Listing published!');
    navigate('host-listings');
  };

  const Counter = ({ label, val, set, min = 0 }: { label: string; val: number; set: (n: number) => void; min?: number }) => (
    <div className="hc-counter"><span>{label}</span><div className="stepper">
      <button onClick={() => set(Math.max(min, val - 1))} disabled={val <= min}><Icon name="minus" size={16} /></button>
      <span>{val}</span><button onClick={() => set(val + 1)}><Icon name="plus" size={16} /></button>
    </div></div>
  );

  return (
    <main className="hwrap hc">
      <div className="hc-head">
        <button className="back" onClick={() => step > 0 ? setStep(step - 1) : navigate('host-listings')}><Icon name={step > 0 ? 'chevL' : 'close'} size={18} /> {step > 0 ? 'Back' : 'Exit'}</button>
        <div className="hc-phases">{[0, 1, 2].map((p) => <span key={p} className={p <= phase ? 'on' : ''} />)}</div>
      </div>

      <div className="hc-body">
        <span className="hc-step">Step {step + 1} of {STEPS.length} · {STEPS[step]}</span>

        {step === 0 && (<><h1>Which best describes your place?</h1>
          <div className="hc-types">{PLACE_TYPES.map((t) => <button key={t} className={`hc-type${type === t ? ' on' : ''}`} onClick={() => setType(t)}><Icon name={t === 'Villa' ? 'home' : t === 'Apartment' ? 'building' : t === 'Cabin' ? 'tree' : t === 'Boat' ? 'waves' : 'home'} size={22} />{t}</button>)}</div></>)}

        {step === 1 && (<><h1>Share some basics about your place</h1>
          <div className="hc-counters">
            <Counter label="Guests" val={guests} set={setGuests} min={1} />
            <Counter label="Bedrooms" val={bedrooms} set={setBedrooms} />
            <Counter label="Beds" val={beds} set={setBeds} min={1} />
            <Counter label="Bathrooms" val={baths} set={setBaths} min={1} />
          </div></>)}

        {step === 2 && (<><h1>Where's your place located?</h1>
          <p className="hc-note">Your address is only shared with guests after they've booked.</p>
          <input className="hc-input" placeholder="City" value={city} onChange={(e) => setCity(e.target.value)} />
          <input className="hc-input" placeholder="Country" value={country} onChange={(e) => setCountry(e.target.value)} /></>)}

        {step === 3 && (<><h1>Tell guests what your place has to offer</h1>
          <div className="hc-amenities">{HOST_AMENITIES.map((a) => (
            <button key={a} className={`hc-amenity${amenities.has(a) ? ' on' : ''}`} onClick={() => setAmenities((s) => { const n = new Set(s); n.has(a) ? n.delete(a) : n.add(a); return n; })}>
              <Icon name={AMENITY_ICON[a] || 'check'} size={20} /> {a}
            </button>))}</div></>)}

        {step === 4 && (<><h1>Add some photos of your place</h1>
          <p className="hc-note">You'll need at least 6 photos to publish. ({photos}/6 added)</p>
          <button className="hc-photo-add" onClick={() => setPhotos((p) => p + 1)}><Icon name="camera" size={22} /> Add photos from your device</button>
          <div className="hc-photos">{Array.from({ length: photos }).map((_, i) => <div key={i} className="hc-photo"><img src={u2('photo-1505693416388-ac5ce068fe85')} alt="" />{i === 0 && <span>Cover</span>}<button onClick={() => setPhotos((p) => p - 1)}><Icon name="close" size={12} /></button></div>)}</div></>)}

        {step === 5 && (<><h1>Now, give your place a title</h1>
          <p className="hc-note">Short titles work best. Have fun — you can always change it later.</p>
          <input className="hc-input" maxLength={50} placeholder="e.g. Sunlit loft near the river" value={title} onChange={(e) => setTitle(e.target.value)} />
          <span className="muted">{title.length}/50</span></>)}

        {step === 6 && (<><h1>Now, set your weekday price</h1>
          <p className="hc-note">Tip: price a little lower at first to land your first bookings and reviews.</p>
          <div className="hc-price"><span>$</span><input type="number" value={price} onChange={(e) => setPrice(Number(e.target.value) || 0)} /></div>
          <div className="hc-price-break">
            <div><span>Base price</span><span>{money(price)}</span></div>
            <div><span>StayOn service fee</span><span className="hc-free">Free</span></div>
            <div className="hc-price-earn"><b>You earn</b><b>{money(price)}</b></div>
          </div>
          <p className="hc-note">StayOn charges no service fee — to guests or to you. The guest pays your price plus taxes, and you keep the full amount.</p></>)}
      </div>

      <div className="hc-foot">
        {step < STEPS.length - 1
          ? <GradientButton disabled={!canNext} onClick={() => setStep(step + 1)}>Next</GradientButton>
          : <GradientButton disabled={!canNext} icon="check" onClick={publish}>Publish</GradientButton>}
      </div>
    </main>
  );
}
