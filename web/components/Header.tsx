import Link from 'next/link';
import { AuthButton } from './AuthButton';
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
          <AuthButton />
        </div>
      </div>
    </header>
  );
}
