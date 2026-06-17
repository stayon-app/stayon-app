import React, { useEffect, useRef, useState } from 'react';
import { SECTIONS, CATEGORIES, type Listing, type Section } from './data';

export default function App() {
  const [promo, setPromo] = useState(true);
  return (
    <div className="page">
      <Header />
      <CategoryBar />
      <main className="container">
        {SECTIONS.map((s) => <ListingRow key={s.id} section={s} />)}
      </main>
      <Footer />
      {promo && <PromoModal onClose={() => setPromo(false)} />}
    </div>
  );
}

/* ─────────────────────────── Header ─────────────────────────── */
function Header() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);
  return (
    <header className={`hdr${scrolled ? ' is-scrolled' : ''}`}>
      <div className="hdr-inner container">
        <a className="brand" href="#">
          <span className="brand-mark">◐</span>
          <span className="brand-name">StayOn</span>
        </a>

        <nav className="hdr-nav">
          <a className="hdr-tab is-active" href="#"><span className="hdr-tab-emoji">🏠</span> Homes</a>
          <a className="hdr-tab" href="#"><span className="hdr-tab-emoji">🎈</span> Experiences <span className="tag-new">NEW</span></a>
          <a className="hdr-tab" href="#"><span className="hdr-tab-emoji">🛎️</span> Services <span className="tag-new">NEW</span></a>
        </nav>

        <div className="hdr-right">
          <a className="hdr-host" href="#">Become a host</a>
          <button className="hdr-globe" aria-label="Language and region">🌐</button>
          <button className="hdr-menu" aria-label="Menu">
            <span className="hdr-menu-lines">≡</span>
            <span className="hdr-menu-av">🧑</span>
          </button>
        </div>
      </div>
      <SearchBar compact={scrolled} />
    </header>
  );
}

/* ─────────────────────────── Search pill ─────────────────────────── */
function SearchBar({ compact }: { compact: boolean }) {
  return (
    <div className={`search-wrap${compact ? ' is-compact' : ''}`}>
      <div className="search-pill">
        <button className="search-seg seg-where">
          <span className="seg-label">Where</span>
          <span className="seg-value muted">Search destinations</span>
        </button>
        <span className="seg-divider" />
        <button className="search-seg">
          <span className="seg-label">Check in</span>
          <span className="seg-value muted">Add dates</span>
        </button>
        <span className="seg-divider" />
        <button className="search-seg">
          <span className="seg-label">Check out</span>
          <span className="seg-value muted">Add dates</span>
        </button>
        <span className="seg-divider" />
        <button className="search-seg seg-who">
          <div>
            <span className="seg-label">Who</span>
            <span className="seg-value muted">Add guests</span>
          </div>
          <span className="search-go" aria-label="Search">🔍</span>
        </button>
      </div>
    </div>
  );
}

