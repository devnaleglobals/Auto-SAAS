// What happens when a client changes plan.
//
// Razorpay doesn't allow changing the plan of a UPI or e-mandate subscription, so every change is a new subscription:
//  - NEW       (no paid plan running): the new plan starts now and is charged now.
//  - UPGRADE   (more expensive): starts now and is charged in full now. The old plan stops now and, if the admin keeps
//              "refund unused days" on, the unused part of the last payment is refunded to the original payment method.
//  - DOWNGRADE (cheaper): the client keeps the current plan until the paid period ends; the cheaper plan starts then
//              (first charge on that date). The current subscription is set to end at the period end.
// Monthly message usage counts per calendar month, so a bigger plan's limit applies immediately after an upgrade.
import { prisma } from './db';
import { PLANS, PAID } from './plans';
import { getSetting } from './settings';
import { rzp } from './razorpay';

// A paid plan the client ended to move to pay as you go: once its period is over, make the switch permanent.
export async function settlePaygSwitch(ws) {
  if (!ws || ws.nextPlan !== 'PAYG' || ws.nextSubId || ws.plan === 'PAYG') return ws;
  if (ws.periodEnd && new Date(ws.periodEnd) > new Date() && ['active', 'authenticated', 'cancelled', 'pending', 'halted', 'completed'].includes(ws.subStatus)) return ws;
  const data = { plan: 'PAYG', subStatus: 'active', razorpaySubId: null, periodEnd: null, nextPlan: null, nextStartAt: null };
  await prisma.workspace.updateMany({ where: { id: ws.id, nextPlan: 'PAYG' }, data });
  return { ...ws, ...data };
}

export const getBillingPolicy = async () => ({ upgradeRefund: true, ...(await getSetting('billingPolicy', {})) });

export function hasRunningPaidPlan(ws) {
  return Boolean(ws?.razorpaySubId && PAID.includes(ws.plan) && ['active', 'authenticated'].includes(ws.subStatus) && ws.periodEnd && new Date(ws.periodEnd) > new Date());
}

// Unused value (in paise) of the last subscription payment, from now until the period ends.
export async function unusedValue(ws) {
  if (!hasRunningPaidPlan(ws)) return { amount: 0, payment: null };
  const payment = await prisma.payment.findFirst({
    where: { workspaceId: ws.id, subscriptionId: ws.razorpaySubId, status: 'captured', plan: { not: 'CREDITS' } },
    orderBy: { createdAt: 'desc' },
  });
  if (!payment) return { amount: 0, payment: null };
  const start = payment.createdAt.getTime();
  const end = new Date(ws.periodEnd).getTime();
  const now = Date.now();
  if (end <= start || now >= end) return { amount: 0, payment };
  const fraction = Math.min(1, Math.max(0, (end - now) / (end - start)));
  return { amount: Math.floor(payment.amount * fraction), payment };
}

export async function describeChange(ws, plan) {
  if (!PLANS[plan]) return { kind: 'invalid' };
  if (ws.nextSubId || ws.nextPlan) return { kind: 'pending', nextPlan: ws.nextPlan, startsAt: ws.nextStartAt };
  const running = hasRunningPaidPlan(ws);
  if (running && ws.plan === plan) return { kind: 'same' };
  const price = PLANS[plan].price;
  if (!running) return { kind: 'new', chargeNow: price, refund: 0, startsAt: new Date() };
  if (price > PLANS[ws.plan].price) {
    const policy = await getBillingPolicy();
    const { amount } = policy.upgradeRefund ? await unusedValue(ws) : { amount: 0 };
    return { kind: 'upgrade', chargeNow: price, refund: Math.round(amount / 100), startsAt: new Date() };
  }
  return { kind: 'downgrade', chargeNow: 0, refund: 0, startsAt: new Date(ws.periodEnd), chargeLater: price };
}

// Refunds the unused part of the old plan after an upgrade. Returns rupees refunded (0 if none).
export async function refundUnused(ws) {
  const policy = await getBillingPolicy();
  if (!policy.upgradeRefund) return 0;
  const { amount, payment } = await unusedValue(ws);
  if (!payment || amount < 100) return 0; // under ₹1: nothing to refund
  try {
    await rzp(`/payments/${payment.razorpayId}/refund`, { method: 'POST', body: { amount, speed: 'normal', notes: { reason: 'Unused days after plan upgrade', workspaceId: ws.id } } });
    await prisma.payment.update({ where: { id: payment.id }, data: { status: 'partially_refunded' } }).catch(() => {});
    await prisma.auditLog.create({ data: { workspaceId: ws.id, action: 'billing.refund_unused', detail: `₹${(amount / 100).toFixed(2)} for unused days of ${PLANS[ws.plan]?.name || ws.plan}` } }).catch(() => {});
    return Math.round(amount / 100);
  } catch (e) {
    console.error('Refund of unused days failed', ws.id, e.message);
    await prisma.auditLog.create({ data: { workspaceId: ws.id, action: 'billing.refund_failed', detail: `₹${(amount / 100).toFixed(2)}: ${e.message}`.slice(0, 300) } }).catch(() => {});
    return 0;
  }
}

// Moves a workspace onto a new, now-active subscription (new plan or upgrade) exactly once, even if the
// checkout confirmation and the Razorpay webhook arrive together. The winner refunds unused days and stops the old one.
export async function activateSubscription(ws, sub, plan) {
  const old = ws.razorpaySubId || null;
  const periodEnd = sub.current_end ? new Date(sub.current_end * 1000) : new Date(Date.now() + 31 * 86400000);
  const claimed = await prisma.workspace.updateMany({
    where: { id: ws.id, razorpaySubId: old },
    data: { plan, subStatus: 'active', razorpaySubId: sub.id, periodEnd },
  });
  if (!claimed.count || !old || old === sub.id) return { refunded: 0 };
  const refunded = await refundUnused(ws);
  await rzp(`/subscriptions/${old}/cancel`, { method: 'POST', body: { cancel_at_cycle_end: 0 } }).catch(() => {});
  return { refunded };
}
