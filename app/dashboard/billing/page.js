import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, Notice, fmtNum } from '@/components/ui';
import { PLANS, effectivePlan, usageThisMonth, rupees, onTrial, limitsOf } from '@/lib/plans';
import { CancelButton, BillingDetails } from '@/components/BillingActions';
import { getCreditSettings } from '@/lib/credits';
import Meter from '@/components/BillingMeter';

export const dynamic = 'force-dynamic';
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

// Billing home: only the current plan, usage, credits, billing details and payments.
// Changing plan happens on /dashboard/billing/plans ("Manage plan").
export default async function Billing({ searchParams }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const creditCfg = await getCreditSettings();
  const trial = onTrial(ws);
  const current = effectivePlan(ws);
  const plan = PLANS[current];
  const limits = limitsOf(ws);
  const [accounts, members, payments] = await Promise.all([
    prisma.channel.count({ where: { workspaceId: ws.id } }),
    prisma.membership.count({ where: { workspaceId: ws.id } }),
    prisma.payment.findMany({ where: { workspaceId: ws.id }, orderBy: { createdAt: 'desc' }, take: 24 }),
  ]);
  const used = usageThisMonth(ws);
  const canManage = ctx.can('manageWorkspace');
  const paidRunning = Boolean(ws.razorpaySubId) && current !== 'FREE' && !trial;
  const cancelled = ws.subStatus === 'cancelled' && current !== 'FREE' && !ws.nextPlan;
  const pastDue = ['pending', 'halted'].includes(ws.subStatus) && current !== 'FREE';
  const status = trial ? 'Free trial' : current === 'FREE' ? 'Free' : ws.nextPlan ? 'Change scheduled' : cancelled ? 'Cancelled' : pastDue ? 'Payment due' : ws.razorpaySubId ? 'Active' : 'Complimentary';
  const statusTone = pastDue ? 'bg-bad/10 text-bad' : cancelled ? 'bg-marigold/25' : 'bg-ok/10 text-ok';

  return (
    <>
      <PageHeader title="Billing" description="Your current plan, usage and payments. Payments are handled securely by Razorpay." />
      {sp?.status === 'success' && <Notice>Payment received. Your plan updates within a minute. Refresh if it hasn’t yet.</Notice>}
      {pastDue && <Notice tone="bad">Your last renewal didn’t go through. Razorpay will retry; your plan stays active until {day(ws.periodEnd)}.</Notice>}
      {used >= limits.messages && !(ws.credits > 0) && <Notice tone="bad">You’ve used all {fmtNum(limits.messages)} messages this month, so automations are paused until next month. Change plan{creditCfg.enabled ? ' or buy message credits' : ''} to keep replying.</Notice>}
      {used >= limits.messages && ws.credits > 0 && <Notice tone="warn">Your monthly messages are used up; automations keep running on your {fmtNum(ws.credits)} credits.</Notice>}

      <section className="card overflow-hidden">
        <div className="grid gap-6 p-6 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-sm text-slate">Current plan</p>
              <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${statusTone}`}>{status}</span>
            </div>
            <p className="mt-1 font-display text-4xl font-bold">{plan.name}</p>
            <p className="mt-1 text-slate">{current === 'FREE' ? 'No payment needed' : trial ? `Free until ${day(ws.trialEndsAt)}` : ws.razorpaySubId ? `${rupees(plan.price)} a month` : 'Complimentary'}</p>
            <dl className="mt-5 grid grid-cols-[130px_1fr] gap-y-2 text-sm">
              {trial && <><dt className="text-slate">Trial ends</dt><dd className="font-semibold">{day(ws.trialEndsAt)}</dd></>}
              {paidRunning && !cancelled && !ws.nextPlan && <><dt className="text-slate">Next payment</dt><dd className="font-semibold">{rupees(plan.price)} on {day(ws.periodEnd)}</dd></>}
              {(cancelled || ws.nextPlan) && ws.periodEnd && <><dt className="text-slate">Paid until</dt><dd className="font-semibold">{day(ws.periodEnd)}</dd></>}
              {!ws.razorpaySubId && current !== 'FREE' && !trial && ws.periodEnd && <><dt className="text-slate">Active until</dt><dd className="font-semibold">{day(ws.periodEnd)}</dd></>}
              {limits.custom && <><dt className="text-slate">Limits</dt><dd>Custom limits set by our team</dd></>}
            </dl>
            {ws.nextPlan && <p className="mt-4 rounded-lg bg-sky/5 p-3 text-sm">Changing to <strong>{PLANS[ws.nextPlan]?.name}</strong> on {day(ws.nextStartAt)}. You keep {plan.name} until then.</p>}
            {cancelled && <p className="mt-4 rounded-lg bg-marigold/10 p-3 text-sm">Cancelled. You keep {plan.name} until {day(ws.periodEnd)}, then move to Free.</p>}
            {canManage && (
              <div className="mt-6 flex flex-wrap gap-2">
                <Link href="/dashboard/billing/plans" className="btn-primary">{current === 'FREE' || trial ? 'Choose a plan' : 'Manage plan'}</Link>
                {paidRunning && !cancelled && !ws.nextPlan && <CancelButton until={day(ws.periodEnd)} />}
              </div>
            )}
          </div>
          <div className="space-y-5 rounded-xl bg-canvas/60 p-5">
            <Meter label="Messages this month" used={used} limit={limits.messages} />
            <Meter label="Connected accounts" used={accounts} limit={limits.accounts} />
            <Meter label="Team members" used={members} limit={limits.members} />
            {(ws.credits > 0 || creditCfg.enabled) && (
              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line pt-4 text-sm">
                <span><strong>{fmtNum(ws.credits)}</strong> <span className="text-slate">message credits (used after monthly messages)</span></span>
                {creditCfg.enabled && canManage && <Link href="/dashboard/billing/plans#credits" className="font-semibold text-sky hover:underline">Buy credits</Link>}
              </div>
            )}
            <p className="text-xs text-slate">Usage resets on the 1st of each month.</p>
          </div>
        </div>
      </section>

      <div className="mt-8">
        <BillingDetails canEdit={canManage} initial={{
          billingName: ws.billingName || ws.name || '', billingEmail: ws.billingEmail || ctx.user.email || '',
          billingPhone: ws.billingPhone || '', billingGstin: ws.billingGstin || '', billingAddress: ws.billingAddress || '',
        }} />
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Payment history</h2>
      {payments.length === 0 ? (
        <p className="card border-dashed p-6 text-sm text-slate">No payments yet.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Date</th><th className="th">For</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Status</th><th className="th">Invoice</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="td whitespace-nowrap">{day(p.createdAt)}</td>
                  <td className="td">{p.plan === 'CREDITS' ? 'Message credits' : `${PLANS[p.plan]?.name || p.plan || '–'} plan`}</td>
                  <td className="td tabular-nums">{rupees(Math.round(p.amount / 100))}</td>
                  <td className="td capitalize">{p.method || '–'}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'captured' ? 'bg-ok/10 text-ok' : p.status === 'partially_refunded' ? 'bg-sky/10 text-ink' : p.status === 'refunded' ? 'bg-canvas text-slate' : 'bg-bad/10 text-bad'}`}>{p.status === 'captured' ? 'Paid' : p.status === 'partially_refunded' ? 'Partly refunded' : p.status === 'refunded' ? 'Refunded' : 'Failed'}</span></td>
                  <td className="td">{p.invoiceId ? <a href={`/api/billing/invoice/${p.id}`} target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">Download</a> : <span className="text-xs text-slate">{p.razorpayId}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
