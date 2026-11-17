'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function AdminWorkspaceActions({ ws, can, plans: PLAN_OPTIONS }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [plan, setPlan] = useState(ws.plan);
  const [until, setUntil] = useState(ws.periodEnd ? ws.periodEnd.slice(0, 10) : new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [note, setNote] = useState(ws.adminNote || '');
  const [d, setD] = useState({ name: ws.name, billingName: ws.billingName, billingEmail: ws.billingEmail, billingPhone: ws.billingPhone, billingGstin: ws.billingGstin, billingAddress: ws.billingAddress });
  const [trialPlan, setTrialPlan] = useState(ws.trialPlan || 'PRO');
  const [trialUntil, setTrialUntil] = useState((ws.trialEndsAt && new Date(ws.trialEndsAt) > new Date() ? ws.trialEndsAt : new Date(Date.now() + 14 * 86400000).toISOString()).slice(0, 10));
  const [delName, setDelName] = useState('');
  const [cr, setCr] = useState({ delta: '', note: '' });

  async function act(action, body, ok) {
    setBusy(action);
    const res = await fetch(`/api/admin/workspaces/${ws.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, ...body }) });
    const data = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(data.error || 'That didn’t work.', 'bad');
    toast(ok);
    router.refresh();
  }

  async function del() {
    if (!(await confirm({ title: `Delete ${ws.name} permanently?`, body: 'Deletes its accounts, automations, leads and history, and cancels its Razorpay subscription. This can’t be undone.', confirmLabel: 'Delete client', danger: true }))) return;
    setBusy('delete');
    const res = await fetch(`/api/admin/workspaces/${ws.id}`, { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ confirmName: delName }) });
    const data = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(data.error || 'That didn’t work.', 'bad');
    toast('Client deleted');
    router.push('/admin/workspaces'); router.refresh();
  }

  if (!can.edit && !can.billing) return <p className="card p-5 text-sm text-slate">Your role can view this client but not change it.</p>;
  return (
    <div className="space-y-5">
      {can.edit && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Client details</h2>
        <div className="mt-4 grid gap-3">
          {[['name', 'Workspace name'], ['billingName', 'Business name (invoices)'], ['billingEmail', 'Billing email'], ['billingPhone', 'Phone'], ['billingGstin', 'GSTIN'], ['billingAddress', 'Address']].map(([k, l]) => (
            <div key={k}><label className="label" htmlFor={`d-${k}`}>{l}</label><input id={`d-${k}`} className="field" value={d[k] || ''} onChange={(e) => setD({ ...d, [k]: e.target.value })} /></div>
          ))}
        </div>
        <button className="btn-dark mt-4" disabled={!!busy} onClick={() => act('details', d, 'Details saved')}>{busy === 'details' && <Spinner />}Save details</button>
      </section>}

      {can.billing && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Free trial</h2>
        <p className="mt-1 text-sm text-slate">{ws.trialEndsAt && new Date(ws.trialEndsAt) > new Date() ? `On a trial until ${ws.trialEndsAt.slice(0, 10)}.` : 'Not on a trial.'} Set or extend a trial; it doesn’t affect a paid plan.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="field" value={trialPlan} onChange={(e) => setTrialPlan(e.target.value)} aria-label="Trial plan">{PLAN_OPTIONS.filter(([v]) => v !== 'FREE').map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input type="date" className="field" value={trialUntil} onChange={(e) => setTrialUntil(e.target.value)} aria-label="Trial ends" />
          <button className="btn-dark" disabled={!!busy} onClick={() => act('trial', { plan: trialPlan, until: `${trialUntil}T23:59:59` }, 'Trial updated')}>{busy === 'trial' && <Spinner />}Save trial</button>
        </div>
        {ws.trialEndsAt && new Date(ws.trialEndsAt) > new Date() && <button className="btn-ghost btn-sm mt-3" disabled={!!busy} onClick={() => act('trial', { end: true }, 'Trial ended')}>End trial now</button>}
      </section>}

      {can.billing && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Plan</h2>
        <p className="mt-1 text-sm text-slate">Give a complimentary plan for a trial, a demo or a client you bill outside Razorpay.</p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <select className="field" value={plan} onChange={(e) => setPlan(e.target.value)} aria-label="Plan">{PLAN_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
          <input type="date" className="field" value={until} onChange={(e) => setUntil(e.target.value)} disabled={plan === 'FREE'} aria-label="Plan active until" />
          <button className="btn-dark" disabled={!!busy} onClick={() => act('plan', { plan, until: plan === 'FREE' ? null : `${until}T23:59:59` }, plan === 'FREE' ? 'Moved to Free' : 'Plan updated')}>{busy === 'plan' && <Spinner />}Save plan</button>
        </div>
      </section>}

      {can.billing && ws.razorpaySubId && ['active', 'authenticated', 'pending', 'halted'].includes(ws.subStatus) && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Razorpay subscription</h2>
        <p className="mt-1 text-sm text-slate">Status: {ws.subStatus}. Cancelling here stops future charges in Razorpay. Refunds are made in the Razorpay dashboard.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button className="btn-ghost" disabled={!!busy} onClick={async () => { if (await confirm({ title: 'Cancel at the end of the paid period?', body: 'The client keeps the plan until the period ends, then moves to Free.', confirmLabel: 'Cancel at period end' })) act('cancelSubscription', { when: 'cycle_end' }, 'Subscription will end at period end'); }}>Cancel at period end</button>
          <button className="btn-danger" disabled={!!busy} onClick={async () => { if (await confirm({ title: 'Cancel immediately?', body: 'The client moves to Free now. Refund any unused amount in Razorpay if needed.', confirmLabel: 'Cancel now', danger: true })) act('cancelSubscription', { when: 'now' }, 'Subscription cancelled'); }}>Cancel now</button>
        </div>
      </section>}

      {can.billing && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Message credits</h2>
        <p className="mt-1 text-sm text-slate">Balance: <strong className="text-ink">{Number(ws.credits || 0).toLocaleString('en-IN')}</strong>. Add credits as goodwill or for an offline payment; use a minus sign to remove.</p>
        <div className="mt-4 grid gap-2 sm:grid-cols-[120px_1fr_auto]">
          <input type="number" className="field" placeholder="e.g. 500" value={cr.delta} onChange={(e) => setCr({ ...cr, delta: e.target.value })} aria-label="Credits to add or remove" />
          <input className="field" placeholder="Reason (e.g. Paid by bank transfer, inv 102)" value={cr.note} onChange={(e) => setCr({ ...cr, note: e.target.value })} aria-label="Reason" />
          <button className="btn-dark" disabled={!!busy || !cr.delta || !cr.note.trim()} onClick={async () => { await act('credits', cr, 'Credits updated'); setCr({ delta: '', note: '' }); }}>{busy === 'credits' && <Spinner />}Apply</button>
        </div>
      </section>}

      {can.billing && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Usage</h2>
        <p className="mt-1 text-sm text-slate">Resetting lets automations send again this month, for example after a billing mistake.</p>
        <button className="btn-ghost mt-4" disabled={!!busy} onClick={async () => { if (await confirm({ title: 'Reset this month’s usage?', body: 'The message counter goes back to 0 for this month.', confirmLabel: 'Reset usage' })) act('resetUsage', {}, 'Usage reset'); }}>{busy === 'resetUsage' && <Spinner />}Reset this month’s usage</button>
      </section>}

      {can.edit && <section className={`card p-5 ${ws.suspended ? 'border-bad/40' : ''}`}>
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
      </section>}

      {can.edit && <section className="card p-5">
        <h2 className="font-display text-lg font-bold">Private note</h2>
        <p className="mt-1 text-sm text-slate">Only platform admins see this.</p>
        <textarea className="field mt-3" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contact person, deal terms, support history…" aria-label="Admin note" />
        <button className="btn-ghost mt-3" disabled={!!busy} onClick={() => act('note', { note }, 'Note saved')}>{busy === 'note' && <Spinner />}Save note</button>
      </section>}

      {can.danger && <section className="card border-bad/30 p-5">
        <h2 className="font-display text-lg font-bold text-bad">Delete client</h2>
        <p className="mt-1 text-sm text-slate">Type <strong>{ws.name}</strong> to confirm.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input className="field min-w-0 flex-1" value={delName} onChange={(e) => setDelName(e.target.value)} aria-label="Confirm client name" autoComplete="off" />
          <button className="btn-danger" disabled={!!busy || delName.trim() !== ws.name} onClick={del}>{busy === 'delete' && <Spinner />}Delete</button>
        </div>
      </section>}
    </div>
  );
}
