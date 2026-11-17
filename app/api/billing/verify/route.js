import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, verifyCheckoutSignature } from '@/lib/razorpay';
import { planFromRazorpayId, PLANS } from '@/lib/plans';
import { activateSubscription } from '@/lib/planChange';

const day = (d) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' });

// Called by the checkout popup after payment/authorisation. The Razorpay webhook confirms everything again later.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { razorpay_payment_id: paymentId, razorpay_subscription_id: subId, razorpay_signature: signature } = await req.json().catch(() => ({}));
  if (!(await verifyCheckoutSignature(paymentId, subId, signature))) return NextResponse.json({ error: 'We couldn’t verify this payment. If money was taken, it will be confirmed automatically within a few minutes.' }, { status: 400 });

  const sub = await rzp(`/subscriptions/${subId}`);
  if (sub.notes?.workspaceId !== ctx.workspace.id) return NextResponse.json({ error: 'This payment belongs to a different workspace.' }, { status: 403 });
  const plan = planFromRazorpayId(sub.plan_id) || sub.notes?.plan;
  const ws = await prisma.workspace.findUnique({ where: { id: ctx.workspace.id } });
  const old = ws.razorpaySubId;

  // Downgrade: keep the current plan until it ends; the new subscription starts (and is first charged) then.
  const startsLater = sub.start_at && sub.start_at * 1000 > Date.now() + 60_000;
  if (sub.notes?.kind === 'downgrade' || startsLater) {
    const startsAt = new Date((sub.start_at || Date.now() / 1000) * 1000);
    await prisma.workspace.update({ where: { id: ws.id }, data: { nextPlan: plan, nextSubId: subId, nextStartAt: startsAt } });
    if (old && old !== subId) await rzp(`/subscriptions/${old}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 1 } }).catch((e) => console.error('cancel at cycle end failed', e.message));
    await audit(ctx, 'billing.downgrade_scheduled', `${PLANS[plan]?.name || plan} from ${day(startsAt)}`);
    return NextResponse.json({ ok: true, scheduled: true, plan: PLANS[plan]?.name || plan, startsAt: day(startsAt) });
  }

  // New plan or upgrade: starts now. Refund the unused days of the old plan (if the admin allows), then stop it.
  const { refunded } = await activateSubscription(ws, sub, plan);
  await audit(ctx, 'billing.activated', PLANS[plan]?.name || plan);
  return NextResponse.json({ ok: true, plan: PLANS[plan]?.name || plan, refunded });
}
