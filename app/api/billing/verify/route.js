import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, verifyCheckoutSignature } from '@/lib/razorpay';
import { planFromRazorpayId, PLANS } from '@/lib/plans';

// Called by the checkout popup after payment. Activates the plan right away;
// the Razorpay webhook confirms and records renewals later.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { razorpay_payment_id: paymentId, razorpay_subscription_id: subId, razorpay_signature: signature } = await req.json().catch(() => ({}));
  if (!verifyCheckoutSignature(paymentId, subId, signature)) return NextResponse.json({ error: 'We couldn’t verify this payment. If money was taken, it will be confirmed automatically within a few minutes.' }, { status: 400 });

  const sub = await rzp(`/subscriptions/${subId}`);
  if (sub.notes?.workspaceId !== ctx.workspace.id) return NextResponse.json({ error: 'This payment belongs to a different workspace.' }, { status: 403 });
  const plan = planFromRazorpayId(sub.plan_id) || sub.notes?.plan;
  const old = ctx.workspace.razorpaySubId;

  await prisma.workspace.update({
    where: { id: ctx.workspace.id },
    data: { plan, subStatus: 'active', razorpaySubId: subId, periodEnd: sub.current_end ? new Date(sub.current_end * 1000) : new Date(Date.now() + 31 * 86400000) },
  });
  // Switching plans: stop the previous subscription now that the new one is paid.
  if (old && old !== subId) await rzp(`/subscriptions/${old}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 0 } }).catch(() => {});
  await audit(ctx, 'billing.activated', PLANS[plan]?.name || plan);
  return NextResponse.json({ ok: true, plan: PLANS[plan]?.name || plan });
}
