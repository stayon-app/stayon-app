'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { usePrefs } from '@/components/PrefsProvider';
import { CreateListingForm } from '@/components/CreateListingForm';
<<<<<<< Updated upstream
import { Price } from '@/components/Price';
import { Reveal } from '@/components/Reveal';
import { TiltCard } from '@/components/TiltCard';
import { Accordion } from '@/components/Accordion';
import { HostEarnings } from '@/components/HostEarnings';
import { RotatingBg } from '@/components/RotatingBg';
import { WizIcon } from '@/components/WizIcon';
import { ensureStayonSession, host } from '@/lib/stayonClient';

// Cycling backdrop photos for the host hero (decorative, dynamic).
const HOST_HERO_BG = [
  'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1570214476695-19bd467e6f7a?w=1600&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=1600&q=80&auto=format&fit=crop',
];

const HOST_FEATURES = [
  { icon: 'home', title: "It's easy", body: 'Create a listing in a few steps — add photos, set your price, publish. We guide you the whole way.' },
  { icon: 'cash', title: "It's worth it", body: 'Getting started is free, and StayOn takes 0% commission. Every bit your guests pay is yours.' },
  { icon: 'shield', title: "You're protected", body: 'Verified guests, secure on-platform payments, and StayCover damage protection on every booking.' },
];

