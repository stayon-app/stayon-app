'use client';

import { useState } from 'react';
import { useAuth } from './AuthProvider';
import { AuthModal } from './AuthModal';

export function AuthButton() {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const [modalOpen, setModalOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  if (loading) {
    return <span className="auth-skeleton" aria-hidden />;
  }

  if (isAuthenticated && user) {
    const initial = (user.name || user.phone || '?').trim().charAt(0).toUpperCase();
    return (
      <div className="account-wrap">
        <button className="account-btn" onClick={() => setMenuOpen((o) => !o)} aria-label="Account menu">
          <span className="avatar">{initial}</span>
          <span className="account-name">{user.name?.split(' ')[0] || 'Account'}</span>
        </button>
        {menuOpen && (
          <div className="account-menu" onMouseLeave={() => setMenuOpen(false)}>
            <div className="account-menu-head">
              <b>{user.name || 'StayOn guest'}</b>
              <span>{user.email || user.phone}</span>
            </div>
            <button
              className="account-menu-item"
              onClick={async () => {
                setMenuOpen(false);
                await logout();
              }}
            >
              Log out
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
        Log in
      </button>
      {modalOpen && <AuthModal onClose={() => setModalOpen(false)} />}
    </>
  );
}
