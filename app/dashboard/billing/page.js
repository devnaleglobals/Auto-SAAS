import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Notice, fmtNum } from '@/components/ui';
import { PLANS, PAID, FEATURES_ALL, effectivePlan, usageThisMonth, rupees } from '@/lib/plans';
import { billingConfigured } from '@/lib/razorpay';
import { UpgradeButton, CancelButton } from '@/components/BillingActions';

export const dynamic = 'force-dynamic';
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' }) : '');

function Meter({ label, used, limit }) {
  const pct = Math.min(100, Math.round((used / limit) * 100));
  const tone = pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-marigold' : 'bg-ok';
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="tabular-nums text-slate">{fmtNum(used)} of {fmtNum(limit)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function Billing({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
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
      {cancelled && <Notice tone="warn">Your {PLANS[current].name} plan is cancelled and stays active until {day(ws.periodEnd)}. Then it moves to Free.</Notice>}
      {used >= limits.messages && <Notice tone="bad">You’ve used all {fmtNum(limits.messages)} messages this month, so automations are paused until next month or an upgrade.</Notice>}

      <section className="card grid gap-6 p-6 lg:grid-cols-[240px_1fr]">
        <div>
          <p className="text-sm text-slate">Current plan</p>
          <p className="mt-1 font-display text-3xl font-bold">{limits.name}</p>
          <p className="mt-1 text-sm text-slate">{current === 'FREE' ? 'No payment needed' : `${rupees(limits.price)} a month${ws.periodEnd ? ` · ${cancelled ? 'ends' : 'renews'} ${day(ws.periodEnd)}` : ''}`}</p>
          {canManage && current !== 'FREE' && !cancelled && ws.razorpaySubId && <div className="mt-4"><CancelButton until={day(ws.periodEnd)} /></div>}
        </div>
        <div className="space-y-5">
          <Meter label="Messages this month" used={used} limit={limits.messages} />
          <Meter label="Connected accounts" used={accounts} limit={limits.accounts} />
          <Meter label="Team members" used={members} limit={limits.members} />
          <p className="text-xs text-slate">Messages count every private message, conversation message, reminder and public reply sent. Usage resets on the 1st of each month.</p>
        </div>
      </section>

      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Plans</h2>
      {!billingConfigured() && canManage && <Notice tone="warn">Payments aren’t switched on yet. Add the Razorpay keys and plan IDs in Vercel to enable upgrades.</Notice>}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Object.entries(PLANS).map(([key, p]) => (
          <div key={key} className={`card flex flex-col p-5 ${p.popular ? 'border-ink ring-1 ring-ink' : ''}`}>
            <div className="flex items-center justify-between"><h3 className="font-display text-lg font-bold">{p.name}</h3>{p.popular && <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-xs font-semibold">Most popular</span>}</div>
            <p className="mt-2"><span className="font-display text-3xl font-bold">{rupees(p.price)}</span>{p.price > 0 && <span className="text-sm text-slate"> / month</span>}</p>
            <p className="mt-2 text-sm text-slate">{p.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li><strong>{fmtNum(p.messages)}</strong> messages a month</li>
              <li><strong>{p.accounts}</strong> account{p.accounts > 1 ? 's' : ''}</li>
              <li><strong>{p.members}</strong> team member{p.members > 1 ? 's' : ''}</li>
            </ul>
            <div className="mt-auto pt-5">
              {key === current ? <p className="rounded-lg bg-canvas py-2.5 text-center text-sm font-semibold">Your plan</p>
                : PAID.includes(key) && canManage && billingConfigured() ? <UpgradeButton plan={key} primary={p.popular} label={PLANS[current].price > p.price ? `Switch to ${p.name}` : `Upgrade to ${p.name}`} />
                : null}
            </div>
          </div>
        ))}
      </div>
      <h2 className="mb-4 mt-10 font-display text-xl font-bold">Payment history</h2>
      {payments.length === 0 ? (
        <p className="card border-dashed p-6 text-sm text-slate">No payments yet. Payments appear here after each monthly charge.</p>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Date</th><th className="th">Plan</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Status</th><th className="th">Reference</th></tr></thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-line last:border-0">
                  <td className="td whitespace-nowrap">{day(p.createdAt)}</td>
                  <td className="td">{PLANS[p.plan]?.name || p.plan || '–'}</td>
                  <td className="td tabular-nums">{rupees(Math.round(p.amount / 100))}</td>
                  <td className="td capitalize">{p.method || '–'}</td>
                  <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'captured' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>{p.status === 'captured' ? 'Paid' : p.status === 'refunded' ? 'Refunded' : 'Failed'}</span></td>
                  <td className="td text-xs text-slate">{p.razorpayId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-5 text-sm text-slate">Every plan includes: {FEATURES_ALL.join(', ').toLowerCase()}. Prices include GST where applicable.</p>
    </>
  );
}
