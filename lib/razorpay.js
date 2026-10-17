import crypto from 'crypto';

const auth = () => 'Basic ' + Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString('base64');

export async function rzp(path, { method = 'GET', body } = {}) {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method, cache: 'no-store',
    headers: { Authorization: auth(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.description || `Razorpay error ${res.status}`);
  return data;
}

export function verifyWebhook(rawBody, signature) {
  if (!signature || !process.env.RAZORPAY_WEBHOOK_SECRET) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET).update(rawBody).digest('hex');
  return expected.length === signature.length && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}

export const billingConfigured = () => Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);

// Checkout signature for subscriptions: HMAC(payment_id|subscription_id) with the key secret.
export function verifyCheckoutSignature(paymentId, subscriptionId, signature) {
  if (!paymentId || !subscriptionId || !signature) return false;
  const expected = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || '').update(`${paymentId}|${subscriptionId}`).digest('hex');
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
