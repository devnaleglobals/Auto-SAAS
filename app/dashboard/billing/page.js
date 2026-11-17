import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, Notice, fmtNum } from '@/components/ui';
import { PLANS, PAID, FEATURES_ALL, effectivePlan, usageThisMonth, rupees, onTrial } from '@/lib/plans';
import { billingConfigured } from '@/lib/razorpay';
import { CancelButton, BillingDetails, BuyCreditsButton } from '@/components/BillingActions';
import { getCreditSettings } from '@/lib/credits';
import BillingPlanCards from '@/components/BillingPlanCards';

export const dynamic = 'force-dynamic';
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function Meter({ label, used, limit }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-marigold' : 'bg-ok';
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="tabular-nums text-slate">{fmtNum(used)} of {fmtNum(limit)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${used > 0 ? Math.max(pct, 2) : 0}%` }} />
      </div>
    </div>
  );
}

export default async function Billing({ searchParams }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const payOn = await billingConfigured();
  const creditCfg = await getCreditSettings();
  const trial = onTrial(ws);
  const current = effectivePlan(ws);
  const limits = PLANS[current];
  const [accounts, members, payments] = await Promise.all([
    prisma.channel.count({ where: { workspaceId: ws.id } }),
    prisma.membership.count({ where: { workspaceId: ws.id } }),
    prisma.payment.findMany({ where: { workspaceId: ws.id }, orderBy: { createdAt: 'desc' }, take: 24 }),
  ]);
  const used = usageThisMonth(ws);
  const canManage = ctx.can('manageWorkspace');
  const cancelled = ws.subStatus === 'cancelled' && current !== 'FREE';
  const pastDue = ['pending', 'halted'].includes(ws.subStatus) && current !== 'FREE';

  return (
    <>
      <PageHeader title="Billing" description="Your plan, this month’s usage, and upgrades. Payments are handled securely by Razorpay." />
      {sp?.status === 'success' && <Notice>Payment received. Your plan updates within a minute. Refresh if it hasn’t yet.</Notice>}
      {pastDue && <Notice tone="bad">Your last renewal didn’t go through. Razorpay will retry; your plan stays active until {day(ws.periodEnd)}.</Notice>}
      {trial && <Notice tone="warn">You’re on a free {PLANS[current].name} trial until {day(ws.trialEndsAt)}. Choose a plan below to keep these limits after that.</Notice>}
      {cancelled && <Notice tone="warn">Your {PLANS[current].name} plan is cancelled and stays active until {day(ws.periodEnd)}. Then it moves to Free.</Notice>}
      {used >= limits.messages && !(ws.credits > 0) && <Notice tone="bad">You’ve used all {fmtNum(limits.messages)} messages this month, so automations are paused until next month{creditCfg.enabled ? ', an upgrade, or a credit pack below' : ' or an upgrade'}.</Notice>}
      {used >= limits.messages && ws.credits > 0 && <Notice tone="warn">Your monthly messages are used up; automations keep running on your {fmtNum(ws.credits)} credits.</Notice>}

      <section className="card grid gap-6 p-6 lg:grid-cols-[240px_1fr]">
        <div>
          <p className="text-sm text-slate">Current plan</p>
          <p className="mt-1 font-display text-3xl font-bold">{limits.name}</p>
          <p className="mt-1 text-sm text-slate">
            {trial ? <>Free trial until {day(ws.trialEndsAt)}</> : current === 'FREE' ? 'No payment needed'
              : !ws.razorpaySubId ? <>Complimentary{ws.periodEnd ? <> until {day(ws.periodEnd)}</> : ''}</>
              : <>{rupees(limits.price)} a month{ws.periodEnd ? <><br />{cancelled ? 'Ends' : 'Renews'} on {day(ws.periodEnd)}</> : ''}</>}
          </p>
          {canManage && current !== 'FREE' && !cancelled && ws.razorpaySubId && <div className="mt-4"><CancelButton until={day(ws.periodEnd)} /></div>}
        </div>
        <div className="space-y-5">
          <Meter label="Messages this month" used={used} limit={limits.messages} />
          {(ws.credits > 0 || creditCfg.enabled) && <p className="-mt-2 text-sm"><strong>{fmtNum(ws.credits)}</strong> <span className="text-slate">pay-as-you-go credits left, used after the monthly messages run out</span></p>}
          <Meter label="Connected accounts" used={accounts} limit={limits.accounts} />
          <Meter label="Team members" used={members} limit={limits.members} />
          <p className="text-xs text-slate">Messages count every private message, conversation message, reminder and public reply sent. Usage resets on the 1st of each month.</p>
        </div>
      </section>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Plans</h2>
      {!payOn && canManage && <Notice tone="warn">Online payments aren’t available right now. Contact support to change your plan.</Notice>}
      <BillingPlanCards
        current={current}
        currentPrice={PLANS[current].price}
        canBuy={canManage && payOn}
        plans={Object.entries(PLANS).filter(([key, p]) => p.active !== false || key === current).map(([key, p]) => ({ key, ...p, paid: PAID.includes(key) }))}
      />
      {creditCfg.enabled && (
        <section className="mt-10">
          <h2 className="font-display text-xl font-bold">Pay as you go: message credits</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate">Need more messages without changing plan? Buy credits once. They’re used only after your plan’s monthly messages run out, and they never expire. You have <strong className="text-ink">{fmtNum(ws.credits)}</strong> credits.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditCfg.packs.filter((p) => p.credits > 0 && p.price > 0).map((p, i) => (
              <div key={p.id} className="card flex flex-col p-5">
                <p className="font-display text-lg font-bold">{p.name}</p>
                <p className="mt-1"><span className="font-display text-3xl font-bold">{rupees(p.price)}</span><span className="text-sm text-slate"> one time</span></p>
                <p className="mt-1 text-sm text-slate">{fmtNum(p.credits)} messages · {rupees(Math.round((p.price / p.credits) * 10000) / 100)} per 100</p>
                <div className="mt-auto pt-4">{canManage && payOn ? <BuyCreditsButton packId={p.id} label={`Buy ${fmtNum(p.credits)} credits`} primary={i === 1} /> : <p className="text-xs text-slate">Only the workspace owner can buy credits.</p>}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="mt-10">
        <BillingDetails canEdit={canManage} initial={{
          billingName: ws.billingName || ws.name || '', billingEmail: ws.billingEmail || ctx.user.email || '',
          billingPhone: ws.billingPhone || '', billingGstin: ws.billingGstin || '', billingAddress: ws.billingAddress || '',
        }} />
      </div>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Payment history</h2>
      {payments.length === 0 ? (
        <p className="card border-dashed p-6 text-sm text-slate">No payments yet. Payments appear here after each monthly charge.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Date</th><th className="th">Plan</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Status</th><th className="th">Invoice</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="td whitespace-nowrap">{day(p.createdAt)}</td>
                  <td className="td">{p.plan === 'CREDITS' ? 'Message credits' : PLANS[p.plan]?.name || p.plan || '–'}</td>
                  <td className="td tabular-nums">{rupees(Math.round(p.amount / 100))}</td>
                  <td className="td capitalize">{p.method || '–'}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'captured' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>{p.status === 'captured' ? 'Paid' : p.status === 'refunded' ? 'Refunded' : 'Failed'}</span></td>
                  <td className="td">{p.invoiceId ? <a href={`/api/billing/invoice/${p.id}`} target="_blank" rel="noreferrer" className="font-semibold text-sky hover:underline">Download</a> : <span className="text-xs text-slate">{p.razorpayId}</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-sm text-slate">Every plan includes: {FEATURES_ALL.join(', ').toLowerCase()}. Invoices are issued by Razorpay with the billing details above.</p>
    </>
  );
}
