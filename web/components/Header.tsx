import Link from 'next/link';
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/nextjs';
import { GlobeMenu } from './GlobeMenu';

export function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label="StayOn home">
          <span className="brand-name">Stay On</span>
          <span className="brand-tag">stay beyond ordinary</span>
        </Link>
        <div className="header-actions">
          <Link href="/host" className="host-link">
            Become a host
          </Link>
          <GlobeMenu />
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn btn-ghost">Log in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn btn-primary">Sign up</button>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
        </div>
      </div>
    </header>
  );
}
