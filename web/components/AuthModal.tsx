'use client';

// The branded sign-in/sign-up modal — phone or email entry, OTP, then (for new
// identities) a short profile step. Talks to Clerk directly via its custom-flow
// hooks (not the stock <SignIn> popup) so we control every pixel; once Clerk
// issues a session, StayonBridge exchanges it for a StayOn session and decides
// whether to route here into the 'profile' step (see StayonBridge.tsx).

import { useEffect, useRef, useState } from 'react';
import { useSignIn, useSignUp } from '@clerk/nextjs';
import { useAuthModal } from './AuthModalProvider';
import { COUNTRIES, POPULAR_ISO2, flagUrl, countryByIso2 } from '@/lib/countries';
import { updateMe } from '@/lib/stayonClient';

type Mode = 'phone' | 'email';
type PendingKind = 'signin' | 'signup' | null;

function firstClerkError(err: any, fallback: string): string {
  return err?.errors?.[0]?.longMessage || err?.errors?.[0]?.message || fallback;
}

function isNotFoundError(err: any): boolean {
  const code = err?.errors?.[0]?.code;
  return code === 'form_identifier_not_found' || code === 'form_param_unknown';
}

export function AuthModal() {
  const { isOpen, intent, step, closeAuthModal, setStep } = useAuthModal();
  const { isLoaded: signInLoaded, signIn, setActive } = useSignIn();
  const { isLoaded: signUpLoaded, signUp } = useSignUp();

  const [mode, setMode] = useState<Mode>('phone');
  const [iso2, setIso2] = useState('us');
  const [value, setValue] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [pending, setPending] = useState<PendingKind>(null);
  const [first, setFirst] = useState('');
  const [last, setLast] = useState('');
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  const hostFlow = intent === 'host';

  // Reset the per-open fields whenever the modal closes.
  useEffect(() => {
    if (!isOpen) {
      setMode('phone');
      setValue('');
      setCode(['', '', '', '', '', '']);
      setPending(null);
      setErr('');
      setBusy(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const digits = value.replace(/\D/g, '');
  const validEntry = mode === 'phone'
    ? digits.length >= 6 && digits.length <= 14
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  const validProfile = !!(first.trim() && last.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email));

  const identifier = mode === 'phone' ? `${countryByIso2(iso2)?.dial || '+1'}${digits}` : value.trim();

  async function submitEntry() {
    if (!validEntry || !signInLoaded || !signUpLoaded || busy) return;
    setErr('');
    setBusy(true);
    try {
      // Try sign-in first — an existing account is the common case for "Log in".
      const attempt = await signIn.create({ identifier });
      const factor = attempt.supportedFirstFactors?.find((f: any) =>
        mode === 'phone' ? f.strategy === 'phone_code' : f.strategy === 'email_code',
      );
      await signIn.prepareFirstFactor(
        mode === 'phone'
          ? { strategy: 'phone_code', phoneNumberId: (factor as any)?.phoneNumberId }
          : { strategy: 'email_code', emailAddressId: (factor as any)?.emailAddressId },
      );
      setPending('signin');
      setStep('otp');
    } catch (e: any) {
      if (!isNotFoundError(e)) {
        setErr(firstClerkError(e, 'Could not start sign-in. Try again.'));
        setBusy(false);
        return;
      }
      // No existing account — sign up instead.
      try {
        await signUp.create(mode === 'phone' ? { phoneNumber: identifier } : { emailAddress: identifier });
        if (mode === 'phone') await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
        else await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
        setPending('signup');
        setStep('otp');
      } catch (e2: any) {
        setErr(firstClerkError(e2, 'Could not start sign-up. Try again.'));
      }
    } finally {
      setBusy(false);
    }
  }

  async function verifyOtp() {
    const joined = code.join('');
    if (joined.length !== 6 || busy || !signInLoaded || !signUpLoaded) {
      setErr('Enter the complete 6-digit code');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const result =
        pending === 'signin'
          ? await signIn.attemptFirstFactor({ strategy: mode === 'phone' ? 'phone_code' : 'email_code', code: joined })
          : mode === 'phone'
            ? await signUp.attemptPhoneNumberVerification({ code: joined })
            : await signUp.attemptEmailAddressVerification({ code: joined });

      if (result.status === 'complete' && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        // From here StayonBridge takes over: exchanges the Clerk session for a
        // StayOn one and either flips this modal to 'profile' or closes it.
      } else {
        setErr('Verification incomplete — try again.');
        setBusy(false);
      }
    } catch (e: any) {
      setErr(firstClerkError(e, "That code didn't work. Try again."));
      setBusy(false);
    }
  }

  async function resendCode() {
    if (!signInLoaded || !signUpLoaded) return;
    setErr('');
    try {
      if (pending === 'signin') {
        const factor = signIn.supportedFirstFactors?.find((f: any) =>
          mode === 'phone' ? f.strategy === 'phone_code' : f.strategy === 'email_code',
        );
        await signIn.prepareFirstFactor(
          mode === 'phone'
            ? { strategy: 'phone_code', phoneNumberId: (factor as any)?.phoneNumberId }
            : { strategy: 'email_code', emailAddressId: (factor as any)?.emailAddressId },
        );
      } else if (mode === 'phone') {
        await signUp.preparePhoneNumberVerification({ strategy: 'phone_code' });
      } else {
        await signUp.prepareEmailAddressVerification({ strategy: 'email_code' });
      }
    } catch (e: any) {
      setErr(firstClerkError(e, 'Could not resend the code.'));
    }
  }

  async function socialContinue(strategy: 'oauth_google' | 'oauth_apple') {
    if (!signInLoaded) return;
    setErr('');
    try {
      await signIn.authenticateWithRedirect({
        strategy,
        redirectUrl: '/sso-callback',
        redirectUrlComplete: '/',
      });
    } catch (e: any) {
      setErr(firstClerkError(e, `${strategy === 'oauth_google' ? 'Google' : 'Apple'} sign-in isn't set up yet.`));
    }
  }

  async function submitProfile() {
    if (!validProfile || busy) return;
    setBusy(true);
    setErr('');
    try {
      await updateMe(`${first.trim()} ${last.trim()}`.trim(), email.trim());
      closeAuthModal();
    } catch (e: any) {
      setErr(e?.message || 'Could not save your profile. Try again.');
    } finally {
      setBusy(false);
    }
  }

  const setDigit = (i: number, v: string) => {
    if (!/^\d?$/.test(v)) return;
    const next = [...code];
    next[i] = v;
    setCode(next);
    if (v && i < 5) otpRefs.current[i + 1]?.focus();
  };

  return (
    <div className="auth-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) closeAuthModal(); }}>
      <div className="auth-card">
        <button className="auth-x" onClick={closeAuthModal} aria-label="Close">
          <CloseIcon />
        </button>
        <div className="auth-brand">
          <span className="brand-name">Stay<span className="accent">On</span></span>
          <span className="brand-tag">stay beyond ordinary</span>
        </div>

        {step === 'entry' && (
          <>
            <h1>{hostFlow ? 'Host with StayOn' : 'Welcome back'}</h1>
            <p className="auth-sub">
              {hostFlow ? 'Log in or sign up — we verify every host before listing.' : 'Log in or sign up to book your stay.'}
            </p>
            <div className="auth-field">
              {mode === 'phone' && <CountrySelect value={iso2} onChange={setIso2} />}
              <input
                autoFocus
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={mode === 'phone' ? 'Phone number' : 'Email address'}
                type={mode === 'phone' ? 'tel' : 'email'}
                onKeyDown={(e) => e.key === 'Enter' && submitEntry()}
              />
            </div>
            {err && <p className="auth-err">{err}</p>}
            <p className="auth-helper">A secure code will arrive shortly</p>
            <button className="btn-gradient full" disabled={!validEntry || busy} onClick={submitEntry}>
              {busy ? 'Please wait…' : 'Continue'}
            </button>
            <button className="auth-switch" onClick={() => { setMode((m) => (m === 'phone' ? 'email' : 'phone')); setValue(''); setErr(''); }}>
              {mode === 'phone' ? 'Use email instead' : 'Use phone number instead'}
            </button>
            <div className="auth-or"><span>or</span></div>
            <div className="auth-social-row">
              <button className="auth-social-ic" aria-label="Continue with Google" onClick={() => socialContinue('oauth_google')}>
                <GoogleG size={22} />
              </button>
              <button className="auth-social-ic auth-apple" aria-label="Continue with Apple" onClick={() => socialContinue('oauth_apple')}>
                <AppleIcon size={22} />
              </button>
            </div>
          </>
        )}

        {step === 'otp' && (
          <>
            <div className="auth-shield"><ShieldIcon /></div>
            <h1>Verify it&apos;s you</h1>
            <p className="auth-sub">Enter the 6-digit code sent to <b>{value}</b></p>
            <div className="otp-row">
              {code.map((d, i) => (
                <input
                  key={i}
                  ref={(el) => { otpRefs.current[i] = el; }}
                  value={d}
                  inputMode="numeric"
                  maxLength={1}
                  onChange={(e) => setDigit(i, e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Backspace' && !code[i] && i > 0) otpRefs.current[i - 1]?.focus(); }}
                />
              ))}
            </div>
            {err && <p className="auth-err">{err}</p>}
            <button className="btn-gradient full" disabled={busy} onClick={verifyOtp}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
            <button className="auth-switch" onClick={resendCode}>Didn&apos;t receive it? <b>Request new code</b></button>
          </>
        )}

        {step === 'profile' && (
          <>
            <h1>{hostFlow ? 'Set up your host profile' : 'Begin your journey'}</h1>
            <p className="auth-sub">
              {hostFlow ? 'Your number is verified — add your details to start listing.' : 'Craft your story, unlock extraordinary stays.'}
            </p>
            <label className="auth-label">Legal name</label>
            <div className="auth-namerow">
              <input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} />
              <input placeholder="Surname" value={last} onChange={(e) => setLast(e.target.value)} />
            </div>
            <label className="auth-label">Email</label>
            <div className="auth-field">
              <input placeholder="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <p className="auth-err">{err}</p>}
            <p className="auth-terms">
              By selecting Agree and continue, I agree to StayOn&apos;s Terms of Service and Payments Terms, and acknowledge the Privacy Policy.
            </p>
            <button className="btn-gradient full" disabled={!validProfile || busy} onClick={submitProfile}>
              {busy ? 'Saving…' : 'Agree and continue'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────── Small building blocks ───────────────────────── */

function CountrySelect({ value, onChange }: { value: string; onChange: (iso2: string) => void }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const wrap = useRef<HTMLDivElement>(null);
  const sel = countryByIso2(value) || countryByIso2('us')!;

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const results = q.trim()
    ? COUNTRIES.filter((c) => c.name.toLowerCase().includes(q.trim().toLowerCase()))
    : [...COUNTRIES].sort((a, b) => {
        const pa = POPULAR_ISO2.indexOf(a.iso2);
        const pb = POPULAR_ISO2.indexOf(b.iso2);
        if (pa !== -1 || pb !== -1) return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
        return a.name.localeCompare(b.name);
      });

  return (
    <div className="country-select" ref={wrap}>
      <button type="button" className="country-trigger" onClick={() => setOpen((o) => !o)}>
        <img src={flagUrl(sel.iso2)} alt="" width={20} height={14} />
        <span>{sel.dial}</span>
        <ChevDownIcon />
      </button>
      {open && (
        <div className="country-panel">
          <input
            autoFocus
            className="country-search"
            placeholder="Search country"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <div className="country-list">
            {results.map((c) => (
              <button
                key={c.iso2}
                type="button"
                className="country-item"
                onClick={() => { onChange(c.iso2); setOpen(false); setQ(''); }}
              >
                <img src={flagUrl(c.iso2)} alt="" width={20} height={14} />
                <span className="country-name">{c.name}</span>
                <span className="country-dial">{c.dial}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GoogleG({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function AppleIcon({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M16 13c0-2.2 1.8-3.2 1.9-3.3-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.5 2.2-1.5 2.6-.4 6.5 1.1 8.6.7 1 1.5 2.2 2.6 2.1 1-.04 1.4-.7 2.7-.7s1.6.7 2.7.6c1.1 0 1.8-1 2.5-2 .8-1.2 1.1-2.3 1.1-2.4-.1 0-2.1-.8-2.1-3.2ZM14 6.5c.6-.7 1-1.7.9-2.7-.9 0-1.9.6-2.5 1.3-.5.6-1 1.6-.9 2.6 1 .1 2-.5 2.5-1.2Z"
        fill="currentColor"
      />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M18 6 6 18M6 6l12 12" />
    </svg>
  );
}

function ChevDownIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2 4 5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10V5l-8-3Z" />
    </svg>
  );
}
