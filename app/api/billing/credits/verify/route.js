import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';
import { verifyOrderSignature, completeCreditOrder } from '@/lib/credits';

// Called by the checkout popup after payment. The Razorpay webhook (order.paid) does the same as a backup.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const { razorpay_order_id: orderId, razorpay_payment_id: paymentId, razorpay_signature: signature } = await req.json().catch(() => ({}));
  if (!(await verifyOrderSignature(orderId, paymentId, signature))) return NextResponse.json({ error: 'We couldn’t verify this payment. If money was taken, credits are added automatically within a few minutes.' }, { status: 400 });
  const txn = await prisma.creditTxn.findUnique({ where: { orderId } });
  if (!txn || txn.workspaceId !== ctx.workspace.id) return NextResponse.json({ error: 'This payment belongs to a different workspace.' }, { status: 403 });
  const r = await completeCreditOrder(orderId, { paymentId });
  return NextResponse.json({ ok: true, credits: r.credits });
}