const HOST_EARNINGS = [
  { tag: 'Villa', place: 'Goa, India', usd: 250, note: '~18 nights booked / month', img: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80&auto=format&fit=crop' },
  { tag: 'Beach villa', place: 'Malibu, USA', usd: 420, note: 'Superhost · 4.96 ★', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80&auto=format&fit=crop' },
  { tag: 'Cave suite', place: 'Santorini, GR', usd: 410, note: 'Booked solid all summer', img: 'https://images.unsplash.com/photo-1570214476695-19bd467e6f7a?w=600&q=80&auto=format&fit=crop' },
  { tag: 'Loft', place: 'New York, USA', usd: 310, note: 'Instant Book · quick payouts', img: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=600&q=80&auto=format&fit=crop' },
];

const HOST_FAQ = [
  { q: 'Does StayOn take a commission?', a: 'No. StayOn charges no service fee — to guests or to you. The guest pays exactly your price plus taxes, and you keep the full amount. 0% platform fee, always.' },
  { q: 'How are guests verified?', a: 'Every guest signs in with a verified phone number, and identity checks run before booking — so you know who is arriving before you accept a reservation.' },
  { q: 'When do I get paid?', a: 'Payouts go directly to you, about 24 hours after check-in — there is no middleman skimming the top. You control your price, calendar and approval settings.' },
  { q: 'Can I choose approve-first or instant book?', a: "Yes. Turn on Instant Book to accept reservations automatically, or review and approve each request yourself — it's your call." },
  { q: 'What if a guest cancels?', a: 'You set your own cancellation policy per listing, so refund terms are always in your control.' },
];

const HOST_PRICE_CONTROL = [
  { icon: 'cash', title: 'You set the nightly price', line: 'High or low — your call, any day.' },
  { icon: 'calendar', title: 'Weekend & seasonal rates', line: 'Charge what your dates are worth.' },
  { icon: 'tag', title: 'Your own discounts', line: 'Weekly, monthly — you decide.' },
  { icon: 'lock', title: 'Block any dates', line: 'Your calendar, always in your control.' },
];

const HOST_FAQ_CARDS = [
  { q: 'Is my place right for StayOn?', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80&auto=format&fit=crop' },
  { q: 'How does hosting work?', img: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=600&q=80&auto=format&fit=crop' },
  { q: 'How do I get started?', img: 'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=600&q=80&auto=format&fit=crop' },
=======
import { Reveal } from '@/components/Reveal';
import { TiltCard } from '@/components/TiltCard';
import { Accordion } from '@/components/Accordion';
import { ensureStayonSession, host } from '@/lib/stayonClient';

const FAQ = [
  {
    q: 'Does StayOn take a commission?',
    a: 'No. StayOn charges no service fee — to guests or to you. The guest pays exactly your price plus taxes, and you keep the full amount. 0% platform fee, always.',
  },
  {
    q: 'How are guests verified?',
    a: 'Every guest signs in with a verified phone number, and identity checks run before booking — so you know who is arriving before you accept a reservation.',
  },
  {
    q: 'When do I get paid?',
    a: 'Payouts go directly to you — there is no middleman skimming the top. You control your price, your calendar, and your booking-approval settings.',
  },
  {
    q: 'Can I choose approve-first or instant book?',
    a: "Yes. Turn on Instant Book to accept reservations automatically, or review and approve each request yourself — it's your call.",
  },
  {
    q: 'What if a guest cancels?',
    a: 'You set your own cancellation policy per listing, so refund terms are always in your control.',
  },
>>>>>>> Stashed changes
];

export default function HostPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const openSignIn = () => router.push('/sign-up');
  const { format, t } = usePrefs();

  const [listings, setListings] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');
  const [acting, setActing] = useState<string>('');

  const load = useCallback(async () => {
    const ok = await ensureStayonSession(() => getToken());
    if (!ok) {
      setError('Could not start your session.');
      setLoading(false);
      return;
    }
    try {
      const [l, r] = await Promise.all([host.myListings(), host.reservations()]);
      setListings(l.items || []);
      setReservations(r.items || []);
    } catch {
      setError('Could not load your host data.');
    } finally {
      setLoading(false);
    }
  }, [getToken]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setLoading(false);
      return;
    }
    load();
  }, [isLoaded, isSignedIn, load]);

  const act = async (id: string, action: 'accept' | 'decline' | 'checkin' | 'checkout') => {
    setActing(id + action);
    try {
      await host.reservationAction(id, action);
      await load();
    } catch {
      setError('Action failed. Try again.');
    } finally {
      setActing('');
    }
  };

<<<<<<< Updated upstream
  // ── Signed-out: the full "become a host" landing ─────────
  if (!isLoaded || !isSignedIn) {
    return (
      <>
        {/* Hero */}
        <section className="host-hero">
          <RotatingBg images={HOST_HERO_BG} interval={6000} className="host-hero-bg" />
          <div className="container">
            <Reveal className="reveal-left">
              <div className="hero-copy">
                <span className="hero-eyebrow"><WizIcon name="sparkles" size={14} /> {t('Hosting on StayOn')}</span>
                <h1>Your place could be <span className="accent">{t('earning.')}</span></h1>
                <p className="lede">
                  You&apos;re not just a host — you&apos;re the owner of a hospitality business.
                  Most platforms take 3–15% of every booking; StayOn takes <b>nothing</b>.
                  Your property, your price, your brand — and 100% of what your guests pay.
                </p>
                <div className="host-cta">
                  <button className="btn btn-primary btn-lg" onClick={() => openSignIn()} disabled={!isLoaded}>
                    {t("Get started — it's free")}
                  </button>
                  <Link href="/search" className="btn btn-ghost" style={{ color: '#fff', borderColor: 'rgba(255,255,255,0.24)' }}>
                    {t('Browse stays')}
                  </Link>
                </div>
              </div>
            </Reveal>
            <Reveal className="reveal-right" delay={120}>
            <div className="host-hero-visual">
              <TiltCard className="host-hero-card float-el" maxTilt={4}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80&auto=format&fit=crop" alt="Sunlit loft" />
                <div className="hhc-price"><Price usd={110} /> / night</div>
=======
  // ── Signed-out: the full "become a host" landing page ───
  if (!isLoaded || !isSignedIn) {
    return (
      <>
        <section className="hero host-hero">
          <div className="hero-blob hero-blob-a" />
          <div className="hero-blob hero-blob-b" />
          <div className="container">
            <h1>Host on StayOn. <span className="accent">Keep 100%.</span></h1>
            <p className="lede">
              Most platforms take 3–15% of every booking. StayOn takes <b>nothing</b>. List your
              place, set your price, and every rupee your guests pay is yours.
            </p>
            <div className="host-cta">
              <button className="btn btn-primary" onClick={() => openSignIn()} disabled={!isLoaded}>
                Log in to start hosting
              </button>
              <Link href="/search" className="btn btn-ghost">Browse stays</Link>
            </div>
            <div className="host-hero-visual">
              <TiltCard className="host-hero-card float-el">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=600&q=80&auto=format&fit=crop" alt="Sunlit loft by the beach, Goa" />
                <div className="hhc-price">$110 / night</div>
>>>>>>> Stashed changes
                <div className="hhc-sub">Goa, India · 0% fee</div>
              </TiltCard>
              <TiltCard className="host-hero-card" maxTilt={4}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
<<<<<<< Updated upstream
                <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80&auto=format&fit=crop" alt="Palm garden villa" />
                <div className="hhc-price"><Price usd={238} /> / night</div>
=======
                <img src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80&auto=format&fit=crop" alt="Palm garden villa, Bali" />
                <div className="hhc-price">$240 / night</div>
>>>>>>> Stashed changes
                <div className="hhc-sub">Bali, Indonesia · 0% fee</div>
              </TiltCard>
              <div className="hero-float-badge float-el">
                <span className="hfb-icon">✓</span>
                <div>
<<<<<<< Updated upstream
                  <b>{t('Guests verified')}</b>
                  <span>{t('Phone + ID checked before booking')}</span>
                </div>
              </div>
            </div>
            </Reveal>
          </div>
        </section>

        {/* Owner facts strip — business credentials, all true product facts */}
        <div className="host-stats">
          <div className="container host-stats-row">
            {([
              ['cash', '0% commission', 'Every booking is 100% yours'],
              ['clock', 'Payouts in ~24h', 'Direct after check-in, no middleman'],
              ['verified', 'Verified guests', 'Phone + ID checked before booking'],
              ['map', 'Global storefront', '20 currencies, guests worldwide'],
            ] as const).map(([ic, kpi, sub], i) => (
              <Reveal key={kpi} delay={i * 70} className={i < 2 ? 'reveal-left' : 'reveal-right'}>
                <div className="host-stat">
                  <WizIcon name={ic} size={22} />
                  <div><b>{kpi}</b><span>{sub}</span></div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>

        {/* Interactive earnings estimator */}
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head center">
                <h2>{t('See what your place could earn')}</h2>
                <p>Drag the slider to estimate your monthly earnings — you set the price, you keep 100%.</p>
              </div>
            </Reveal>
            <HostEarnings />
          </div>
        </section>

        {/* 3-up feature row */}
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head center">
                <h2>{t('Join hosts earning on StayOn')}</h2>
                <p>Free to list, simple to manage, and you keep the full amount.</p>
              </div>
            </Reveal>
            <div className="feature-3up">
              {HOST_FEATURES.map((f, i) => (
                <Reveal key={f.title} delay={i * 90} className={['reveal-left', 'reveal-scale', 'reveal-right'][i] || 'reveal-scale'}>
                  <div className="feature-card">
                    <div className="feature-icon"><WizIcon name={f.icon} size={26} /></div>
                    <h3>{t(f.title)}</h3>
                    <p>{t(f.body)}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Phone mockup showcase */}
        <section className="section section-alt">
          <div className="container">
            <Reveal>
              <div className="section-head center">
                <h2>{t('Your place looks great on StayOn')}</h2>
                <p>Guests browse listings just like this — clean, fast and fee-free.</p>
              </div>
            </Reveal>
            <div className="phone-showcase">
              <Reveal className="reveal-left">
=======
                  <b>Guests verified</b>
                  <span>Phone + ID checked before booking</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Host with peace of mind</h2>
              </div>
            </Reveal>
            <div className="trust-pillars">
              {[
                { icon: '🛡️', title: 'Damage protection', body: 'Coverage for your place while it hosts StayOn guests.' },
                { icon: '✓', title: 'Verified guests', body: 'Phone and identity checks run before anyone can book.' },
                { icon: '🔒', title: 'Secure payments', body: 'Every booking is paid on-platform — no cash, no chasing.' },
                { icon: '🕑', title: '24/7 support', body: 'Real help whenever a stay needs a hand.' },
              ].map((p, i) => (
                <Reveal key={p.title} delay={i * 80}>
                  <TiltCard className="trust-pillar" maxTilt={3}>
                    <div className="trust-pillar-icon">{p.icon}</div>
                    <h3>{p.title}</h3>
                    <p>{p.body}</p>
                  </TiltCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="host-showcase">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=1600&q=80&auto=format&fit=crop"
                  alt=""
                />
                <div className="host-showcase-content">
                  <h2>Your place, your rules — fully protected</h2>
                  <p>
                    Set your own price, approve every booking or turn on Instant Book, and host
                    knowing StayOn Cover has your place backed. No commission ever cuts into what
                    your guests pay you.
                  </p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head" style={{ flexDirection: 'column', textAlign: 'center', gap: 6 }}>
                <h2>Your place looks great on StayOn</h2>
                <span className="muted">Guests browse listings just like this — clean, fast, and fee-free.</span>
              </div>
            </Reveal>
            <div className="phone-showcase">
              <Reveal>
>>>>>>> Stashed changes
                <div className="phone-frame">
                  <div className="phone-screen">
                    <div className="phone-screen-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=500&q=80&auto=format&fit=crop" alt="Sunlit loft interior" />
                      <span className="phone-screen-badge">★ 4.92 · Guest favourite</span>
                    </div>
                    <div className="phone-screen-body">
                      <h4>Sunlit Loft in the City</h4>
                      <div className="ps-place">Hyderabad, India</div>
<<<<<<< Updated upstream
                      <div className="ps-price"><Price usd={110} /> <span>/ night</span></div>
=======
                      <div className="ps-price">$110 <span>/ night</span></div>
>>>>>>> Stashed changes
                    </div>
                  </div>
                </div>
              </Reveal>
<<<<<<< Updated upstream
              <Reveal className="reveal-right" delay={120}>
=======
              <Reveal delay={120}>
>>>>>>> Stashed changes
                <div className="phone-frame">
                  <div className="phone-screen">
                    <div className="phone-screen-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=500&q=80&auto=format&fit=crop" alt="Palm garden villa" />
<<<<<<< Updated upstream
                      <span className="phone-screen-badge"><WizIcon name="flash" size={13} /> Instant Book</span>
=======
                      <span className="phone-screen-badge">⚡ Instant Book</span>
>>>>>>> Stashed changes
                    </div>
                    <div className="phone-screen-body">
                      <h4>Palm Garden Villa</h4>
                      <div className="ps-place">Bali, Indonesia</div>
<<<<<<< Updated upstream
                      <div className="ps-price"><Price usd={240} /> <span>/ night</span></div>
=======
                      <div className="ps-price">$240 <span>/ night</span></div>
>>>>>>> Stashed changes
                    </div>
                  </div>
                </div>
              </Reveal>
            </div>
          </div>
        </section>

<<<<<<< Updated upstream
        {/* Earnings row */}
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head center">
                <h2>{t('Homes like yours are earning')}</h2>
                <p>Illustrative nightly rates on StayOn — fee-free, so the full amount is yours.</p>
              </div>
            </Reveal>
            <div className="earn-row">
              {HOST_EARNINGS.map((e, i) => (
                <Reveal key={e.place} delay={i * 70} className={i % 2 === 0 ? 'reveal-left' : 'reveal-right'}>
                  <div className="earn-card">
                    <div className="earn-card-photo">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={e.img} alt={e.place} loading="lazy" />
                      <span className="earn-card-tag">{e.tag}</span>
                    </div>
                    <div className="earn-card-body">
                      <div className="ec-place"><WizIcon name="location" size={14} /> {e.place}</div>
                      <div className="ec-amount"><Price usd={e.usd} /> <span>/ night</span></div>
                      <div className="ec-sub">{e.note}</div>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* You set the price — it's all yours (custom pricing control) */}
        <section className="section section-alt">
          <div className="container">
            <Reveal>
              <div className="section-head center">
                <h2>{t("You set the price. It's all yours.")}</h2>
                <p>Your property, your rules. Choose exactly what guests pay — StayOn adds nothing on top and takes nothing out.</p>
              </div>
            </Reveal>
            <div className="price-control">
              {HOST_PRICE_CONTROL.map((c, i) => (
                <Reveal key={c.title} delay={i * 70}>
                  <div className="pc-min">
                    <span className="pc-min-ic"><WizIcon name={c.icon} size={22} /></span>
                    <h3>{t(c.title)}</h3>
                    <p>{t(c.line)}</p>
=======
        <section className="section section-alt">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>It&apos;s easy to get started</h2>
              </div>
            </Reveal>
            <div className="host-points">
              {[
                { num: '1', title: 'Create your listing', body: 'Add photos, set your price, and describe your place — takes minutes.' },
                { num: '2', title: 'Get verified guests', body: 'Ops reviews new listings; guests are identity-checked before booking.' },
                { num: '3', title: 'Start earning', body: 'Accept bookings your way — approve each one or turn on Instant Book.' },
              ].map((s, i) => (
                <Reveal key={s.num} delay={i * 100}>
                  <div className="host-point">
                    <span className="host-num">{s.num}</span>
                    <h3>{s.title}</h3>
                    <p>{s.body}</p>
>>>>>>> Stashed changes
                  </div>
                </Reveal>
              ))}
            </div>
<<<<<<< Updated upstream
            <Reveal delay={120}>
              <div className="pc-banner">
                <b>{t('Every bit your guests pay is yours.')}</b>
                <span>Set it, change it anytime, keep 100% — no commission, no service fee, ever.</span>
              </div>
            </Reveal>
          </div>
        </section>

        {/* FAQ */}
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head"><h2>{t('Your questions, answered')}</h2></div>
            </Reveal>
            <div className="faq-cards">
              {HOST_FAQ_CARDS.map((c, i) => (
                <Reveal key={c.q} delay={i * 70}>
                  <button className="faq-photo-card" onClick={() => openSignIn()} style={{ textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%' }}>
                    <div className="fpc-img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={c.img} alt="" loading="lazy" />
                    </div>
                    <h4>{c.q}</h4>
                  </button>
                </Reveal>
              ))}
            </div>
            <div className="faq-split">
              <Reveal className="reveal-left">
                <div className="faq-media">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=80&auto=format&fit=crop" alt="A bright, welcoming home" loading="lazy" />
                  <div className="faq-media-card">
                    <span className="faq-media-eyebrow">Superhost support</span>
                    <p>Real people, 24/7 — from your first listing to your hundredth booking.</p>
                  </div>
                </div>
              </Reveal>
              <Reveal delay={80} className="reveal-right">
                <Accordion items={HOST_FAQ} />
              </Reveal>
=======
          </div>
        </section>

        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>You control everything</h2>
                <span className="muted">Your price, your calendar, your rules</span>
              </div>
            </Reveal>
            <div className="earn-stats">
              <div className="earn-stat"><b>0%</b><span>Platform fee, always</span></div>
              <div className="earn-stat"><b>100%</b><span>Of every booking is yours</span></div>
              <div className="earn-stat"><b>24/7</b><span>Support for hosts</span></div>
>>>>>>> Stashed changes
            </div>
          </div>
        </section>

<<<<<<< Updated upstream
        {/* CTA band */}
=======
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="section-head">
                <h2>Questions, answered</h2>
              </div>
            </Reveal>
            <Accordion items={FAQ} />
          </div>
        </section>

>>>>>>> Stashed changes
        <section className="section">
          <div className="container">
            <Reveal>
              <div className="cta-band">
<<<<<<< Updated upstream
                <h2>{t('Start earning with StayOn')}</h2>
                <p>No commission, no catch — list your place today and keep 100%.</p>
                <button className="btn btn-primary btn-lg" onClick={() => openSignIn()} disabled={!isLoaded}>
                  Get started — it&apos;s free
=======
                <h2>Start earning with StayOn</h2>
                <p>No commission, no catch — list your place today.</p>
                <button className="btn btn-primary" onClick={() => openSignIn()} disabled={!isLoaded}>
                  Log in to start hosting
>>>>>>> Stashed changes
                </button>
              </div>
            </Reveal>
          </div>
        </section>
      </>
    );
  }

  // ── Signed-in: the dashboard ─────────────────────────────
  const pendingCount = reservations.filter((r) => r.status === 'pending').length;
  const avgPriceUSD = listings.length
    ? listings.reduce((sum, l) => sum + (l.priceUSD || 0), 0) / listings.length
    : 0;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head">
          <h2>Host dashboard</h2>
          {!creating && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>+ New listing</button>
          )}
        </div>

        {error && <p className="modal-error">{error}</p>}

        {!loading && (listings.length > 0 || reservations.length > 0) && (
          <div className="earn-stats" style={{ marginBottom: 32 }}>
            <div className="earn-stat"><b>{listings.length}</b><span>Listings</span></div>
            <div className="earn-stat"><b>{reservations.length}</b><span>Reservations</span></div>
            <div className="earn-stat"><b>{pendingCount}</b><span>Awaiting your response</span></div>
            {avgPriceUSD > 0 && (
              <div className="earn-stat"><b>{format(avgPriceUSD)}</b><span>Avg nightly rate</span></div>
            )}
          </div>
        )}

        {creating && (
          <CreateListingForm
            onCancel={() => setCreating(false)}
            onCreated={() => { setCreating(false); setLoading(true); load(); }}
          />
        )}

        {loading ? (
          <p className="muted">Loading…</p>
        ) : (
          <>
            {/* Reservations */}
            <h3 className="host-h3">Reservations</h3>
            {reservations.length === 0 ? (
              <p className="muted" style={{ marginBottom: 28 }}>No reservations yet.</p>
            ) : (
              <div className="trips-list" style={{ marginBottom: 32 }}>
                {reservations.map((r) => (
                  <div key={r.id} className="trip-card">
                    <div className="trip-main">
                      <span className={`trip-status trip-${r.status}`}>{r.status}</span>
                      <h3>{r.listingTitle}</h3>
                      <p className="trip-dates">{r.guestName} · {r.checkIn} → {r.checkOut} · {r.nights} nights</p>
                      <p className="trip-code">Code {r.code}</p>
                    </div>
                    <div className="host-actions-cell">
                      {r.status === 'pending' && (
                        <>
                          <button className="btn btn-primary hf-sm" disabled={acting === r.id + 'accept'} onClick={() => act(r.id, 'accept')}>Accept</button>
                          <button className="btn btn-ghost hf-sm" disabled={acting === r.id + 'decline'} onClick={() => act(r.id, 'decline')}>Decline</button>
                        </>
                      )}
                      {r.status === 'confirmed' && (
                        <button className="btn btn-ghost hf-sm" disabled={acting === r.id + 'checkout'} onClick={() => act(r.id, 'checkout')}>Check out</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Listings */}
            <h3 className="host-h3">Your listings ({listings.length})</h3>
            {listings.length === 0 ? (
              <p className="muted">No listings yet — create your first one above.</p>
            ) : (
              <div className="grid">
                {listings.map((l) => (
                  <Link key={l.id} href={`/stay/${l.id}`} className="card">
                    <div className="photo">
                      {l.images?.[0] ? <img src={l.images[0]} alt={l.title} /> : <div className="g-empty" style={{ height: '100%' }}>No photo</div>}
                      <span className="badge">{l.status}</span>
                    </div>
                    <div className="meta">
                      <div className="row"><span className="title">{l.title}</span></div>
                      <div className="place">{l.city}{l.country ? `, ${l.country}` : ''}</div>
                      <div className="price"><b>{format(l.priceUSD)}</b> <span>night</span></div>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
