'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

const STATUS = [['OPEN', 'Open'], ['PENDING', 'Waiting for client'], ['RESOLVED', 'Resolved'], ['CLOSED', 'Closed']];
const PRIORITY = [['LOW', 'Low'], ['NORMAL', 'Normal'], ['HIGH', 'High'], ['URGENT', 'Urgent']];

// Right-hand panel on the admin ticket page: status, priority, owner, and who the client is.
export default function AdminTicketPanel({ ticket, admins, client, others }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState('');
  async function patch(key, value) {
    setBusy(key);
    const res = await fetch(`/api/admin/tickets/${ticket.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ [key]: value }) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    toast(res.ok ? 'Ticket updated' : d.error || 'That didn’t work.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
  }
  const select = (key, label, options, value) => (
    <div>
      <label className="label flex items-center justify-between" htmlFor={`tp-${key}`}>{label}{busy === key && <Spinner />}</label>
      <select id={`tp-${key}`} className="field" defaultValue={value} onChange={(e) => patch(key, e.target.value)} disabled={!!busy}>
        {options.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
      </select>
    </div>
  );
  return (
    <aside className="space-y-4">
      <section className="card space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">Ticket</h2>
        {select('status', 'Status', STATUS, ticket.status)}
        {select('priority', 'Priority', PRIORITY, ticket.priority)}
        {select('assignedToId', 'Assigned to', [['', 'Nobody'], ...admins.map((a) => [a.id, a.name])], ticket.assignedToId)}
        {ticket.status !== 'RESOLVED' && <button className="btn-ghost w-full" disabled={!!busy} onClick={() => patch('status', 'RESOLVED')}>Mark as resolved</button>}
      </section>

      <section className="card p-4 text-sm">
        <h2 className="text-sm font-bold uppercase tracking-wide text-slate">Client</h2>
        <p className="mt-2 font-semibold">{client.name}</p>
        <a href={`mailto:${client.email}`} className="break-all text-slate hover:text-ink">{client.email}</a>
        {client.workspace ? (
          <dl className="mt-3 grid grid-cols-[80px_1fr] gap-y-1.5">
            <dt className="text-slate">Workspace</dt><dd><Link href={`/admin/workspaces/${client.workspace.id}`} className="font-semibold underline">{client.workspace.name}</Link></dd>
            <dt className="text-slate">Plan</dt><dd>{client.workspace.plan}</dd>
            {client.workspace.suspended && <><dt className="text-slate">Status</dt><dd className="font-semibold text-bad">Suspended</dd></>}
          </dl>
        ) : <p className="mt-3 rounded-lg bg-canvas p-2.5 text-xs text-slate">Website visitor without an account. Replies go to their email.</p>}
      </section>

      {others.length > 0 && (
        <section className="card p-4 text-sm">
          <h2 className="text-sm font-bold uppercase tracking-wide text-slate">Other tickets</h2>
          <ul className="mt-2 space-y-1.5">{others.map((o) => <li key={o.id}><Link href={`/admin/tickets/${o.id}`} className="hover:underline">#{o.number} {o.subject}</Link> <span className="text-xs text-slate">({o.status.toLowerCase()})</span></li>)}</ul>
        </section>
      )}
    </aside>
  );
}
