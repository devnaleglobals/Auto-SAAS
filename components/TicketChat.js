'use client';
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

const time = (d) => new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Kolkata' });
const initials = (n) => String(n || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();

// Chat bubbles. `me` = the side shown on the right ('CLIENT' for the client view, 'ADMIN' for the admin view).
function Bubbles({ messages, me }) {
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }); }, [messages.length]);
  return (
    <div className="flex-1 space-y-4 overflow-y-auto bg-canvas/60 px-4 py-5 sm:px-6">
      {messages.map((m) => {
        if (m.authorType === 'SYSTEM') return <p key={m.id} className="text-center text-xs text-slate">{m.body} · {time(m.createdAt)}</p>;
        const mine = m.authorType === me;
        return (
          <div key={m.id} className={`flex items-end gap-2.5 ${mine ? 'flex-row-reverse' : ''}`}>
            <span aria-hidden className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${m.authorType === 'ADMIN' ? 'bg-navy text-marigold' : 'bg-marigold text-navy'}`}>{initials(m.authorName)}</span>
            <div className={`max-w-[78%] ${mine ? 'items-end text-right' : ''} flex flex-col`}>
              <p className="mb-1 text-xs text-slate">
                <strong className="text-ink">{m.authorName}</strong>{m.authorType === 'ADMIN' && me === 'CLIENT' ? ' · Support' : ''}{m.internal ? ' · internal note' : ''} · {time(m.createdAt)}
              </p>
              <div className={`whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed ${
                m.internal ? 'border border-dashed border-marigold bg-marigold/10 text-ink'
                  : mine ? 'rounded-br-md bg-navy text-white dark:bg-ink dark:text-navy' : 'rounded-bl-md border border-line bg-surface text-ink'}`}>{m.body}</div>
            </div>
          </div>
        );
      })}
      <div ref={end} />
    </div>
  );
}

// Message box at the bottom of the chat. Enter sends, Shift+Enter adds a new line.
function Composer({ placeholder, busy, onSend, extra, sendLabel = 'Send' }) {
  const [body, setBody] = useState('');
  async function submit(e) {
    e?.preventDefault();
    if (!body.trim() || busy) return;
    if (await onSend(body.trim())) setBody('');
  }
  return (
    <form onSubmit={submit} className="border-t border-line bg-surface p-3 sm:p-4">
      {extra}
      <div className="flex items-end gap-2">
        <textarea rows={2} value={body} onChange={(e) => setBody(e.target.value)} placeholder={placeholder} aria-label="Message" maxLength={5000}
          onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit(); } }}
          className="field max-h-48 min-h-[44px] flex-1 resize-y" />
        <button disabled={busy || !body.trim()} className="btn-dark h-11 shrink-0 px-5">{busy && <Spinner />}{sendLabel}</button>
      </div>
      <p className="mt-1.5 text-[11px] text-slate">Enter to send · Shift+Enter for a new line</p>
    </form>
  );
}

async function post(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return [res.ok, await res.json().catch(() => ({}))];
}

// Keeps the conversation fresh while the page is open.
function useLiveRefresh(seconds = 20) {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === 'visible') router.refresh(); }, seconds * 1000);
    return () => clearInterval(t);
  }, [router, seconds]);
}

// ---------------- Client view ----------------
export function ClientTicketChat({ ticket, messages }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState('');
  useLiveRefresh();
  const closed = ['CLOSED', 'RESOLVED'].includes(ticket.status);
  async function send(body) {
    setBusy('send');
    const [ok, d] = await post(`/api/tickets/${ticket.id}/messages`, 'POST', { body });
    setBusy('');
    if (!ok) { toast(d.error, 'bad'); return false; }
    router.refresh();
    return true;
  }
  async function setStatus(status) {
    setBusy(status);
    const [ok, d] = await post(`/api/tickets/${ticket.id}`, 'PATCH', { status });
    setBusy('');
    toast(ok ? (status === 'CLOSED' ? 'Ticket closed' : 'Ticket reopened') : d.error, ok ? 'ok' : 'bad');
    if (ok) router.refresh();
  }
  return (
    <section className="card flex h-[calc(100vh-230px)] min-h-[480px] flex-col overflow-hidden">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
        <div className="min-w-0">
          <p className="truncate font-semibold">#{ticket.number} {ticket.subject}</p>
          <p className="text-xs text-slate">{ticket.categoryLabel} · {ticket.statusLabel}</p>
        </div>
        {closed
          ? <button onClick={() => setStatus('OPEN')} disabled={!!busy} className="btn-ghost btn-sm">Reopen</button>
          : <button onClick={() => setStatus('CLOSED')} disabled={!!busy} className="btn-ghost btn-sm">{busy === 'CLOSED' && <Spinner />}Mark as solved</button>}
      </header>
      <Bubbles messages={messages} me="CLIENT" />
      <Composer placeholder={closed ? 'Write to reopen this ticket…' : 'Write a reply…'} busy={busy === 'send'} onSend={send} />
    </section>
  );
}

// ---------------- Admin view ----------------
export function AdminTicketChat({ ticket, messages }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [mode, setMode] = useState('reply');
  const [after, setAfter] = useState('PENDING');
  const [busy, setBusy] = useState(false);
  useLiveRefresh();
  async function send(body) {
    setBusy(true);
    const internal = mode === 'note';
    const [ok, d] = await post(`/api/admin/tickets/${ticket.id}/messages`, 'POST', { body, internal, status: internal ? undefined : after });
    setBusy(false);
    toast(ok ? (internal ? 'Note added' : 'Reply sent to the client') : d.error, ok ? 'ok' : 'bad');
    if (ok) router.refresh();
    return ok;
  }
  const tab = (k, label) => (
    <button type="button" onClick={() => setMode(k)} aria-pressed={mode === k}
      className={`rounded-md px-3 py-1 text-xs font-semibold ${mode === k ? (k === 'note' ? 'bg-marigold/30 text-ink' : 'bg-navy text-white') : 'text-slate hover:bg-canvas'}`}>{label}</button>
  );
  return (
    <section className="card flex h-[calc(100vh-200px)] min-h-[520px] flex-col overflow-hidden">
      <Bubbles messages={messages} me="ADMIN" />
      <Composer
        busy={busy}
        onSend={send}
        sendLabel={mode === 'note' ? 'Add note' : 'Send'}
        placeholder={mode === 'note' ? 'Internal note: only admins see this…' : `Reply to ${ticket.name}… (emailed to ${ticket.email})`}
        extra={(
          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 rounded-lg bg-canvas p-1">{tab('reply', 'Reply to client')}{tab('note', 'Internal note')}</div>
            {mode === 'reply' && (
              <label className="flex items-center gap-2 text-xs text-slate">After sending
                <select value={after} onChange={(e) => setAfter(e.target.value)} className="field w-auto py-1 text-xs">
                  <option value="PENDING">Waiting for client</option><option value="RESOLVED">Resolved</option><option value="OPEN">Keep open</option>
                </select>
              </label>
            )}
          </div>
        )}
      />
    </section>
  );
}

// ---------------- New ticket (client) ----------------
export function NewTicketButton({ categories, hasEmail, startOpen }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [open, setOpen] = useState(Boolean(startOpen));
  const [v, setV] = useState({ subject: '', category: 'general', priority: 'NORMAL', message: '' });
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [open]);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    const [ok, d] = await post('/api/tickets', 'POST', v);
    setBusy(false);
    if (!ok) return toast(d.error, 'bad');
    toast(`Ticket #${d.number} created. We’ll reply here and by email.`);
    setOpen(false);
    router.push(`/dashboard/support/${d.id}`); router.refresh();
  }
  return (
    <>
      <button onClick={() => setOpen(true)} className="btn-primary">+ New ticket</button>
      {open && typeof document !== 'undefined' && createPortal((
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-navy/50 p-4" onMouseDown={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="nt-title" className="w-full max-w-lg animate-dialog-in rounded-2xl bg-surface p-6 shadow-pop">
            <div className="flex items-start justify-between gap-4">
              <div><h2 id="nt-title" className="font-display text-xl font-bold">New support ticket</h2><p className="mt-1 text-sm text-slate">Tell us what happened. We reply here and by email.</p></div>
              <button onClick={() => setOpen(false)} className="rounded-lg px-2 py-1 text-slate hover:bg-canvas" aria-label="Close">✕</button>
            </div>
            {!hasEmail ? (
              <p className="mt-5 text-sm">You sign in with Instagram/Facebook, so we have no email to reply to. Please use the <a href="/contact" className="font-semibold underline">contact form</a>.</p>
            ) : (
              <form onSubmit={submit} className="mt-5 space-y-4">
                <div><label className="label" htmlFor="nt-sub">Subject</label><input id="nt-sub" autoFocus className="field" maxLength={150} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} placeholder="e.g. Comments are not getting replies" required /></div>
                <div className="grid grid-cols-2 gap-3">
                  <div><label className="label" htmlFor="nt-cat">Topic</label><select id="nt-cat" className="field" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{Object.entries(categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
                  <div><label className="label" htmlFor="nt-pri">Urgency</label><select id="nt-pri" className="field" value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent: nothing works</option></select></div>
                </div>
                <div><label className="label" htmlFor="nt-msg">Describe the problem</label><textarea id="nt-msg" rows={5} className="field" maxLength={5000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder="What happened, which automation or account, and what you expected." required /></div>
                <p className="hint">Never include passwords or card details.</p>
                <div className="flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="btn-ghost">Cancel</button><button disabled={busy} className="btn-dark">{busy && <Spinner />}Create ticket</button></div>
              </form>
            )}
          </div>
        </div>
      ), document.body)}
    </>
  );
}
