'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { GlobeMenu } from './GlobeMenu';

export function Header() {
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  // On the host surface, the guest search (nav + scroll pill) does not belong.
  const isHost = pathname?.startsWith('/host') ?? false;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
          <div className="header-center">
            <nav className="header-nav" aria-label="Primary">
              <Link href="/search">Stays</Link>
              <Link href="/map">Explore</Link>
              <Link href="/trips">Trips</Link>
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
            <span className="host-word-full">Become a host</span>
            <span className="host-word-short">Host</span>
          </Link>
          <GlobeMenu />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn btn-ghost">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-primary hide-sm">Sign up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <Link href="/trips" className="host-link">
              Trips
            </Link>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
