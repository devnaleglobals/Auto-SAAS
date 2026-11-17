import Link from 'next/link';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, Notice, fmtNum } from '@/components/ui';
import { PLANS, PAID, FEATURES_ALL, effectivePlan, rupees, onTrial } from '@/lib/plans';
import { billingConfigured } from '@/lib/razorpay';
import { BuyCreditsButton } from '@/components/BillingActions';
import { getCreditSettings, bestRate } from '@/lib/credits';
import { getBillingPolicy, hasRunningPaidPlan } from '@/lib/planChange';
import BillingPlanCards from '@/components/BillingPlanCards';

export const dynamic = 'force-dynamic';
const day = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }) : '');

// "Manage plan": every plan, how changes work, and pay-as-you-go credits.
export default async function ManagePlan() {
  const ctx = await requireContext();
  if (!ctx.can('manageWorkspace')) redirect('/dashboard/billing');
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const [payOn, creditCfg, policy] = await Promise.all([billingConfigured(), getCreditSettings(), getBillingPolicy()]);
  const current = effectivePlan(ws);
  const running = hasRunningPaidPlan(ws);
  return (
    <>
      <Link href="/dashboard/billing" className="text-sm font-semibold text-slate hover:text-ink">← Billing</Link>
      <div className="mt-3"><PageHeader title="Manage plan" description={`You’re on ${PLANS[current].name}${onTrial(ws) ? ` (free trial until ${day(ws.trialEndsAt)})` : ''}. Pick a plan to see exactly what changes before you pay.`} /></div>
      {!payOn && <Notice tone="warn">Online payments aren’t available right now. Contact support to change your plan.</Notice>}
      {ws.nextPlan && <Notice tone="warn">A change to {PLANS[ws.nextPlan]?.name} is scheduled for {day(ws.nextStartAt)}. Contact support if you want to change it.</Notice>}

      <BillingPlanCards
        current={running || current === 'FREE' || (current === 'PAYG' && !onTrial(ws)) ? current : null}
        currentPrice={running ? PLANS[ws.plan].price : 0}
        canBuy={payOn && !ws.nextPlan}
        plans={Object.entries(PLANS).filter(([key, p]) => (p.active !== false && (key !== 'PAYG' || creditCfg.enabled)) || key === current).map(([key, p]) => ({ key, ...p, paid: PAID.includes(key) }))}
        payg={{ rate: bestRate(creditCfg.packs), credits: ws.credits || 0, paidUntil: ws.razorpaySubId && PAID.includes(ws.plan) && ws.periodEnd && new Date(ws.periodEnd) > new Date() ? day(ws.periodEnd) : null }}
      />

      <section className="card mt-8 p-6">
        <h2 className="font-display text-lg font-bold">How changing plan works</h2>
        <dl className={`mt-4 grid gap-5 text-sm ${creditCfg.enabled ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-3'}`}>
          <div><dt className="font-semibold">Upgrading</dt><dd className="mt-1 text-slate">The new plan starts immediately and is charged today; your billing date moves to today.{policy.upgradeRefund ? ' The unused days of your current plan are refunded to your original payment method (5–7 working days).' : ''} Messages already used this month count towards the new, higher limit.</dd></div>
          <div><dt className="font-semibold">Downgrading</dt><dd className="mt-1 text-slate">You keep your current plan until the end of the period you paid for{running ? ` (${day(ws.periodEnd)})` : ''}. The cheaper plan starts then and is charged on that date. If you’ve used more messages than the new limit, sending pauses until the next month.</dd></div>
          {creditCfg.enabled && <div><dt className="font-semibold">Pay as you go</dt><dd className="mt-1 text-slate">No monthly fee: each message uses 1 credit, and credits never expire. From a paid plan, you keep it until the period you paid for ends{running ? ` (${day(ws.periodEnd)})` : ''}, then switch with no further charges. You can go back to a monthly plan any time.</dd></div>}
          <div><dt className="font-semibold">Moving to Free</dt><dd className="mt-1 text-slate">Cancel from the Billing page. You keep your paid plan until the period ends, with no further charges.</dd></div>
        </dl>
      </section>

      {creditCfg.enabled && (
        <section id="credits" className="mt-10 scroll-mt-24">
          <h2 className="font-display text-xl font-bold">Message credits</h2>
          <p className="mt-1 max-w-3xl text-sm text-slate">{current === 'PAYG' ? 'On pay as you go, every message uses 1 credit. Top up whenever you like; credits never expire.' : 'Need more messages without changing plan? Buy credits once. They’re used only after your plan’s monthly messages run out, and they never expire.'} You have <strong className="text-ink">{fmtNum(ws.credits)}</strong> credits.</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {creditCfg.packs.filter((p) => p.credits > 0 && p.price > 0).map((p, i) => (
              <div key={p.id} className="card flex flex-col p-5">
                <p className="font-display text-lg font-bold">{p.name}</p>
                <p className="mt-1"><span className="font-display text-3xl font-bold">{rupees(p.price)}</span><span className="text-sm text-slate"> one time</span></p>
                <p className="mt-1 text-sm text-slate">{fmtNum(p.credits)} messages · {rupees(Math.round((p.price / p.credits) * 10000) / 100)} per 100</p>
                <div className="mt-auto pt-4">{payOn ? <BuyCreditsButton packId={p.id} label={`Buy ${fmtNum(p.credits)} credits`} primary={i === 1} /> : null}</div>
              </div>
            ))}
          </div>
        </section>
      )}
      <p className="mt-8 text-sm text-slate">Every plan includes: {FEATURES_ALL.join(', ').toLowerCase()}. <Link href="/refunds" className="underline">Refund &amp; cancellation policy</Link>.</p>
    </>
  );
}
