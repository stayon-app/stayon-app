import React, { useEffect, useRef, useState } from 'react';
import { useApp, usd, nightsBetween, priceBreakdown, makeBookingCode } from './store';
import { Icon, GradientButton, Logo } from './ui';
import { stayById } from './data';

/* ═══════════════════════════ AUTH (phone → OTP → account) ═══════════════════════════ */
export function AuthScreen() {
  const { navigate, login, pending, setPending } = useApp();
  const [step, setStep] = useState<'enter' | 'otp' | 'account'>('enter');
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  const [dial] = useState('+1');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const validEntry = mode === 'phone'
    ? value.replace(/\D/g, '').length >= 6 && value.replace(/\D/g, '').length <= 14
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  const finish = () => {
    login({ name: `${first} ${last}`.trim() || 'Guest', identifier: value });
    const dest = pending; setPending(null);
    if (dest) navigate(dest.name, dest.params); else navigate('home');
  };

  const goEnter = () => { if (validEntry) { setErr(''); setStep('otp'); } };
  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const verify = () => {
    if (code.join('').length === 6) { setErr(''); setStep('account'); }
    else setErr('Enter the complete 6-digit code');
  };
  const validAccount = first.trim() && last.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="auth">
      <div className="auth-card">
        <button className="auth-x" onClick={() => navigate('home')}><Icon name="close" size={20} /></button>
        <div className="auth-brand"><Logo /></div>

        {step === 'enter' && (
          <>
            <h1>Welcome back</h1>
            <p className="auth-sub">Log in or sign up to book your stay.</p>
            <div className="auth-field">
              {mode === 'phone' && <span className="auth-dial">🇺🇸 {dial}</span>}
              <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'phone' ? 'Phone number' : 'Email address'}
                type={mode === 'phone' ? 'tel' : 'email'}
                onKeyDown={(e) => e.key === 'Enter' && goEnter()} />
            </div>
            <p className="auth-helper">A secure code will arrive shortly</p>
            <GradientButton full disabled={!validEntry} onClick={goEnter}>Continue</GradientButton>
            <button className="auth-switch" onClick={() => { setMode((m) => (m === 'phone' ? 'email' : 'phone')); setValue(''); }}>
              {mode === 'phone' ? 'Use email instead' : 'Use phone number instead'}
            </button>
            <div className="auth-or"><span>or</span></div>
            <button className="auth-social" onClick={() => { setValue('google_user'); setStep('otp'); }}><span>🇬</span> Continue with Google</button>
            <button className="auth-social" onClick={() => { setValue('apple_user'); setStep('otp'); }}><span></span> Continue with Apple</button>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="auth-shield"><Icon name="shield" size={26} fill /></div>
            <h1>Verify it's you</h1>
            <p className="auth-sub">Enter the 6-digit code sent to <b>{value}</b></p>
            <div className="otp-row">
              {code.map((d, i) => (
                <input key={i} ref={(el) => (otpRefs.current[i] = el)} value={d} inputMode="numeric" maxLength={1}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) otpRefs.current[i - 1]?.focus(); }} />
              ))}
            </div>
            {err && <p className="auth-err">{err}</p>}
            <p className="auth-hint">💡 Demo: type any 6 digits</p>
            <GradientButton full onClick={verify}>Verify</GradientButton>
            <button className="auth-switch">Didn't receive it? <b>Request new code</b></button>
          </>
        )}

        {step === 'account' && (
          <>
            <h1>Begin your journey</h1>
            <p className="auth-sub">Craft your story, unlock extraordinary stays.</p>
            <label className="auth-label">Legal name</label>
            <div className="auth-namerow">
              <input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
              <input placeholder="Surname" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <label className="auth-label">Email</label>
            <div className="auth-field"><input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <p className="auth-terms">By selecting Agree and continue, I agree to StayOn's Terms of Service and Payments Terms, and acknowledge the Privacy Policy.</p>
            <GradientButton full disabled={!validAccount} onClick={finish}>Agree and continue</GradientButton>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ BOOKING WIZARD (Review → Message → Pay) ═══════════════════════════ */
export function BookScreen() {
  const { route, navigate, draft, setDraft, addBooking, user } = useApp();
  const stay = stayById(route.params?.id || draft?.stayId || '');
  const [step, setStep] = useState(0);
  const [checkIn, setCheckIn] = useState(draft?.checkIn || new Date(Date.now() + 14 * 86_400_000).toISOString().slice(0, 10));
  const [checkOut, setCheckOut] = useState(draft?.checkOut || new Date(Date.now() + 19 * 86_400_000).toISOString().slice(0, 10));
  const [guests, setGuests] = useState(draft?.guests || 2);
  const [message, setMessage] = useState('');
  const [promo, setPromo] = useState('');
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoErr, setPromoErr] = useState('');
  const [pay, setPay] = useState('card');
  const [card, setCard] = useState('');
  const [exp, setExp] = useState('');
  const [cvc, setCvc] = useState('');
  const [agree, setAgree] = useState(false);
  const [showBreakdown, setShowBreakdown] = useState(false);

  useEffect(() => { if (!stay) navigate('home'); }, [stay]);
  if (!stay) return null;

  const nights = nightsBetween(checkIn, checkOut);
  const b = priceBreakdown(stay.price, nights, promoApplied);
  const last4 = card.replace(/\D/g, '').slice(-4) || '4242';

  const applyPromo = () => {
    const v = promo.trim();
    if (v.toUpperCase() === 'STAY10' || v.length >= 4) { setPromoApplied(true); setPromoErr(''); }
    else setPromoErr('Invalid code — try STAY10 for 10% off.');
  };

  const STEPS = ['Review', 'Message', 'Pay'];
  const TITLES = ['Review and continue', `Write a message to ${stay.host.name}`, 'Confirm and pay'];

  const cardValid = pay !== 'card' || card.replace(/\D/g, '').length >= 15;
  const canConfirm = agree && cardValid;

  const confirm = () => {
    if (!canConfirm) return;
    const c = {
      code: makeBookingCode(), stay, checkIn, checkOut, nights, guests,
      subtotal: b.subtotal, cleaningFee: b.cleaningFee, taxes: b.taxes, discount: b.discount, total: b.total,
      instant: stay.instantBook, cardLast4: last4, createdAt: Date.now(),
    };
    addBooking(c);
    setDraft(null);
    navigate('confirm');
  };

  const next = () => { if (step < 2) setStep(step + 1); };

  const fmtDate = (d: string) => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="book">
      <div className="book-head">
        <button className="back" onClick={() => (step > 0 ? setStep(step - 1) : navigate('stay', { id: stay.id }))}>
          <Icon name={step > 0 ? 'chevL' : 'close'} size={18} /> {step > 0 ? 'Back' : 'Close'}
        </button>
        <div className="book-progress">
          {STEPS.map((s, i) => <span key={s} className={`book-seg${i <= step ? ' on' : ''}`} />)}
        </div>
      </div>

      <div className="book-body">
        <div className="book-main">
          <h1 className="book-title">{TITLES[step]}</h1>

          {/* STEP 0 — Review */}
          {step === 0 && (
            <>
              <div className="book-summary">
                <img src={stay.images[0]} alt={stay.title} />
                <div>
                  <div className="book-sum-title">{stay.title}</div>
                  <div className="muted">{stay.location}</div>
                  <div className="book-sum-rating"><Icon name="star" size={13} fill color="#F59E0B" /> {stay.rating.toFixed(2)} · {stay.reviews} reviews {stay.guestFavourite && '· Guest favourite'}</div>
                </div>
              </div>

              <div className="book-edit">
                <div className="book-edit-row">
                  <div><label>Dates</label><div className="book-edit-val">{fmtDate(checkIn)} – {fmtDate(checkOut)}</div></div>
                </div>
                <div className="book-date-inputs">
                  <input type="date" value={checkIn} onChange={(e) => setCheckIn(e.target.value)} />
                  <input type="date" value={checkOut} onChange={(e) => setCheckOut(e.target.value)} />
                </div>
                <div className="book-edit-row guests-row">
                  <div><label>Guests</label><div className="book-edit-val">{guests} guest{guests > 1 ? 's' : ''}</div></div>
                  <div className="stepper">
                    <button onClick={() => setGuests((g) => Math.max(1, g - 1))} disabled={guests <= 1}><Icon name="minus" size={16} /></button>
                    <span>{guests}</span>
                    <button onClick={() => setGuests((g) => Math.min(stay.maxGuests, g + 1))} disabled={guests >= stay.maxGuests}><Icon name="plus" size={16} /></button>
                  </div>
                </div>
              </div>

              <div className={`book-policy ${stay.instantBook ? 'ok' : 'warn'}`}>
                {stay.instantBook ? 'Free cancellation before check-in. Your booking confirms immediately.' : "You won't be charged until the host accepts your request."}
              </div>
            </>
          )}

          {/* STEP 1 — Message */}
          {step === 1 && (
            <>
              <p className="book-sub">Before you continue, let {stay.host.name} know a little about your trip and why their place is a good fit.</p>
              <textarea className="book-textarea" maxLength={500} value={message} onChange={(e) => setMessage(e.target.value)}
                placeholder={`Example: "Hi ${stay.host.name}, my partner and I are visiting for a friend's wedding and your place is right nearby."`} />
              <div className="book-counter">
                <span className={message ? 'ok' : 'muted'}>{message ? '✓ Looks good' : 'Optional, but hosts reply faster to a quick hello'}</span>
                <span className="muted">{message.length}/500</span>
              </div>
            </>
          )}

          {/* STEP 2 — Pay */}
          {step === 2 && (
            <>
              <div className={`book-banner ${stay.instantBook ? 'ok' : 'warn'}`}>
                <b>{stay.instantBook ? 'Instant Book' : 'Request to Book'}</b>
                <span>{stay.instantBook ? 'Your booking confirms immediately.' : "The host has 24h to accept. You won't be charged until then."}</span>
              </div>

              {/* Promo */}
              <div className="book-field-group">
                <label className="book-label">Promo code</label>
                {!promoApplied ? (
                  <div className="promo-row">
                    <input value={promo} onChange={(e) => setPromo(e.target.value)} placeholder="Enter code (try STAY10)" />
                    <button className="btn-outline sm" onClick={applyPromo}>Apply</button>
                  </div>
                ) : (
                  <div className="promo-applied">
                    <Icon name="check" size={16} /> <b>{promo.toUpperCase() || 'STAY10'} applied</b> — you saved {usd(b.discount)} (10% off)
                    <button onClick={() => { setPromoApplied(false); setPromo(''); }}><Icon name="close" size={14} /></button>
                  </div>
                )}
                {promoErr && <p className="auth-err">{promoErr}</p>}
              </div>

              {/* Payment methods */}
              <div className="book-field-group">
                <label className="book-label">Pay with</label>
                {[['card', '💳 Credit or debit card'], ['apple', ' Apple Pay'], ['google', '🇬 Google Pay'], ['paypal', '🅿️ PayPal']].map(([id, label]) => (
                  <button key={id} className={`pay-opt${pay === id ? ' on' : ''}`} onClick={() => setPay(id)}>
                    <span className="pay-radio">{pay === id && <i />}</span> {label}
                  </button>
                ))}
                {pay === 'card' && (
                  <div className="card-form">
                    <input placeholder="1234 5678 9012 3456" value={card} maxLength={19}
                      onChange={(e) => setCard(e.target.value.replace(/[^\d]/g, '').replace(/(.{4})/g, '$1 ').trim())} />
                    <div className="card-form-row">
                      <input placeholder="MM/YY" value={exp} maxLength={5}
                        onChange={(e) => { let v = e.target.value.replace(/\D/g, ''); if (v.length >= 3) v = v.slice(0, 2) + '/' + v.slice(2, 4); setExp(v); }} />
                      <input placeholder="CVC" value={cvc} maxLength={4} type="password"
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, ''))} />
                    </div>
                    {!cardValid && card.length > 0 && <p className="auth-err">Enter a complete card number</p>}
                  </div>
                )}
              </div>

              {/* Price details */}
              <div className="book-field-group">
                <label className="book-label">Price details</label>
                <div className="price-lines">
                  <div><span className="link-u">{usd(stay.price)} × {nights} night{nights > 1 ? 's' : ''}</span><span>{usd(b.subtotal)}</span></div>
                  <div><span className="link-u">Cleaning fee</span><span>{usd(b.cleaningFee)}</span></div>
                  <div><button className="link-u btn-text" onClick={() => setShowBreakdown((v) => !v)}>Taxes {showBreakdown ? '▴' : '▾'}</button><span>{usd(b.taxes)}</span></div>
                  {showBreakdown && <div className="price-sub"><span>Occupancy & tourism tax (8%)</span><span>{usd(b.taxes)}</span></div>}
                  {b.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{usd(b.discount)}</span></div>}
                  <div className="price-total"><b>Total (USD)</b><b>{usd(b.total)}</b></div>
                </div>
              </div>

              <label className="book-agree">
                <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
                <span>I agree to the Host's House Rules, Ground rules, and StayOn's Rebooking & Refund Policy.</span>
              </label>
            </>
          )}
        </div>

        {/* Side price summary */}
        <aside className="book-aside">
          <div className="book-pricecard">
            <div className="book-pc-top">
              <img src={stay.images[0]} alt={stay.title} />
              <div><div className="book-sum-title sm">{stay.title}</div><div className="muted">{stay.location}</div></div>
            </div>
            <div className="book-pc-lines">
              <div><span>{usd(stay.price)} × {nights} nights</span><span>{usd(b.subtotal)}</span></div>
              <div><span>Cleaning fee</span><span>{usd(b.cleaningFee)}</span></div>
              <div><span>Taxes</span><span>{usd(b.taxes)}</span></div>
              {b.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{usd(b.discount)}</span></div>}
            </div>
            <div className="book-pc-total"><b>Total (USD)</b><b>{usd(b.total)}</b></div>
          </div>
        </aside>
      </div>

      {/* Footer */}
      <div className="book-foot">
        <div className="book-foot-inner">
          <div className="book-step-label">Step {step + 1} of 3 {user && <span className="muted">· {user.name}</span>}</div>
          {step < 2 ? (
            <GradientButton onClick={next}>Next</GradientButton>
          ) : (
            <GradientButton icon="lock" disabled={!canConfirm} onClick={confirm}>
              {stay.instantBook ? `Confirm and pay · ${usd(b.total)}` : 'Request to book'}
            </GradientButton>
          )}
        </div>
        {step === 2 && <p className="book-secure"><Icon name="lock" size={13} /> Secured payment · 256-bit encryption</p>}
      </div>
    </div>
  );
}

