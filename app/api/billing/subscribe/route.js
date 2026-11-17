import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, billingConfigured, ensureCustomer, paymentConfig } from '@/lib/razorpay';
import { PAID, PLANS, razorpayPlanId } from '@/lib/plans';
import { describeChange } from '@/lib/planChange';

// Creates a Razorpay subscription for the workspace. The browser opens Razorpay Checkout with it;
// `url` is Razorpay's hosted page, used if the checkout popup can't load.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  if (!(await billingConfigured())) return NextResponse.json({ error: 'Payments aren’t switched on yet.' }, { status: 503 });
  const { plan } = await req.json().catch(() => ({}));
  if (!PAID.includes(plan) || !razorpayPlanId(plan) || PLANS[plan]?.active === false) return NextResponse.json({ error: 'Choose a plan.' }, { status: 400 });

  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const change = await describeChange(ws, plan);
  if (change.kind === 'same') return NextResponse.json({ error: `You’re already on ${PLANS[plan].name}.` }, { status: 400 });
  if (change.kind === 'pending') return NextResponse.json({ error: `A change to ${PLANS[ws.nextPlan]?.name || ws.nextPlan} is already scheduled. Contact support to change it.` }, { status: 409 });
  if (!ws.billingName) return NextResponse.json({ error: 'Add your billing details first, so invoices show your business name.', needsDetails: true }, { status: 400 });

  // Check the plan exists for these keys first, so a wrong ID gives a clear message.
  const planId = razorpayPlanId(plan).trim();
  const pay = await paymentConfig();
  const keyMode = pay.mode;
  try { await rzp(`/plans/${planId}`); }
  catch (e) {
    console.error('Razorpay plan check failed', plan, planId, e.message);
    console.error(`Razorpay can't find the ${plan} plan (${planId}) with ${keyMode} mode keys. Set a ${keyMode}-mode plan ID in Admin → Settings → Plans.`);
    return NextResponse.json({ error: 'This plan can’t be bought right now. Please contact support.' }, { status: 502 });
  }

  let customerId;
  try { customerId = await ensureCustomer(ws, { name: ctx.user.name, email: ctx.user.email }); }
  catch (e) {
    console.error('Razorpay customer failed', e.message);
    return NextResponse.json({ error: /authentication/i.test(e.message) ? 'Payments are temporarily unavailable. Please contact support.' : `Razorpay couldn’t save your billing details: ${e.message}` }, { status: 502 });
  }

  let sub;
  try {
    sub = await rzp('/subscriptions', {
      method: 'POST',
      body: {
        plan_id: planId, customer_id: customerId, total_count: 120, quantity: 1, customer_notify: 1,
        // Downgrade: the cheaper plan's first charge is on the day the current paid period ends.
        ...(change.kind === 'downgrade' ? { start_at: Math.floor(new Date(ws.periodEnd).getTime() / 1000) } : {}),
        notes: { workspaceId: ws.id, plan, kind: change.kind, previousSubscription: ws.razorpaySubId || '' },
      },
    });
  } catch (e) {
    console.error('Razorpay subscription failed', plan, razorpayPlanId(plan), e.message);
    const hint = '';
    return NextResponse.json({ error: `Razorpay couldn’t start the subscription: ${e.message}.${hint}` }, { status: 502 });
  }
  await prisma.workspace.update({ where: { id: ws.id }, data: { razorpayCustomerId: customerId } });
  await audit(ctx, 'billing.checkout_started', PLANS[plan].name);
  return NextResponse.json({
    subscriptionId: sub.id,
    url: sub.short_url,
    key: pay.keyId,
    plan: PLANS[plan].name,
    change: { kind: change.kind, startsAt: change.startsAt },
    prefill: { name: ws.billingName || ctx.user.name, email: ws.billingEmail || ctx.user.email || '', contact: ws.billingPhone || '' },
  });
}
