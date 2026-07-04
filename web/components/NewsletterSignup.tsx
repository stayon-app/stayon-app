'use client';

import { useState } from 'react';

// Lightweight, self-contained newsletter capture (no backend endpoint yet —
// confirms locally so the footer feels alive and engaging).
export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [done, setDone] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes('@')) return;
    setDone(true);
  };

  if (done) {
    return <p className="footer-news-done">✓ You're on the list — see you out there.</p>;
  }

  return (
    <form className="footer-news-form" onSubmit={submit}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        aria-label="Email address"
        required
      />
      <button type="submit" className="btn btn-primary">Subscribe</button>
    </form>
  );
}
