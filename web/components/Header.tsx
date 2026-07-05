'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import { GlobeMenu } from './GlobeMenu';
import { usePrefs } from './PrefsProvider';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { t } = usePrefs();
  // On the host surface, the guest search (nav + scroll pill) does not belong.
  const isHost = pathname?.startsWith('/host') ?? false;
  // /search has its own sticky search bar — never duplicate it with the pill.
  const isSearch = pathname?.startsWith('/search') ?? false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Auth screens are pure splash + card — no site chrome at all.
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')) return null;

  return (
    <header className={`site-header${scrolled ? ' is-scrolled' : ''}`}>
      <div className="container">
        <Link href="/" className="brand" aria-label="StayOn home">
          <span className="brand-name">Stay<span className="brand-on">On</span></span>
          <span className="brand-tag">stay beyond ordinary</span>
        </Link>
        {/* Guest search (nav + scroll pill) — hidden entirely on the host site.
            Both are always mounted; CSS shows one based on `is-scrolled`
            (avoids remounting on every scroll, which can crash React's DOM diff). */}
        {!isHost && (
          <div className={`header-center${isSearch ? ' no-pill' : ''}`}>
            <nav className="header-nav" aria-label="Primary">
              <Link href="/search">{t('Stays')}</Link>
              <Link href="/explore">{t('Explore')}</Link>
              <Link href="/saved">{t('Saved')}</Link>
              <Link href="/trips">{t('Trips')}</Link>
            </nav>
            <Link href="/search" className="header-search-pill" aria-label="Search stays" tabIndex={scrolled ? 0 : -1}>
              <span className="hsp-text">Anywhere</span>
              <span className="hsp-sep" />
              <span className="hsp-text">Any week</span>
              <span className="hsp-sep" />
              <span className="hsp-muted">Add guests</span>
              <span className="hsp-btn">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3-3" /></svg>
              </span>
            </Link>
          </div>
        )}
        <div className="header-actions">
          <Link href="/host" className="host-link">
            <span className="host-word-full">{t('Become a host')}</span>
            <span className="host-word-short">{t('Host')}</span>
          </Link>
          <GlobeMenu />
          <SignedOut>
            {/* Real pages (not modals) so Log in / Sign up always navigate. */}
            <Link href="/sign-in" className="btn btn-ghost">{t('Log in')}</Link>
            <Link href="/sign-up" className="btn btn-primary hide-sm">{t('Sign up')}</Link>
          </SignedOut>
          <SignedIn>
            <Link href="/trips" className="host-link">
              {t('Trips')}
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
