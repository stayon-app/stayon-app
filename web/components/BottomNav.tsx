'use client';

// Mobile bottom tab bar — mirrors the app's guest tabs:
// Explore · Wishlists · Trips · Messages · Profile. Hidden on desktop (CSS).

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const TABS = [
  { href: '/', label: 'Explore', icon: SearchIcon },
  { href: '/wishlists', label: 'Wishlists', icon: HeartIcon },
  { href: '/trips', label: 'Trips', icon: TripIcon },
  { href: '/messages', label: 'Messages', icon: ChatIcon },
  { href: '/profile', label: 'Profile', icon: UserIcon },
];

export function BottomNav() {
  const path = usePathname();
  return (
    <nav className="bottom-nav" aria-label="Main">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = href === '/' ? path === '/' || path === '/search' : path.startsWith(href);
        return (
          <Link key={href} href={href} className={`bn-tab ${active ? 'active' : ''}`}>
            <Icon />
            <span>{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function SearchIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
    </svg>
  );
}
function HeartIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M12 21s-7.5-4.9-9.7-9.1C.7 8.7 2.6 5 6.2 5c2 0 3.5 1 4.4 2.4h2.8C14.3 6 15.8 5 17.8 5c3.6 0 5.5 3.7 3.9 6.9C19.5 16.1 12 21 12 21z" />
    </svg>
  );
}
function TripIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-6h6v6" />
    </svg>
  );
}
function ChatIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M21 12a8 8 0 0 1-8 8H4l1.5-3A8 8 0 1 1 21 12z" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6 8-6s8 2 8 6" />
    </svg>
  );
}
