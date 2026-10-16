import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp } from '@/lib/razorpay';

// Cancels at the end of the paid period; the plan stays active until then.
export async function POST() {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const ws = ctx.workspace;
  if (!ws.razorpaySubId) return NextResponse.json({ error: 'There is no paid plan to cancel.' }, { status: 400 });
  await rzp(`/subscriptions/${ws.razorpaySubId}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 1 } });
  await prisma.workspace.update({ where: { id: ws.id }, data: { subStatus: 'cancelled' } });
  await audit(ctx, 'billing.cancelled', ws.plan);
  return NextResponse.json({ ok: true });
}
