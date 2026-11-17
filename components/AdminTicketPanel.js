'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function AdminTicketPanel({ ticket, admins }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [body, setBody] = useState('');
  const [internal, setInternal] = useState(false);
  const [after, setAfter] = useState('PENDING');
  const [busy, setBusy] = useState('');
  async function call(url, method, data, okMsg, key) {
    setBusy(key);
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    toast(res.ok ? okMsg : d.error || 'That didn’t work.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
    return res.ok;
  }
  const patch = (k) => (e) => call(`/api/admin/tickets/${ticket.id}`, 'PATCH', { [k]: e.target.value }, 'Ticket updated', k);
  return (
    <aside className="space-y-4">
      <form className="card p-4" onSubmit={async (e) => { e.preventDefault(); if (await call(`/api/admin/tickets/${ticket.id}/messages`, 'POST', { body, internal, status: internal ? undefined : after }, internal ? 'Note added' : 'Reply sent', 'reply')) setBody(''); }}>
        <label className="label" htmlFor="tk-reply">{internal ? 'Internal note (admins only)' : 'Reply to the client'}</label>
        <textarea id="tk-reply" rows={7} className="field" value={body} onChange={(e) => setBody(e.target.value)} required />
        <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" checked={internal} onChange={(e) => setInternal(e.target.checked)} className="h-4 w-4" /> Internal note (not emailed)</label>
        {!internal && <div className="mt-2"><label className="label" htmlFor="tk-after">Then set status</label><select id="tk-after" className="field" value={after} onChange={(e) => setAfter(e.target.value)}><option value="PENDING">Waiting for client</option><option value="RESOLVED">Resolved</option><option value="OPEN">Keep open</option></select></div>}
        <button className="btn-dark mt-3 w-full" disabled={!!busy}>{busy === 'reply' && <Spinner />}{internal ? 'Add note' : 'Send reply'}</button>
      </form>
      <div className="card space-y-3 p-4">
        <div><label className="label" htmlFor="tk-st">Status</label><select id="tk-st" className="field" defaultValue={ticket.status} onChange={patch('status')}><option value="OPEN">Open</option><option value="PENDING">Waiting for client</option><option value="RESOLVED">Resolved</option><option value="CLOSED">Closed</option></select></div>
        <div><label className="label" htmlFor="tk-pr">Priority</label><select id="tk-pr" className="field" defaultValue={ticket.priority} onChange={patch('priority')}>{['LOW', 'NORMAL', 'HIGH', 'URGENT'].map((p) => <option key={p} value={p}>{p[0] + p.slice(1).toLowerCase()}</option>)}</select></div>
        <div><label className="label" htmlFor="tk-as">Assigned to</label><select id="tk-as" className="field" defaultValue={ticket.assignedToId} onChange={patch('assignedToId')}><option value="">Nobody</option>{admins.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}</select></div>
      </div>
    </aside>
  );
}
