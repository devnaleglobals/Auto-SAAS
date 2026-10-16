import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, billingConfigured } from '@/lib/razorpay';
import { PAID, PLANS, razorpayPlanId, effectivePlan } from '@/lib/plans';

// Creates a Razorpay subscription and returns Razorpay's hosted payment page.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  if (!billingConfigured()) return NextResponse.json({ error: 'Billing isn’t set up yet. Add the Razorpay keys in Vercel.' }, { status: 503 });
  const { plan } = await req.json();
  if (!PAID.includes(plan) || !razorpayPlanId(plan)) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });

  const ws = ctx.workspace;
  if (effectivePlan(ws) === plan && ws.subStatus === 'active') return NextResponse.json({ error: `You’re already on ${PLANS[plan].name}.` }, { status: 400 });

  // Switching plans: cancel the old subscription at the end of its period, start the new one now.
  if (ws.razorpaySubId && ['active', 'authenticated', 'pending'].includes(ws.subStatus)) {
    await rzp(`/subscriptions/${ws.razorpaySubId}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 0 } }).catch(() => {});
  }
  const sub = await rzp('/subscriptions', {
    method: 'POST',
    body: { plan_id: razorpayPlanId(plan), total_count: 120, quantity: 1, customer_notify: 1, notes: { workspaceId: ws.id, plan } },
  });
  await prisma.workspace.update({ where: { id: ws.id }, data: { razorpaySubId: sub.id, subStatus: sub.status } });
  await audit(ctx, 'billing.checkout_started', PLANS[plan].name);
  return NextResponse.json({ url: sub.short_url });
}