/* ─────────────────────────── Category bar ─────────────────────────── */
function CategoryBar() {
  const [active, setActive] = useState('all');
  return (
    <div className="catbar">
      <div className="catbar-inner container">
        {CATEGORIES.map((c) => (
          <button
            key={c.id}
            className={`cat${c.id === active ? ' is-active' : ''}`}
            onClick={() => setActive(c.id)}
          >
            <span className="cat-icon">{c.icon}</span>
            <span className="cat-label">{c.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ─────────────────────────── Listing row (horizontal, arrow-scrolled) ─────────────────────────── */
function ListingRow({ section }: { section: Section }) {
  const scroller = useRef<HTMLDivElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });

  const updateEdges = () => {
    const el = scroller.current;
    if (!el) return;
    setEdge({
      start: el.scrollLeft <= 4,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
    });
  };
  useEffect(() => { updateEdges(); }, []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.round(el.clientWidth * 0.85), behavior: 'smooth' });
  };

  return (
    <section className="row">
      <div className="row-head">
        <h2 className="row-title">{section.title} <span className="row-chevron">›</span></h2>
        <div className="row-arrows">
          <button className="arrow" disabled={edge.start} onClick={() => scrollBy(-1)} aria-label="Scroll left">‹</button>
          <button className="arrow" disabled={edge.end} onClick={() => scrollBy(1)} aria-label="Scroll right">›</button>
        </div>
      </div>
      <div className="row-track" ref={scroller} onScroll={updateEdges}>
        {section.items.map((it) => <Card key={it.id} listing={it} currency={section.currency} />)}
      </div>
    </section>
  );
}

/* ─────────────────────────── Card (the framed, rounded look) ─────────────────────────── */
function Card({ listing, currency }: { listing: Listing; currency: string }) {
  const [idx, setIdx] = useState(0);
  const [fav, setFav] = useState(false);
  const total = listing.images.length;
  const go = (e: React.MouseEvent, dir: 1 | -1) => {
    e.preventDefault();
    setIdx((i) => (i + dir + total) % total);
  };
  return (
    <a className="card" href="#">
      <div className="card-media">
        <img className="card-img" src={listing.images[idx]} alt={listing.title} loading="lazy" draggable={false} />

        {listing.guestFavourite && <span className="badge">Guest favourite</span>}
        {!listing.guestFavourite && listing.badge && <span className="badge">{listing.badge}</span>}

        <button
          className={`heart${fav ? ' is-on' : ''}`}
          aria-label="Save"
          onClick={(e) => { e.preventDefault(); setFav((f) => !f); }}
        >
          {fav ? '♥' : '♡'}
        </button>

        {total > 1 && (
          <>
            <button className="card-nav prev" onClick={(e) => go(e, -1)} aria-label="Previous photo">‹</button>
            <button className="card-nav next" onClick={(e) => go(e, 1)} aria-label="Next photo">›</button>
            <div className="dots">
              {listing.images.map((_, i) => <span key={i} className={`dot${i === idx ? ' on' : ''}`} />)}
            </div>
          </>
        )}
      </div>

      <div className="card-body">
        <div className="card-line">
          <span className="card-title">{listing.title}</span>
          <span className="card-rating">★ {listing.rating.toFixed(2)}</span>
        </div>
        <div className="card-price">
          <b>{currency}{listing.price.toLocaleString()}</b> for {listing.nights} nights
        </div>
      </div>
    </a>
  );
}

/* ─────────────────────────── Promo modal ─────────────────────────── */
function PromoModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-media">
          <img
            src="https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=900&h=620&fit=crop&q=80"
            alt=""
            draggable={false}
          />
          <button className="modal-close" onClick={onClose} aria-label="Close">✕</button>
        </div>
        <div className="modal-body">
          <h3>Save 10% on a summertime trip</h3>
          <p>Book within 7 days and save up to ₹2,000 on your next stay. <a href="#">Terms apply</a></p>
          <button className="btn-primary" onClick={onClose}>Log in to claim offer</button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────────── Footer ─────────────────────────── */
function Footer() {
  const cols = [
    { h: 'Support', links: ['Help Centre', 'Safety information', 'Cancellation options', 'Report a concern'] },
    { h: 'Hosting', links: ['StayOn your home', 'Host resources', 'Community forum', 'Hosting responsibly'] },
    { h: 'StayOn', links: ['Newsroom', 'New features', 'Careers', 'Investors'] },
  ];
  return (
    <footer className="footer">
      <div className="container footer-grid">
        {cols.map((c) => (
          <div key={c.h} className="footer-col">
            <div className="footer-h">{c.h}</div>
            {c.links.map((l) => <a key={l} className="footer-link" href="#">{l}</a>)}
          </div>
        ))}
        <div className="footer-col footer-brandcol">
          <div className="brand"><span className="brand-mark">◐</span><span className="brand-name">StayOn</span></div>
          <p className="footer-tag">Stay beyond ordinary.</p>
        </div>
      </div>
      <div className="container footer-bar">
        <span>© 2026 StayOn, Inc.</span>
        <span className="footer-bar-links">
          <a href="#">Privacy</a> · <a href="#">Terms</a> · <a href="#">Sitemap</a>
        </span>
      </div>
    </footer>
  );
}
