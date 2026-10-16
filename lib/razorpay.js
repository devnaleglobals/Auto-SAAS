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
