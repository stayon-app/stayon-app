import Link from 'next/link';

export function Header() {
  return (
    <header className="site-header">
      <div className="container">
        <Link href="/" className="brand" aria-label="StayOn home">
          <span className="brand-name">Stay On</span>
          <span className="brand-tag">stay beyond ordinary</span>
        </Link>
        <div className="header-actions">
          <span className="fee-pill">0% fee · keep 100%</span>
          <Link href="/search" className="btn btn-ghost">
            Explore stays
          </Link>
        </div>
      </div>
    </header>
  );
}
