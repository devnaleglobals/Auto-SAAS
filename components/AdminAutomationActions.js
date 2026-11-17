'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

const REASONS = ['Client asked us to', 'Sending is failing repeatedly', 'Possible spam or Meta policy issue', 'Account needs reconnecting'];

// Admin controls for one client automation. Every action needs a reason; the client is emailed and sees it in Activity.
export default function AdminAutomationActions({ id, name, status, access, accessUntil, canDelete }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  const running = status === 'ACTIVE';

  async function setStatus(next) {
    setBusy(next);
    const res = await fetch(`/api/admin/automations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: next, reason }) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(d.error || 'That didn’t work.', 'bad');
    toast(next === 'PAUSED' ? 'Paused. The client has been told.' : 'Resumed. The client has been told.');
    setReason(''); router.refresh();
  }
  async function del() {
    if (!(await confirm({ title: `Delete “${name}”?`, body: 'Its delivery history goes too. The client is emailed with your reason. This can’t be undone.', confirmLabel: 'Delete automation', danger: true }))) return;
    setBusy('delete');
    const res = await fetch(`/api/admin/automations/${id}?reason=${encodeURIComponent(reason)}`, { method: 'DELETE' });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(d.error || 'That didn’t work.', 'bad');
    toast('Automation deleted');
    router.push(`/admin/workspaces/${d.workspaceId}`); router.refresh();
  }

  return (
    <>
      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">{running ? 'Pause' : 'Resume'} this automation</h2>
        <p className="mt-1 text-sm text-slate">Allowed without the client’s permission for safety and support. They get an email with your reason.</p>
        <label className="label mt-4" htmlFor="aa-reason">Reason (the client sees this)</label>
        <input id="aa-reason" className="field" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Messages are failing: the Page token expired" />
        <div className="mt-2 flex flex-wrap gap-1.5">{REASONS.map((r) => <button key={r} type="button" onClick={() => setReason(r)} className="rounded-full border border-line px-2.5 py-0.5 text-xs text-slate hover:border-ink hover:text-ink">{r}</button>)}</div>
        {running
          ? <button className="btn-dark mt-4 w-full" disabled={!!busy || reason.trim().length < 5} onClick={() => setStatus('PAUSED')}>{busy === 'PAUSED' && <Spinner />}Pause automation</button>
          : status === 'PAUSED'
            ? <button className="btn-primary mt-4 w-full" disabled={!!busy || reason.trim().length < 5} onClick={() => setStatus('ACTIVE')}>{busy === 'ACTIVE' && <Spinner />}Resume automation</button>
            : <p className="mt-4 text-sm text-slate">This automation has finished (its end date or reply limit was reached).</p>}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Edit or delete</h2>
        {access ? (
          <>
            <p className="mt-1 text-sm"><span className="rounded-full bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">Support access on</span> until {accessUntil}</p>
            <p className="mt-2 text-sm text-slate">The client allowed support to change their automations. Changes are emailed to them and shown in their Activity.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/admin/automations/${id}/edit`} className="btn-dark">Edit automation</Link>
              {canDelete && <button className="btn-ghost text-bad" disabled={!!busy || reason.trim().length < 5} onClick={del} title={reason.trim().length < 5 ? 'Write a reason above first' : undefined}>{busy === 'delete' && <Spinner />}Delete</button>}
            </div>
            {canDelete && reason.trim().length < 5 && <p className="mt-2 text-xs text-slate">To delete, write a reason above first.</p>}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm"><span className="rounded-full bg-slate/10 px-2 py-0.5 text-xs font-semibold text-slate">Support access off</span></p>
            <p className="mt-2 text-sm text-slate">To edit or delete, the client must allow it: <strong>Settings → Support access</strong> in their dashboard (1, 7 or 30 days). Ask them in a support ticket.</p>
          </>
        )}
      </section>
    </>
  );
}
