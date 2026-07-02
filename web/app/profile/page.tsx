'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useAuth, useClerk } from '@clerk/nextjs';
import { ensureStayonSession, stayon, clearStayonSession } from '@/lib/stayonClient';

export default function ProfilePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { openSignIn, signOut } = useClerk();

  const [me, setMe] = useState<any>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        if (!(await ensureStayonSession(() => getToken()))) return;
        const u = await stayon.me();
        setMe(u);
        setName(u.name || '');
        setEmail(u.email || '');
      } catch {
        setError('Could not load your profile.');
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg('');
    setError('');
    try {
      await stayon.updateProfile({ name: name.trim(), email: email.trim() });
      setMsg('Saved ✓');
    } catch (err: any) {
      setError(err?.code === 'EMAIL_IN_USE' ? 'That email is already in use.' : err?.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  };

  if (isLoaded && !isSignedIn) {
    return (
      <div className="container empty">
        <h2>Log in to see your profile</h2>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openSignIn()}>
          Log in
        </button>
      </div>
    );
  }

  const initial = (me?.name || '?').trim().charAt(0).toUpperCase();

  return (
    <section className="section">
      <div className="container profile-wrap">
        <div className="profile-head">
          <span className="avatar avatar-lg">{initial}</span>
          <div>
            <h2>{me?.name || 'Your profile'}</h2>
            <p className="muted">{me?.phone || me?.email || ''}</p>
          </div>
        </div>

        {/* Quick links — mirrors the app's profile menu */}
        <div className="profile-links">
          <Link href="/trips" className="profile-link">🧳 My trips</Link>
          <Link href="/wishlists" className="profile-link">❤️ Wishlists</Link>
          <Link href="/messages" className="profile-link">💬 Messages</Link>
          <Link href="/host" className="profile-link">🏠 Host dashboard</Link>
        </div>

        {/* Edit details */}
        <form className="host-form" onSubmit={save}>
          <h3>Personal info</h3>
          <label className="hf-field">
            <span>Full name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label className="hf-field">
            <span>Email</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          {msg && <p className="hf-note">{msg}</p>}
          {error && <p className="modal-error">{error}</p>}
          <div className="hf-actions">
            <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
          </div>
        </form>

        <button
          className="btn btn-ghost"
          style={{ width: '100%' }}
          onClick={async () => {
            clearStayonSession();
            await signOut();
          }}
        >
          Log out
        </button>
      </div>
    </section>
  );
}
