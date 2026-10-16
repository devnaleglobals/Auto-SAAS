import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, billingConfigured, ensureCustomer } from '@/lib/razorpay';
import { PAID, PLANS, razorpayPlanId, effectivePlan } from '@/lib/plans';

// Creates a Razorpay subscription for the workspace. The browser opens Razorpay Checkout with it;
// `url` is Razorpay's hosted page, used if the checkout popup can't load.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  if (!billingConfigured()) return NextResponse.json({ error: 'Payments aren’t switched on yet.' }, { status: 503 });
  const { plan } = await req.json();
  if (!PAID.includes(plan) || !razorpayPlanId(plan)) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });

  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  if (effectivePlan(ws) === plan && ws.subStatus === 'active' && ws.razorpaySubId) return NextResponse.json({ error: `You’re already on ${PLANS[plan].name}.` }, { status: 400 });
  if (!ws.billingName) return NextResponse.json({ error: 'Add your billing details first, so invoices show your business name.', needsDetails: true }, { status: 400 });

  let customerId;
  try { customerId = await ensureCustomer(ws, { name: ctx.user.name, email: ctx.user.email }); }
  catch (e) { return NextResponse.json({ error: `Razorpay couldn’t save your billing details: ${e.message}` }, { status: 502 }); }

  const sub = await rzp('/subscriptions', {
    method: 'POST',
    body: { plan_id: razorpayPlanId(plan), customer_id: customerId, total_count: 120, quantity: 1, customer_notify: 1, notes: { workspaceId: ws.id, plan, previousSubscription: ws.razorpaySubId || '' } },
  });
  await prisma.workspace.update({ where: { id: ws.id }, data: { razorpayCustomerId: customerId } });
  await audit(ctx, 'billing.checkout_started', PLANS[plan].name);
  return NextResponse.json({
    subscriptionId: sub.id,
    url: sub.short_url,
    key: process.env.RAZORPAY_KEY_ID,
    plan: PLANS[plan].name,
    prefill: { name: ws.billingName || ctx.user.name, email: ws.billingEmail || ctx.user.email || '', contact: ws.billingPhone || '' },
  });
}
