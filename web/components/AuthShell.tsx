import Link from 'next/link';
import { RotatingBg } from './RotatingBg';
import { AuthCaptions } from './AuthCaptions';

// Branded frame for /sign-in and /sign-up: full-screen split — an animated
// splash panel (rotating scenery + rotating captions) on the left, the auth
// card on the right. Header/footer are hidden on these routes, so the logo
// here links back home.
const AUTH_BG = [
  'https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1514282401047-d79a71a590e8?w=1400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1400&q=80&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1533105079780-92b9be482077?w=1400&q=80&auto=format&fit=crop',
];

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <section className="auth-split">
      {/* Splash panel — motion backdrop + animated captions */}
      <div className="auth-visual">
        <RotatingBg images={AUTH_BG} interval={6000} className="auth-visual-bg" />
        <div className="auth-visual-content">
          <Link href="/" className="brand-name auth-brand" aria-label="StayOn home">
            Stay<span className="brand-on">On</span>
          </Link>
          <AuthCaptions />
        </div>
      </div>

      {/* Auth card panel */}
      <div className="auth-panel">
        <div className="auth-panel-head">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
        {children}
      </div>
    </section>
  );
}