/* ═══════════════════════════ CONFIRMATION ═══════════════════════════ */
export function ConfirmScreen() {
  const { lastConfirmation, navigate, showToast } = useApp();
  const c = lastConfirmation;
  useEffect(() => { if (!c) navigate('home'); }, [c]);
  if (!c) return null;
  const fmt = (d: string) => new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="confirm">
      <div className="confirm-hero">
        <div className="confirm-check"><Icon name="check" size={44} /></div>
        <h1>{c.instant ? 'Booking confirmed!' : 'Request sent!'}</h1>
        <p>{c.instant ? 'Get ready for your adventure' : 'Waiting for host approval (within 24h)'}</p>
      </div>

      <div className="confirm-body">
        <div className="confirm-code">
          <span>{c.instant ? 'Booking reference' : 'Request reference'}</span>
          <b>{c.code}</b>
          <small>Confirmation sent to your email</small>
        </div>

        <div className="confirm-card">
          <h3>Your stay</h3>
          <div className="confirm-stay">
            <img src={c.stay.images[0]} alt={c.stay.title} />
            <div>
              <b>{c.stay.title}</b>
              <div className="muted"><Icon name="pin" size={13} /> {c.stay.location}</div>
            </div>
          </div>
          <div className="confirm-dates">
            <div><label>Check-in</label><b>{fmt(c.checkIn)}</b><span>After 3:00 PM</span></div>
            <div className="confirm-arrow"><Icon name="arrow" size={16} /><small>{c.nights}n</small></div>
            <div><label>Check-out</label><b>{fmt(c.checkOut)}</b><span>Before 11:00 AM</span></div>
          </div>
          <div className="confirm-guests"><Icon name="user" size={15} /> {c.guests} guest{c.guests > 1 ? 's' : ''}</div>
        </div>

        <div className="confirm-actions">
          <button onClick={() => showToast('Opening directions…')}><Icon name="pin" size={18} /> Directions</button>
          <button onClick={() => showToast('Added to your calendar')}><Icon name="cal" size={18} /> Add to calendar</button>
          <button onClick={() => navigate('trips')}><Icon name="cal" size={18} /> My trips</button>
        </div>

        <div className="confirm-card">
          <h3>Price details</h3>
          <div className="price-lines">
            <div><span>{usd(c.subtotal / c.nights)} × {c.nights} nights</span><span>{usd(c.subtotal)}</span></div>
            <div><span>Cleaning fee</span><span>{usd(c.cleaningFee)}</span></div>
            <div><span>Taxes</span><span>{usd(c.taxes)}</span></div>
            {c.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{usd(c.discount)}</span></div>}
            <div className="price-total"><b>Total (USD)</b><b>{usd(c.total)}</b></div>
          </div>
          <div className="confirm-paid"><Icon name="lock" size={14} /> Charged to Visa •••• {c.cardLast4} <span className="paid-tag">Paid</span></div>
        </div>

        <div className="confirm-note"><Icon name="shield" size={16} /> For your safety: StayOn will never ask you to pay by bank transfer or move off the app.</div>

        <div className="confirm-coins">
          <span className="coins-star">⭐</span>
          <div><b>You earned {Math.round(c.subtotal / c.nights)} StayCoins!</b><span>Added to your Gold Member balance</span></div>
        </div>

        <GradientButton full onClick={() => navigate('home')}>Back to home</GradientButton>
      </div>
    </div>
  );
}
