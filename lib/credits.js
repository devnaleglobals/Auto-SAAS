// Pay-as-you-go message credits.
// A workspace first uses the messages included in its monthly plan; after that, each message uses 1 credit.
// Credits never expire and carry over between months. Packs and prices are set by the platform admin.
import crypto from 'crypto';
import { prisma } from './db';
import { getSetting } from './settings';
import { paymentConfig } from './razorpay';

export const CREDIT_DEFAULTS = {
  enabled: false,
  lowBalance: 100, // email the client when credits drop below this
  packs: [
    { id: 'p1', name: '1,000 messages', credits: 1000, price: 199 },
    { id: 'p2', name: '5,000 messages', credits: 5000, price: 799 },
    { id: 'p3', name: '20,000 messages', credits: 20000, price: 2499 },
  ],
};

// Lowest price per 100 messages across the packs, e.g. 9.99 (rupees). null when no packs.
export function bestRate(packs = []) {
  const r = packs.filter((p) => p.credits > 0 && p.price > 0).map((p) => (p.price / p.credits) * 100);
  return r.length ? Math.round(Math.min(...r) * 100) / 100 : null;
}

export async function getCreditSettings() {
  const s = await getSetting('credits', {});
  return { ...CREDIT_DEFAULTS, ...s, packs: Array.isArray(s.packs) && s.packs.length ? s.packs : CREDIT_DEFAULTS.packs };
}

// Razorpay checkout signature for one-time orders: HMAC(order_id|payment_id) with the key secret.
export async function verifyOrderSignature(orderId, paymentId, signature) {
  if (!orderId || !paymentId || !signature) return false;
  const { keySecret } = await paymentConfig();
  if (!keySecret) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return expected.length === String(signature).length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(String(signature)));
}

// Marks a credit order paid and adds the credits, exactly once (safe if the checkout and the webhook both arrive).
export async function completeCreditOrder(orderId, { paymentId = null, method = null } = {}) {
  const txn = await prisma.creditTxn.findUnique({ where: { orderId } });
  if (!txn) return { ok: false, reason: 'unknown order' };
  const claimed = await prisma.creditTxn.updateMany({ where: { id: txn.id, status: 'CREATED' }, data: { status: 'PAID', paymentId } });
  if (!claimed.count) return { ok: true, already: true, credits: txn.credits };
  await prisma.workspace.update({ where: { id: txn.workspaceId }, data: { credits: { increment: txn.credits } } });
  if (paymentId) {
    await prisma.payment.upsert({
      where: { razorpayId: paymentId },
      create: { razorpayId: paymentId, workspaceId: txn.workspaceId, plan: 'CREDITS', amount: txn.amount, currency: 'INR', status: 'captured', method },
      update: {},
    }).catch(() => {});
  }
  await prisma.auditLog.create({ data: { workspaceId: txn.workspaceId, action: 'billing.credits_bought', detail: `${txn.credits} credits (${txn.packName || 'pack'})` } }).catch(() => {});
  return { ok: true, credits: txn.credits };
}

// Admin adds or removes credits by hand (refunds, goodwill, corrections).
export async function adjustCredits(workspaceId, delta, note) {
  const ws = await prisma.workspace.findUnique({ where: { id: workspaceId }, select: { credits: true } });
  const change = Math.max(-ws.credits, delta); // never below zero
  await prisma.workspace.update({ where: { id: workspaceId }, data: { credits: { increment: change } } });
  await prisma.creditTxn.create({ data: { workspaceId, kind: 'ADJUST', credits: change, note: note || null } });
  return change;
}
