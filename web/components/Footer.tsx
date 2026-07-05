<<<<<<< Updated upstream
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { NewsletterSignup } from './NewsletterSignup';
import { WizIcon } from './WizIcon';
import { usePrefs } from './PrefsProvider';
=======
import Link from 'next/link';
>>>>>>> Stashed changes

export function Footer() {
  const { t } = usePrefs();
  const pathname = usePathname();
  // Auth screens are pure splash + card — no footer.
  if (pathname?.startsWith('/sign-in') || pathname?.startsWith('/sign-up')) return null;
  return (
    <footer className="site-footer">
      {/* Newsletter strip */}
      <div className="footer-news">
        <div className="container footer-news-inner">
          <div className="footer-news-copy">
            <h3>{t('Get travel inspiration in your inbox')}</h3>
            <p>New destinations, guest-favourite stays and seasonal deals — no spam, unsubscribe anytime.</p>
          </div>
          <NewsletterSignup />
        </div>
      </div>

      <div className="container">
        <div className="footer-grid">
          <div className="footer-col footer-brand">
<<<<<<< Updated upstream
            <span className="brand-name">Stay<span className="brand-on">On</span></span>
            <p>Premium, hand-picked stays — booked direct with no booking fees. The price you see is the price you pay.</p>
            <div className="footer-badges">
              <span className="footer-badge"><WizIcon name="star" size={14} /> 4.9 average stay rating</span>
              <span className="footer-badge"><WizIcon name="lock" size={14} /> Secure payments</span>
            </div>
          </div>
          <div className="footer-col">
            <h4>{t('Explore')}</h4>
            <Link href="/search">{t('Search stays')}</Link>
            <Link href="/map">{t('Map search')}</Link>
            <Link href="/trips">{t('Your trips')}</Link>
          </div>
          <div className="footer-col">
            <h4>{t('Company')}</h4>
            <Link href="/host">{t('Become a host')}</Link>
            <span>{t('About StayOn')}</span>
            <span>{t('Careers')}</span>
          </div>
          <div className="footer-col">
            <h4>{t('Trust & safety')}</h4>
            <span>{t('Identity-verified accounts')}</span>
            <span>{t('Secure on-platform payments')}</span>
            <span>{t('24/7 support')}</span>
          </div>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} StayOn · Stay beyond ordinary</span>
          <div className="footer-social">
            <a href="#" aria-label="Facebook">f</a>
            <a href="#" aria-label="X">𝕏</a>
            <a href="#" aria-label="Instagram">◎</a>
          </div>
=======
            <span className="brand-name">Stay On</span>
            <p>Book direct, zero platform fees. Guests pay less, hosts keep 100%.</p>
          </div>
          <div className="footer-col">
            <h4>Explore</h4>
            <Link href="/search">Search stays</Link>
            <Link href="/map">Map search</Link>
            <Link href="/host">Become a host</Link>
          </div>
          <div className="footer-col">
            <h4>Hosting</h4>
            <Link href="/host">Host dashboard</Link>
            <span>0% commission, always</span>
            <span>Verified guests</span>
          </div>
          <div className="footer-col">
            <h4>Trust</h4>
            <span>Identity-verified accounts</span>
            <span>Secure on-platform payments</span>
            <span>24/7 support</span>
          </div>
        </div>
        <div className="footer-legal">
          <span>© {new Date().getFullYear()} StayOn · 0% commission, always.</span>
          <span>Guests pay less · Hosts keep 100%</span>
>>>>>>> Stashed changes
        </div>
      </div>
    </footer>
  );
}
