'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

const PLAN_OPTIONS = [['FREE', 'Free'], ['STARTER', 'Starter'], ['PRO', 'Pro'], ['AGENCY', 'Agency']];

export default function AdminWorkspaceActions({ ws }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [plan, setPlan] = useState(ws.plan);
  const [until, setUntil] = useState(ws.periodEnd ? ws.periodEnd.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [note, setNote] = useState(ws.adminNote || '');

  async function act(action, body, ok) {
    setBusy(action);
    const res = await fetch(`/api/admin/workspaces/${ws.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    const data = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(data.error || 'That didn’t work.', 'bad');
    toast(ok);
    router.refresh();
  }

  return (
    <div className="space-y-5">
      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Plan</h2>
        <p className="mt-1 text-sm text-slate">Give a complimentary plan for a trial, a demo or a client you bill outside Razorpay.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="field" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">{PLAN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input type="date" className="field" value={until} onChange={(e) => setUntil(e.target.value)} disabled={plan === 'FREE'} aria-label="Plan active until" />
          <button className="btn-dark" disabled={!!busy} onClick={() => act('plan', { plan, until: plan === 'FREE' ? null : `${until}T23:59:59` }, plan === 'FREE' ? 'Moved to Free' : 'Plan updated')}>{busy === 'plan' && <Spinner />}Save plan</button>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Usage</h2>
        <p className="mt-1 text-sm text-slate">Resetting lets automations send again this month, for example after a billing mistake.</p>
        <button className="btn-ghost mt-4" disabled={!!busy} onClick={async () => { if (await confirm({ title: 'Reset this month’s usage?', body: 'The message counter goes back to 0 for this month.', confirmLabel: 'Reset usage' })) act('resetUsage', {}, 'Usage reset'); }}>{busy === 'resetUsage' && <Spinner />}Reset this month’s usage</button>
      </section>

      <section className={`card p-5 ${ws.suspended ? 'border-bad/40' : ''}`}>
        <h2 className="font-display text-lg font-bold">{ws.suspended ? 'Suspended' : 'Suspend client'}</h2>
        {ws.suspended ? (
          <>
            <p className="mt-1 text-sm">Reason shown to the client: <strong>{ws.suspendReason}</strong></p>
            <button className="btn-primary mt-4" disabled={!!busy} onClick={() => act('resume', {}, 'Client resumed')}>{busy === 'resume' && <Spinner />}Resume client</button>
          </>
        ) : (
          <>
            <p className="mt-1 text-sm text-slate">Stops all replies and messages from this workspace. The client can still log in and sees the reason.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <input className="field min-w-0 flex-1" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason, e.g. Spam complaints from Meta" aria-label="Suspension reason" />
              <button className="btn-danger" disabled={!!busy || !reason.trim()} onClick={async () => { if (await confirm({ title: `Suspend ${ws.name}?`, body: 'All automations stop sending immediately.', confirmLabel: 'Suspend', danger: true })) act('suspend', { reason }, 'Client suspended'); }}>{busy === 'suspend' && <Spinner />}Suspend</button>
            </div>
          </>
        )}
      </section>

      <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Private note</h2>
        <p className="mt-1 text-sm text-slate">Only platform admins see this.</p>
        <textarea className="field mt-3" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contact person, deal terms, support history…" aria-label="Admin note" />
        <button className="btn-ghost mt-3" disabled={!!busy} onClick={() => act('note', { note }, 'Note saved')}>{busy === 'note' && <Spinner />}Save note</button>
      </section>
    </div>
  );
}
