import Link from 'next/link';
import { NewsletterSignup } from './NewsletterSignup';
import { WizIcon } from './WizIcon';

export function Footer() {
  return (
    <footer className="site-footer">
      {/* Newsletter strip */}
      <div className="footer-news">
        <div className="container footer-news-inner">
          <div className="footer-news-copy">
            <h3>Get travel inspiration in your inbox</h3>
            <p>New destinations, guest-favourite stays and seasonal deals — no spam, unsubscribe anytime.</p>
          </div>
          <NewsletterSignup />
        </div>
      </div>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
            <span className="brand-name">Stay<span className="brand-on">On</span></span>
            <p>Premium, hand-picked stays — booked direct with no booking fees. The price you see is the price you pay.</p>
            <div className="footer-badges">
              <span className="footer-badge"><WizIcon name="star" size={14} /> 4.9 average stay rating</span>
              <span className="footer-badge"><WizIcon name="lock" size={14} /> Secure payments</span>
            </div>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link href="/search">Search stays</Link>
            <Link href="/map">Map search</Link>
            <Link href="/trips">Your trips</Link>
          </div>
          <div className="footer-col">
            <h4>Company</h4>
            <Link href="/host">Become a host</Link>
            <span>About StayOn</span>
            <span>Careers</span>
          </div>
          <div className="footer-col">
            <h4>Trust &amp; safety</h4>
            <span>Identity-verified accounts</span>
            <span>Secure on-platform payments</span>
            <span>24/7 support</span>
          </div>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} StayOn · Stay beyond ordinary</span>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="X">𝕏</a>
            <a href="#" aria-label="Instagram">◎</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
