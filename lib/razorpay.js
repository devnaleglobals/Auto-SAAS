import crypto from 'crypto';
import { getSetting, openSecret } from './settings';

// Razorpay keys: set by the platform admin (Admin → Settings → Payments, stored encrypted),
// otherwise the RAZORPAY_* environment variables.
export async function paymentConfig() {
  const p = await getSetting('payments', {});
  const keyId = (p.keyId || process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = openSecret(p.keySecret) || process.env.RAZORPAY_KEY_SECRET || '';
  const webhookSecret = openSecret(p.webhookSecret) || process.env.RAZORPAY_WEBHOOK_SECRET || '';
  return { keyId, keySecret, webhookSecret, mode: keyId.startsWith('rzp_live_') ? 'Live' : 'Test', source: p.keyId ? 'admin' : 'env', paymentsOn: p.enabled !== false };
}

export async function rzp(path, { method = 'GET', body } = {}) {
  const { keyId, keySecret } = await paymentConfig();
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method, cache: 'no-store',
    headers: { Authorization: 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64'), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay error ${res.status}`);
  return data;
}

export async function verifyWebhook(rawBody, signature) {
  const { webhookSecret } = await paymentConfig();
  if (!signature || !webhookSecret) return false;
  const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export async function billingConfigured() {
  const c = await paymentConfig();
  return Boolean(c.paymentsOn && c.keyId && c.keySecret);
}

// Checkout signature for subscriptions: HMAC(payment_id|subscription_id) with the key secret.
export async function verifyCheckoutSignature(paymentId, subscriptionId, signature) {
  if (!paymentId || !subscriptionId || !signature) return false;
  const { keySecret } = await paymentConfig();
  if (!keySecret) return false;
  const expected = crypto.createHmac('sha256', keySecret).update(`${paymentId}|${subscriptionId}`).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

// Creates (or reuses) the Razorpay customer for a workspace, with GST details for invoices.
export async function ensureCustomer(ws, fallback) {
  const name = (ws.billingName || ws.name || fallback?.name || 'Customer').slice(0, 50);
  const email = ws.billingEmail || fallback?.email || undefined;
  const contact = ws.billingPhone || undefined;
  const gstin = ws.billingGstin || undefined;
  if (ws.razorpayCustomerId) {
    // Reuse the saved customer only if these API keys can see it (Test and Live mode are separate).
    const ok = await rzp(`/customers/${ws.razorpayCustomerId}`, { method: 'PUT', body: { name, ...(email ? { email } : {}), ...(contact ? { contact } : {}) } })
      .then(() => true).catch(() => false);
    if (ok) return ws.razorpayCustomerId;
  }
  const c = await rzp('/customers', {
    method: 'POST',
    body: { name, ...(email ? { email } : {}), ...(contact ? { contact } : {}), ...(gstin ? { gstin } : {}), fail_existing: '0', notes: { workspaceId: ws.id } },
  });
  return c.id;
}
