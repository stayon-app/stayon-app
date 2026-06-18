'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';

const DIAL_CODES = [
  { code: 'IN', dial: '+91', label: '🇮🇳 +91' },
  { code: 'US', dial: '+1', label: '🇺🇸 +1' },
  { code: 'GB', dial: '+44', label: '🇬🇧 +44' },
  { code: 'AE', dial: '+971', label: '🇦🇪 +971' },
  { code: 'AU', dial: '+61', label: '🇦🇺 +61' },
  { code: 'SG', dial: '+65', label: '🇸🇬 +65' },
];

type Step = 'phone' | 'otp' | 'profile';

export function AuthModal({ onClose }: { onClose: () => void }) {
  const { sendOtp, verifyOtp, updateProfile } = useAuth();

  const [step, setStep] = useState<Step>('phone');
  const [dial, setDial] = useState('+91');
  const [country, setCountry] = useState('IN');
  const [national, setNational] = useState('');
  const [code, setCode] = useState('');
  const [devCode, setDevCode] = useState<string | undefined>();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const fullPhone = `${dial}${national.replace(/[^0-9]/g, '')}`;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (national.replace(/[^0-9]/g, '').length < 6) {
      setError('Enter a valid phone number');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await sendOtp(fullPhone, country);
      setDevCode(res.devCode);
      setStep('otp');
    } catch (err: any) {
      setError(err?.code === 'RATE_LIMITED' ? 'Too many requests — wait a moment.' : err?.message || 'Could not send code');
    } finally {
      setBusy(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length !== 6) {
      setError('Enter the 6-digit code');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const res = await verifyOtp(fullPhone, code);
      if (res.isNewUser) {
        setStep('profile');
      } else {
        onClose();
      }
    } catch (err: any) {
      const m: Record<string, string> = {
        INVALID_OTP: 'Invalid code. Try again.',
        EXPIRED_OTP: 'Code expired. Request a new one.',
        MAX_ATTEMPTS: 'Too many attempts. Request a new code.',
      };
      setError(m[err?.code] || err?.message || 'Verification failed');
      setCode('');
    } finally {
      setBusy(false);
    }
  };

  const handleProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter your name and a valid email');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await updateProfile({ name: `${firstName.trim()} ${lastName.trim()}`.trim(), email: email.trim() });
      onClose();
    } catch (err: any) {
      setError(err?.code === 'EMAIL_IN_USE' ? 'That email is already in use.' : err?.message || 'Could not save details');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Close">
          ✕
        </button>

        {step === 'phone' && (
          <form onSubmit={handleSendOtp}>
            <h2 className="modal-title">Log in or sign up</h2>
            <p className="modal-sub">We&apos;ll text you a verification code. New here? You&apos;ll set up your profile next.</p>
            <div className="phone-row">
              <select
                value={dial}
                onChange={(e) => {
                  const sel = DIAL_CODES.find((d) => d.dial === e.target.value)!;
                  setDial(sel.dial);
                  setCountry(sel.code);
                }}
                className="dial-select"
                aria-label="Country code"
              >
                {DIAL_CODES.map((d) => (
                  <option key={d.code} value={d.dial}>
                    {d.label}
                  </option>
                ))}
              </select>
              <input
                className="modal-input"
                type="tel"
                placeholder="Phone number"
                value={national}
                onChange={(e) => setNational(e.target.value)}
                autoFocus
              />
            </div>
            {error && <p className="modal-error">{error}</p>}
            <button className="btn btn-primary modal-submit" disabled={busy}>
              {busy ? 'Sending…' : 'Continue'}
            </button>
          </form>
        )}

        {step === 'otp' && (
          <form onSubmit={handleVerify}>
            <h2 className="modal-title">Enter your code</h2>
            <p className="modal-sub">
              Sent to <b>{fullPhone}</b>.{' '}
              <button type="button" className="link-btn" onClick={() => { setStep('phone'); setCode(''); setError(''); }}>
                Change
              </button>
            </p>
            <input
              className="modal-input otp-input"
              inputMode="numeric"
              maxLength={6}
              placeholder="••••••"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, '').slice(0, 6))}
              autoFocus
            />
            {devCode && (
              <p className="dev-hint">
                Dev mode — your code is <b>{devCode}</b>
              </p>
            )}
            {error && <p className="modal-error">{error}</p>}
            <button className="btn btn-primary modal-submit" disabled={busy}>
              {busy ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {step === 'profile' && (
          <form onSubmit={handleProfile}>
            <h2 className="modal-title">Finish signing up</h2>
            <p className="modal-sub">Tell us who you are.</p>
            <div className="phone-row">
              <input className="modal-input" placeholder="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} autoFocus />
              <input className="modal-input" placeholder="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
            <input className="modal-input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            {error && <p className="modal-error">{error}</p>}
            <button className="btn btn-primary modal-submit" disabled={busy}>
              {busy ? 'Saving…' : 'Agree and continue'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
