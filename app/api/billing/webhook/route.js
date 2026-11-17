import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { verifyWebhook } from '@/lib/razorpay';
import { planFromRazorpayId, loadPlans, PLANS, rupees } from '@/lib/plans';
import { alertPayment } from '@/lib/notify';
import { completeCreditOrder } from '@/lib/credits';
import { activateSubscription } from '@/lib/planChange';

export const dynamic = 'force-dynamic';

// Razorpay → Settings → Webhooks: this URL, your webhook secret, and the subscription.* events.
export async function POST(req) {
  const raw = await req.text();
  if (!(await verifyWebhook(raw, req.headers.get('x-razorpay-signature')))) return new Response('Invalid signature', { status: 401 });
  await loadPlans();
  let body;
  try { body = JSON.parse(raw); } catch { return new Response('Bad JSON', { status: 400 }); }
  // Pay-as-you-go credit packs (one-time orders).
  if (body.event === 'order.paid' || body.event === 'payment.captured') {
    const order = body.payload?.order?.entity;
    const pay = body.payload?.payment?.entity;
    const orderId = order?.id || pay?.order_id;
    if (orderId && (order?.notes?.kind === 'credits' || pay?.notes?.kind === 'credits' || (await prisma.creditTxn.findUnique({ where: { orderId } })))) {
      await completeCreditOrder(orderId, { paymentId: pay?.id || null, method: pay?.method || null });
    }
    return NextResponse.json({ ok: true });
  }

  const sub = body.payload?.subscription?.entity;
  if (!sub?.id) return NextResponse.json({ ok: true });

  const ws = await prisma.workspace.findFirst({ where: { OR: [{ razorpaySubId: sub.id }, { nextSubId: sub.id }, { id: sub.notes?.workspaceId || '__none__' }] } });
  if (!ws) return NextResponse.json({ ok: true });

  // Scheduled downgrade: the new subscription takes over only when its first charge succeeds.
  if (ws.nextSubId === sub.id) {
    if (['subscription.activated', 'subscription.charged'].includes(body.event)) {
      const nextPlan = planFromRazorpayId(sub.plan_id) || ws.nextPlan;
      await prisma.workspace.update({ where: { id: ws.id }, data: {
        plan: nextPlan, subStatus: 'active', razorpaySubId: sub.id, periodEnd: sub.current_end ? new Date(sub.current_end * 1000) : ws.periodEnd,
        nextPlan: null, nextSubId: null, nextStartAt: null,
      } });
      const p = body.payload?.payment?.entity;
      if (p?.id) {
        await prisma.payment.upsert({ where: { razorpayId: p.id }, create: { razorpayId: p.id, workspaceId: ws.id, invoiceId: p.invoice_id || null, subscriptionId: sub.id, plan: nextPlan, amount: p.amount || 0, currency: p.currency || 'INR', status: p.status || 'captured', method: p.method || null }, update: {} }).catch(() => {});
        await alertPayment(ws.id, 'success', { plan: PLANS[nextPlan]?.name || nextPlan, amount: rupees(p.amount / 100) }).catch(() => {});
      }
      await prisma.auditLog.create({ data: { workspaceId: ws.id, action: 'billing.downgrade_started', detail: PLANS[nextPlan]?.name || nextPlan } }).catch(() => {});
    } else if (['subscription.cancelled', 'subscription.halted'].includes(body.event)) {
      await prisma.workspace.update({ where: { id: ws.id }, data: { nextPlan: null, nextSubId: null, nextStartAt: null } });
      await alertPayment(ws.id, 'failed').catch(() => {});
    }
    return NextResponse.json({ ok: true }); // "authenticated" etc.: nothing changes until it starts
  }
  const plan = planFromRazorpayId(sub.plan_id) || sub.notes?.plan || ws.plan;

  // An event for a subscription other than the current one.
  if (ws.razorpaySubId && ws.razorpaySubId !== sub.id) {
    // The new subscription of an upgrade became active: switch over (refund unused days, stop the old one) once.
    if (['subscription.activated', 'subscription.charged'].includes(body.event) && sub.notes?.previousSubscription === ws.razorpaySubId) {
      await activateSubscription(ws, sub, plan);
      const p = body.payload?.payment?.entity;
      if (p?.id) {
        await prisma.payment.upsert({ where: { razorpayId: p.id }, create: { razorpayId: p.id, workspaceId: ws.id, invoiceId: p.invoice_id || null, subscriptionId: sub.id, plan, amount: p.amount || 0, currency: p.currency || 'INR', status: p.status || 'captured', method: p.method || null }, update: {} }).catch(() => {});
        await alertPayment(ws.id, 'success', { plan: PLANS[plan]?.name || plan, amount: rupees(p.amount / 100) }).catch(() => {});
      }
    }
    // Otherwise it's the old plan's subscription ending, or a new one not paid yet: nothing to change.
    return NextResponse.json({ ok: true });
  }
  const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : ws.periodEnd;
  const data = { razorpaySubId: sub.id, subStatus: sub.status, periodEnd };

  switch (body.event) {
    case 'subscription.authenticated':
      // Mandate set up, first charge not yet confirmed: record it, but don't grant the plan until "activated" or "charged".
      data.subStatus = ws.subStatus === 'active' && ws.razorpaySubId === sub.id ? 'active' : 'authenticated';
      break;
    case 'subscription.activated':
    case 'subscription.charged':
      Object.assign(data, { plan, subStatus: 'active' });
      if (body.payload?.payment?.entity?.amount) await alertPayment(ws.id, 'success', { plan: PLANS[plan]?.name || plan, amount: rupees(body.payload.payment.entity.amount / 100) }).catch(() => {});
      break;
    case 'subscription.resumed':
      Object.assign(data, { plan, subStatus: 'active' });
      break;
    case 'subscription.pending':
    case 'subscription.halted':
      await alertPayment(ws.id, 'failed').catch(() => {});
      break;
    case 'subscription.cancelled':
    case 'subscription.completed':
      if (!ws.nextSubId) await alertPayment(ws.id, 'cancelled').catch(() => {}); // a scheduled downgrade isn't a cancellation
      break;
    default:
      break;
  }
  await prisma.workspace.update({ where: { id: ws.id }, data });

  // Record the payment for the client's history and platform revenue.
  const pay = body.payload?.payment?.entity;
  if (pay?.id) {
    const rec = {
      workspaceId: ws.id, invoiceId: pay.invoice_id || null, subscriptionId: sub.id, plan,
      amount: pay.amount || 0, currency: pay.currency || 'INR', status: pay.status || 'captured', method: pay.method || null,
    };
    await prisma.payment.upsert({ where: { razorpayId: pay.id }, create: { razorpayId: pay.id, ...rec }, update: rec }).catch(() => {});
  }
  await prisma.auditLog.create({ data: { workspaceId: ws.id, action: `billing.${body.event.split('.')[1]}`, detail: plan } }).catch(() => {});
  return NextResponse.json({ ok: true });
}
