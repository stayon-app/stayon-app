'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useClerk } from '@clerk/nextjs';
import { ensureStayonSession, stayon } from '@/lib/stayonClient';

export function MessageHostButton({ listingId }: { listingId: string }) {
  const { isSignedIn, getToken } = useAuth();
  const { openSignIn } = useClerk();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const open = async () => {
    if (!isSignedIn) {
      openSignIn();
      return;
    }
    setBusy(true);
    try {
      await ensureStayonSession(() => getToken());
      const t = await stayon.threadOpen(listingId);
      router.push(`/messages?thread=${t.id}`);
    } catch {
      setBusy(false);
    }
  };

  return (
    <button className="btn btn-ghost msg-host-btn" onClick={open} disabled={busy}>
      💬 {busy ? 'Opening…' : 'Message host'}
    </button>
  );
}
