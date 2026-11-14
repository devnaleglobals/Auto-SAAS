// Meta "signed_request" used by the Deauthorize and Data Deletion callbacks (Facebook Login and Instagram Login).
import crypto from 'crypto';

const b64url = (s) => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

function verify(signedRequest, secret) {
  if (!secret || typeof signedRequest !== 'string' || !signedRequest.includes('.')) return null;
  const [sig, payload] = signedRequest.split('.', 2);
  const expected = crypto.createHmac('sha256', secret).update(payload).digest();
  const given = b64url(sig);
  if (given.length !== expected.length || !crypto.timingSafeEqual(given, expected)) return null;
  try {
    const data = JSON.parse(b64url(payload).toString('utf8'));
    return data?.algorithm?.toUpperCase() === 'HMAC-SHA256' ? data : null;
  } catch {
    return null;
  }
}

// Returns { platform, userId, data } or null. Tries the Facebook app secret, then the Instagram app secret.
export async function parseSignedRequest(req) {
  let signed = null;
  const type = req.headers.get('content-type') || '';
  if (type.includes('application/json')) signed = (await req.json().catch(() => ({}))).signed_request;
  else signed = (await req.formData().catch(() => null))?.get('signed_request');
  if (!signed) return null;
  for (const [platform, secret] of [['FACEBOOK', process.env.FB_APP_SECRET], ['INSTAGRAM', process.env.IG_APP_SECRET]]) {
    const data = verify(String(signed), secret);
    if (data?.user_id) return { platform, userId: String(data.user_id), data };
  }
  return null;
}
