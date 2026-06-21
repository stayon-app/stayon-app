import React, { useEffect, useRef, useState } from 'react';
import { useApp, nightsBetween, priceBreakdown, makeBookingCode, COUNTRY_CURRENCY } from './store';
import { Icon, GradientButton, Logo, Calendar, CountrySelect, GoogleG } from './ui';
import { stayById } from './data';
import { idTypesForCountry, countryByIso2 } from './countries';
import { api } from './api';

/* ═══════════════════════════ AUTH (phone → OTP → account) ═══════════════════════════ */
export function AuthScreen() {
  const { navigate, login, pending, setPending, setCurrency, country, getHostAccount, getVerified, verifyIdentity } = useApp();
  const [step, setStep] = useState<'enter' | 'otp' | 'account' | 'identity'>('enter');
  const [mode, setMode] = useState<'phone' | 'email'>('phone');
  const [value, setValue] = useState('');
  // Pre-select the auto-detected country (ISO-2 from IP/timezone); currency follows it.
  const [iso2, setIso2] = useState(() => (country || 'US').toLowerCase());
  const curOf = (i: string) => COUNTRY_CURRENCY[i.toUpperCase()] || 'USD';
  // Hosting requires the same verified login as a guest: phone/email → OTP → profile.
  const hostFlow = !!pending && pending.name.startsWith('host');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [err, setErr] = useState('');
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  // Identity verification (mandatory for new users before booking / publishing)
  const [dob, setDob] = useState('');
  const [idType, setIdType] = useState('passport');
  const [docNumber, setDocNumber] = useState('');
  const [docFront, setDocFront] = useState('');
  const [docBack, setDocBack] = useState('');
  // Documents depend on the login country (passport is universal). Some are single-sided.
  const idList = idTypesForCountry(iso2);
  const idDoc = idList.find((t) => t.id === idType) || idList[0];
  const singleSided = !!idDoc?.single;
  const countryName = countryByIso2(iso2)?.name || 'your country';
  // Keep the selected document valid when the country changes.
  useEffect(() => { if (!idList.some((t) => t.id === idType)) setIdType('passport'); }, [iso2]); // eslint-disable-line
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const legalName = `${first} ${last}`.trim();

  const validEntry = mode === 'phone'
    ? value.replace(/\D/g, '').length >= 6 && value.replace(/\D/g, '').length <= 14
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

  // Final step — log in, set currency, and route to the pending destination.
  const finishWith = (name: string) => {
    const ident = value;
    login({ name: name || 'Guest', identifier: ident });
    api.loginPhone(ident, name || 'Guest', iso2.toUpperCase()); // best-effort backend session
    setCurrency(mode === 'phone' ? curOf(iso2) : 'USD');
    const dest = pending; setPending(null);
    // Host entry: open the dashboard if this person already has a host account,
    // otherwise send them into Get started → listing wizard.
    if (dest && dest.name.startsWith('host')) {
      const acct = getHostAccount(ident);
      navigate(acct?.verified ? 'host-today' : 'host-create');
    } else if (dest) {
      navigate(dest.name, dest.params);
    } else {
      navigate('home');
    }
  };

  const goEnter = () => { if (validEntry) { setErr(''); setStep('otp'); } };
  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code]; next[i] = v; setCode(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };
  const verify = () => {
    if (code.join('').length !== 6) { setErr('Enter the complete 6-digit code'); return; }
    setErr('');
    // Returning, already-verified person → straight in with their existing details.
    const existing = getVerified(value);
    if (existing) finishWith(existing.name);
    else setStep('account');
  };
  const validAccount = !!(first.trim() && last.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));
  const validIdentity = legalName.length > 1 && !!dob && docNumber.trim().length >= 4 && !!docFront && (singleSided || !!docBack);
  // New user: verify identity, persist it, then continue.
  const submitIdentity = () => {
    verifyIdentity(value, legalName, idType);
    // Best-effort: record the KYC submission to the backend (Ops review queue).
    api.loginPhone(value, legalName, iso2.toUpperCase()).then(() =>
      api.submitIdentity({ legalName, idType, idNumber: docNumber, dob, country: iso2.toUpperCase(), docFront, docBack }));
    finishWith(legalName);
  };

  return (
    <div className="auth">
      <div className="auth-card">
        <button className="auth-x" onClick={() => navigate('home')}><Icon name="close" size={20} /></button>
        <div className="auth-brand"><Logo /></div>

        {step === 'enter' && (
          <>
            <h1>{hostFlow ? 'Host with StayOn' : 'Welcome back'}</h1>
            <p className="auth-sub">{hostFlow ? 'Log in or sign up — we verify every host before listing.' : 'Log in or sign up to book your stay.'}</p>
            <div className="auth-field">
              {mode === 'phone' && <CountrySelect value={iso2} onChange={setIso2} />}
              <input autoFocus value={value} onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'phone' ? 'Phone number' : 'Email address'}
                type={mode === 'phone' ? 'tel' : 'email'}
                onKeyDown={(e) => e.key === 'Enter' && goEnter()} />
            </div>
            <p className="auth-helper">A secure code will arrive shortly{mode === 'phone' ? ` · prices shown in ${curOf(iso2)}` : ''}</p>
            <GradientButton full disabled={!validEntry} onClick={goEnter}>Continue</GradientButton>
            <button className="auth-switch" onClick={() => { setMode((m) => (m === 'phone' ? 'email' : 'phone')); setValue(''); }}>
              {mode === 'phone' ? 'Use email instead' : 'Use phone number instead'}
            </button>
            <div className="auth-or"><span>or</span></div>
            <div className="auth-social-row">
              <button className="auth-social-ic" aria-label="Continue with Google" onClick={() => { setValue('google_user'); setStep('otp'); }}><GoogleG size={24} /></button>
              <button className="auth-social-ic auth-apple" aria-label="Continue with Apple" onClick={() => { setValue('apple_user'); setStep('otp'); }}><Icon name="apple" size={24} /></button>
            </div>
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
            <p className="auth-hint">Demo: type any 6 digits to continue</p>
            <GradientButton full onClick={verify}>Verify</GradientButton>
            <button className="auth-switch">Didn't receive it? <b>Request new code</b></button>
          </>
        )}

        {step === 'account' && (
          <>
            <h1>{hostFlow ? 'Set up your host profile' : 'Begin your journey'}</h1>
            <p className="auth-sub">{hostFlow ? 'Your number is verified — add your details to start listing.' : 'Craft your story, unlock extraordinary stays.'}</p>
            <label className="auth-label">Legal name</label>
            <div className="auth-namerow">
              <input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
              <input placeholder="Surname" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <label className="auth-label">Email</label>
            <div className="auth-field"><input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <p className="auth-terms">By selecting Agree and continue, I agree to StayOn's Terms of Service and Payments Terms, and acknowledge the Privacy Policy.</p>
            <GradientButton full disabled={!validAccount} onClick={() => setStep('identity')}>Agree and continue</GradientButton>
          </>
        )}

        {step === 'identity' && (
          <>
            <div className="auth-shield"><Icon name="id" size={26} /></div>
            <h1>Verify your identity</h1>
            <p className="auth-sub">{hostFlow ? 'Every host is verified before listing.' : 'A one-time check — required before you can book.'} Encrypted and never shown to others.</p>
            <label className="auth-label">Legal name (as on your ID)</label>
            <div className="auth-field"><input value={legalName} readOnly /></div>
            <label className="auth-label">Date of birth</label>
            <div className="auth-field"><input type="date" value={dob} onChange={(e) => setDob(e.target.value)} /></div>
            <label className="auth-label">Document type <span className="auth-label-hint">· for {countryName}</span></label>
            <div className="auth-field auth-select">
              <select value={idType} onChange={(e) => setIdType(e.target.value)}>
                {idList.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
              <Icon name="chevD" size={16} />
            </div>
            <label className="auth-label">Document number</label>
            <div className="auth-field"><input placeholder="ID / document number" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} /></div>
            <label className="auth-label">Upload document {singleSided ? '(photo page)' : '(front & back)'}</label>
            <div className="auth-uploads">
              <label className={`auth-upload${docFront ? ' done' : ''}`}>
                <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setDocFront(e.target.files?.[0]?.name || '')} />
                {docFront
                  ? <><Icon name="check" size={17} /> <span className="auth-upload-name">{docFront}</span></>
                  : <><Icon name="camera" size={17} /> {singleSided ? 'Upload photo page' : 'Front side'}</>}
              </label>
              {!singleSided && (
                <label className={`auth-upload${docBack ? ' done' : ''}`}>
                  <input type="file" accept="image/*,application/pdf" hidden onChange={(e) => setDocBack(e.target.files?.[0]?.name || '')} />
                  {docBack
                    ? <><Icon name="check" size={17} /> <span className="auth-upload-name">{docBack}</span></>
                    : <><Icon name="camera" size={17} /> Back side</>}
                </label>
              )}
            </div>
            <p className="auth-terms"><Icon name="lock" size={13} /> Encrypted &amp; stored securely. We only keep the last 4 digits and a copy of your document.</p>
            <GradientButton full disabled={!validIdentity} onClick={submitIdentity}>Verify &amp; continue</GradientButton>
          </>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════ BOOKING WIZARD (Review → Message → Pay) ═══════════════════════════ */
export function BookScreen() {
  const { route, navigate, draft, setDraft, addBooking, user, isVerified, setPending, money, currency } = useApp();
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
  // Booking requires a verified identity — block direct-link access for unverified visitors.
  useEffect(() => {
    if (stay && (!user || !isVerified)) { setPending({ name: 'book', params: { id: stay.id } }); navigate('auth'); }
  }, [stay, user, isVerified]);
  if (!stay) return null;

  const nights = checkIn && checkOut ? nightsBetween(checkIn, checkOut) : 1;
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

  const fmtDate = (d: string) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '…';

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
                <div className="book-cal">
                  <Calendar start={checkIn} end={checkOut} onPick={(id) => {
                    if (!checkIn || (checkIn && checkOut)) { setCheckIn(id); setCheckOut(''); }
                    else if (id < checkIn) { setCheckIn(id); }
                    else { setCheckOut(id); }
                  }} />
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
                    <Icon name="check" size={16} /> <b>{promo.toUpperCase() || 'STAY10'} applied</b> — you saved {money(b.discount)} (10% off)
                    <button onClick={() => { setPromoApplied(false); setPromo(''); }}><Icon name="close" size={14} /></button>
                  </div>
                )}
                {promoErr && <p className="auth-err">{promoErr}</p>}
              </div>

              {/* Payment methods */}
              <div className="book-field-group">
                <label className="book-label">Pay with</label>
                {[['card', 'card', 'Credit or debit card'], ['apple', 'apple', 'Apple Pay'], ['google', 'google', 'Google Pay'], ['paypal', 'paypal', 'PayPal']].map(([id, ic, label]) => (
                  <button key={id} className={`pay-opt${pay === id ? ' on' : ''}`} onClick={() => setPay(id)}>
                    <span className="pay-radio">{pay === id && <i />}</span>
                    <Icon name={ic} size={20} /> {label}
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
                  <div><span className="link-u">{money(stay.price)} × {nights} night{nights > 1 ? 's' : ''}</span><span>{money(b.subtotal)}</span></div>
                  <div><span className="link-u">Cleaning fee</span><span>{money(b.cleaningFee)}</span></div>
                  <div><button className="link-u btn-text" onClick={() => setShowBreakdown((v) => !v)}>Taxes {showBreakdown ? '▴' : '▾'}</button><span>{money(b.taxes)}</span></div>
                  {showBreakdown && <div className="price-sub"><span>Occupancy & tourism tax (8%)</span><span>{money(b.taxes)}</span></div>}
                  {b.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{money(b.discount)}</span></div>}
                  <div className="price-total"><b>Total ({currency})</b><b>{money(b.total)}</b></div>
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
              <div><span>{money(stay.price)} × {nights} nights</span><span>{money(b.subtotal)}</span></div>
              <div><span>Cleaning fee</span><span>{money(b.cleaningFee)}</span></div>
              <div><span>Taxes</span><span>{money(b.taxes)}</span></div>
              {b.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{money(b.discount)}</span></div>}
            </div>
            <div className="book-pc-total"><b>Total ({currency})</b><b>{money(b.total)}</b></div>
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
              {stay.instantBook ? `Confirm and pay · ${money(b.total)}` : 'Request to book'}
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
  const { lastConfirmation, navigate, showToast, money, currency } = useApp();
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
            <div><span>{money(c.subtotal / c.nights)} × {c.nights} nights</span><span>{money(c.subtotal)}</span></div>
            <div><span>Cleaning fee</span><span>{money(c.cleaningFee)}</span></div>
            <div><span>Taxes</span><span>{money(c.taxes)}</span></div>
            {c.discount > 0 && <div className="price-discount"><span>Promo discount</span><span>−{money(c.discount)}</span></div>}
            <div className="price-total"><b>Total ({currency})</b><b>{money(c.total)}</b></div>
          </div>
          <div className="confirm-paid"><Icon name="lock" size={14} /> Charged to Visa •••• {c.cardLast4} <span className="paid-tag">Paid</span></div>
        </div>

        <div className="confirm-note"><Icon name="shield" size={16} /> For your safety: StayOn will never ask you to pay by bank transfer or move off the app.</div>

        <div className="confirm-coins">
          <span className="coins-star"><Icon name="star" size={26} fill /></span>
          <div><b>You earned {Math.round(c.subtotal / c.nights)} StayCoins!</b><span>Added to your Gold Member balance</span></div>
        </div>

        <GradientButton full onClick={() => navigate('home')}>Back to home</GradientButton>
      </div>
    </div>
  );
}
