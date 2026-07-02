'use client';

import { Suspense, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth, useClerk, useUser } from '@clerk/nextjs';
import { ensureStayonSession, stayon } from '@/lib/stayonClient';

interface Thread {
  id: string;
  listing_title: string;
  guest_id: string;
  guest_name: string;
  host_id: string;
  last_at?: string;
}
interface Msg {
  id: string;
  sender: 'guest' | 'host';
  text: string;
  createdAt: string;
}

function MessagesInner() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const { user } = useUser();
  const { openSignIn } = useClerk();
  const params = useSearchParams();

  const [threads, setThreads] = useState<Thread[]>([]);
  const [activeId, setActiveId] = useState<string | null>(params.get('thread'));
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState('');
  const [meId, setMeId] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement>(null);

  // Load threads
  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      if (isLoaded) setLoading(false);
      return;
    }
    (async () => {
      try {
        if (!(await ensureStayonSession(() => getToken()))) return;
        const me = await stayon.me();
        setMeId(me.id);
        const res = await stayon.threads();
        const items = (res.items || []).sort(
          (a: Thread, b: Thread) => (b.last_at || '').localeCompare(a.last_at || ''),
        );
        setThreads(items);
        if (!activeId && items[0]) setActiveId(items[0].id);
      } catch {
        setError('Could not load your messages.');
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Load messages for the active thread
  const loadMsgs = useCallback(async (id: string) => {
    try {
      const res = await stayon.messages(id);
      setMsgs(res.items || []);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (activeId && isSignedIn) loadMsgs(activeId);
  }, [activeId, isSignedIn, loadMsgs]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() || !activeId || sending) return;
    setSending(true);
    setError('');
    try {
      await stayon.sendMessage(activeId, text.trim());
      setText('');
      await loadMsgs(activeId);
    } catch (err: any) {
      setError(
        err?.code === 'CONTACT_BLOCKED'
          ? 'You can share contact details once the booking is confirmed.'
          : err?.message || 'Could not send.',
      );
    } finally {
      setSending(false);
    }
  };

  if (!isLoaded || loading) {
    return <div className="container section"><p className="muted">Loading messages…</p></div>;
  }

  if (!isSignedIn) {
    return (
      <div className="container empty">
        <h2>Log in to see your messages</h2>
        <p>Chat with hosts about your stays.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => openSignIn()}>
          Log in
        </button>
      </div>
    );
  }

  const active = threads.find((t) => t.id === activeId);
  const amHost = active ? active.host_id === meId : false;

  return (
    <section className="section">
      <div className="container">
        <div className="section-head"><h2>Messages</h2><span className="muted">{threads.length} conversations</span></div>
        {threads.length === 0 ? (
          <div className="empty">
            <h2>No messages yet</h2>
            <p>Open a stay and tap “Message host” to start a conversation.</p>
          </div>
        ) : (
          <div className="chat-layout">
            <aside className="thread-list">
              {threads.map((t) => (
                <button
                  key={t.id}
                  className={`thread-item ${t.id === activeId ? 'active' : ''}`}
                  onClick={() => setActiveId(t.id)}
                >
                  <b>{t.listing_title || 'Stay'}</b>
                  <span>{t.host_id === meId ? `Guest: ${t.guest_name || '—'}` : 'Host'}</span>
                </button>
              ))}
            </aside>
            <div className="chat-panel">
              {active ? (
                <>
                  <div className="chat-head">
                    <b>{active.listing_title || 'Stay'}</b>
                    <span className="muted">{amHost ? `with ${active.guest_name || 'guest'}` : 'with the host'}</span>
                  </div>
                  <div className="chat-msgs">
                    {msgs.length === 0 && <p className="muted" style={{ textAlign: 'center' }}>Say hello 👋</p>}
                    {msgs.map((m) => {
                      const mine = (m.sender === 'host') === amHost;
                      return (
                        <div key={m.id} className={`bubble ${mine ? 'mine' : ''}`}>{m.text}</div>
                      );
                    })}
                    <div ref={endRef} />
                  </div>
                  {error && <p className="modal-error" style={{ padding: '0 16px' }}>{error}</p>}
                  <form className="chat-input" onSubmit={send}>
                    <input
                      placeholder="Write a message…"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                    />
                    <button className="btn btn-primary" disabled={sending || !text.trim()}>
                      {sending ? '…' : 'Send'}
                    </button>
                  </form>
                </>
              ) : (
                <p className="muted" style={{ padding: 24 }}>Pick a conversation</p>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="container section"><p className="muted">Loading…</p></div>}>
      <MessagesInner />
    </Suspense>
  );
}
