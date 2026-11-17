import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { PLANS, PAID, effectivePlan } from '@/lib/plans';
import { getCreditSettings } from '@/lib/credits';
import { rzp } from '@/lib/razorpay';

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Body { to: 'PAYG' } moves the workspace to pay as you go; { to: 'FREE' } moves a pay-as-you-go workspace to Free.
// No payment here: pay as you go has no monthly fee, the client buys credits separately.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { to } = await req.json().catch(() => ({}));
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  if (ws.nextPlan || ws.nextSubId) return NextResponse.json({ error: `A change to ${PLANS[ws.nextPlan]?.name || 'another plan'} is already scheduled. Contact support to change it.` }, { status: 409 });

  if (to === 'FREE') {
    if (ws.plan !== 'PAYG') return NextResponse.json({ error: 'You’re not on pay as you go.' }, { status: 400 });
    await prisma.workspace.update({ where: { id: ws.id }, data: { plan: 'FREE', subStatus: null, periodEnd: null } });
    await audit(ctx, 'billing.plan_changed', 'Free');
    return NextResponse.json({ ok: true, plan: PLANS.FREE.name });
  }
  if (to !== 'PAYG') return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });
  const credits = await getCreditSettings();
  if (!credits.enabled || PLANS.PAYG.active === false) return NextResponse.json({ error: 'Pay as you go isn’t available right now.' }, { status: 400 });
  if (ws.plan === 'PAYG') return NextResponse.json({ error: 'You’re already on pay as you go.' }, { status: 400 });

  // On a paid subscription: keep it until the paid period ends, then switch (no refund, no further charges).
  const paidPeriodLeft = ws.razorpaySubId && PAID.includes(ws.plan) && ws.periodEnd && new Date(ws.periodEnd) > new Date();
  if (paidPeriodLeft) {
    if (['active', 'authenticated'].includes(ws.subStatus)) {
      try {
        await rzp(`/subscriptions/${ws.razorpaySubId}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 1 } });
      } catch (e) {
        console.error('PAYG switch: cancel failed', e.message);
        return NextResponse.json({ error: 'We couldn’t stop your current subscription in Razorpay. Try again, or contact support.' }, { status: 502 });
      }
    }
    await prisma.workspace.update({ where: { id: ws.id }, data: { nextPlan: 'PAYG', nextStartAt: ws.periodEnd } });
    await audit(ctx, 'billing.downgrade_scheduled', `Pay as you go from ${day(ws.periodEnd)}`);
    return NextResponse.json({ ok: true, scheduled: true, startsAt: day(ws.periodEnd), plan: PLANS[effectivePlan(ws)].name });
  }

  // Free, trial, complimentary or an ended subscription: switch now. A free trial keeps running until it ends.
  await prisma.workspace.update({ where: { id: ws.id }, data: { plan: 'PAYG', subStatus: 'active', periodEnd: null, razorpaySubId: null } });
  await audit(ctx, 'billing.plan_changed', PLANS.PAYG.name);
  return NextResponse.json({ ok: true, plan: PLANS.PAYG.name });
}
