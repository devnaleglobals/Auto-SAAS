import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { rzp, billingConfigured, paymentConfig } from '@/lib/razorpay';
import { getCreditSettings } from '@/lib/credits';
import { limitOr429 } from '@/lib/ratelimit';

// Starts a pay-as-you-go credit purchase: creates a Razorpay order for the chosen pack.
// The price always comes from the admin settings, never from the browser.
export async function POST(req) {
  const [ctx, err] = await requireApi('manageWorkspace');
  if (err) return err;
  const limited = await limitOr429([[`credits:${ctx.workspace.id}`, 20, 3600]]);
  if (limited) return limited;
  const cfg = await getCreditSettings();
  if (!cfg.enabled || !(await billingConfigured())) return NextResponse.json({ error: 'Message credits aren’t available right now.' }, { status: 503 });
  const { packId } = await req.json().catch(() => ({}));
  const pack = cfg.packs.find((p) => p.id === packId);
  if (!pack || !(pack.credits > 0) || !(pack.price > 0)) return NextResponse.json({ error: 'Choose a credit pack.' }, { status: 400 });
  const ws = ctx.workspace;
  if (!ws.billingName) return NextResponse.json({ error: 'Add your billing details first, so receipts show your business name.', needsDetails: true }, { status: 400 });

  let order;
  try {
    order = await rzp('/orders', {
      method: 'POST',
      body: { amount: Math.round(pack.price * 100), currency: 'INR', receipt: `cr_${Date.now().toString(36)}`, notes: { kind: 'credits', workspaceId: ws.id, packId: pack.id, credits: String(pack.credits) } },
    });
  } catch (e) {
    console.error('Razorpay order failed', e.message);
    return NextResponse.json({ error: 'Payments are temporarily unavailable. Please try again or contact support.' }, { status: 502 });
  }
  await prisma.creditTxn.create({ data: { workspaceId: ws.id, kind: 'PURCHASE', credits: pack.credits, amount: order.amount, packName: pack.name, orderId: order.id, status: 'CREATED' } });
  await audit(ctx, 'billing.credits_checkout', pack.name);
  const pay = await paymentConfig();
  return NextResponse.json({
    orderId: order.id, amount: order.amount, key: pay.keyId, description: `${pack.name} (message credits)`,
    prefill: { name: ws.billingName || ctx.user.name, email: ws.billingEmail || ctx.user.email || '', contact: ws.billingPhone || '' },
  });
}
