import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhook } from '@/lib/razorpay';
import { planFromRazorpayId } from '@/lib/plans';
import { alertPayment } from '@/lib/notify';

export const dynamic = 'force-dynamic';

// Razorpay → Settings → Webhooks: this URL, your webhook secret, and the subscription.* events.
export async function POST(req) {
  const raw = await req.text();
  if (!verifyWebhook(raw, req.headers.get('x-razorpay-signature'))) return new Response('Invalid signature', { status: 401 });
  const body = JSON.parse(raw);
  const sub = body.payload?.subscription?.entity;
  if (!sub?.id) return NextResponse.json({ ok: true });

  const ws = await prisma.workspace.findFirst({ where: { OR: [{ razorpaySubId: sub.id }, { id: sub.notes?.workspaceId || '__none__' }] } });
  if (!ws) return NextResponse.json({ ok: true });
  // Ignore events for an older subscription after the customer switched plans.
  if (ws.razorpaySubId && ws.razorpaySubId !== sub.id) return NextResponse.json({ ok: true });

  const plan = planFromRazorpayId(sub.plan_id) || sub.notes?.plan || ws.plan;
  const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : ws.periodEnd;
  const data = { razorpaySubId: sub.id, subStatus: sub.status, periodEnd };

  switch (body.event) {
    case 'subscription.authenticated':
    case 'subscription.activated':
    case 'subscription.charged':
    case 'subscription.resumed':
      Object.assign(data, { plan, subStatus: 'active' });
      break;
    case 'subscription.pending':
    case 'subscription.halted':
      await alertPayment(ws.id, 'failed').catch(() => {});
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      await alertPayment(ws.id, 'cancelled').catch(() => {});
      break;
    default:
      break;
  }
  await prisma.workspace.update({ where: { id: ws.id }, data });
  await prisma.auditLog.create({ data: { workspaceId: ws.id, action: `billing.${body.event.split('.')[1]}`, detail: plan } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
