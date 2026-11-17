'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return [res.ok, await res.json().catch(() => ({}))];
}

export function NewTicketForm({ categories, autoFocus, hasEmail }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState({ subject: '', category: 'general', priority: 'NORMAL', message: '' });
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    const [ok, d] = await send('/api/tickets', 'POST', v);
    setBusy(false);
    if (!ok) return toast(d.error, 'bad');
    toast(`Ticket #${d.number} created. We’ll reply by email.`);
    router.push(`/dashboard/support/${d.id}`); router.refresh();
  }
  if (!hasEmail) return <section className="card h-fit p-5 text-sm">You sign in with Instagram/Facebook, so we have no email to reply to. Please use the <a href="/contact" className="font-semibold underline">contact form</a> on our website.</section>;
  return (
    <form onSubmit={submit} className="card h-fit space-y-4 p-5">
      <h2 className="font-display text-lg font-bold">New ticket</h2>
      <div><label className="label" htmlFor="tk-sub">Subject</label><input id="tk-sub" autoFocus={autoFocus} className="field" maxLength={150} value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} required /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><label className="label" htmlFor="tk-cat">Topic</label><select id="tk-cat" className="field" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>{Object.entries(categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div><label className="label" htmlFor="tk-pri">Urgency</label><select id="tk-pri" className="field" value={v.priority} onChange={(e) => setV({ ...v, priority: e.target.value })}><option value="LOW">Low</option><option value="NORMAL">Normal</option><option value="HIGH">High</option><option value="URGENT">Urgent: nothing works</option></select></div>
      </div>
      <div><label className="label" htmlFor="tk-msg">Describe the problem</label><textarea id="tk-msg" rows={6} className="field" maxLength={5000} value={v.message} onChange={(e) => setV({ ...v, message: e.target.value })} placeholder="What happened, which automation or account, and what you expected." required /></div>
      <p className="hint">Never include passwords or card details.</p>
      <button disabled={busy} className="btn-dark w-full">{busy && <Spinner />}Send to support</button>
    </form>
  );
}

export function TicketReply({ id, closed }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState('');
  async function reply(e) {
    e.preventDefault(); setBusy('reply');
    const [ok, d] = await send(`/api/tickets/${id}/messages`, 'POST', { body });
    setBusy('');
    if (!ok) return toast(d.error, 'bad');
    setBody(''); toast('Reply sent'); router.refresh();
  }
  async function setStatus(status) {
    setBusy(status);
    const [ok, d] = await send(`/api/tickets/${id}`, 'PATCH', { status });
    setBusy('');
    toast(ok ? (status === 'CLOSED' ? 'Ticket closed' : 'Ticket reopened') : d.error, ok ? 'ok' : 'bad');
    if (ok) router.refresh();
  }
  return (
    <form onSubmit={reply} className="card space-y-3 p-4">
      <label className="label" htmlFor="tr-body">{closed ? 'Reply to reopen this ticket' : 'Reply'}</label>
      <textarea id="tr-body" rows={4} className="field" maxLength={5000} value={body} onChange={(e) => setBody(e.target.value)} required />
      <div className="flex flex-wrap justify-between gap-2">
        {closed ? <button type="button" className="btn-ghost" onClick={() => setStatus('OPEN')} disabled={!!busy}>Reopen</button>
          : <button type="button" className="btn-ghost" onClick={() => setStatus('CLOSED')} disabled={!!busy}>{busy === 'CLOSED' && <Spinner />}Close ticket (solved)</button>}
        <button className="btn-dark" disabled={!!busy}>{busy === 'reply' && <Spinner />}Send reply</button>
      </div>
    </form>
  );
}
