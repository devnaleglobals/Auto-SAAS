import crypto from 'crypto';

function key() {
  const k = process.env.ENCRYPTION_KEY || '';
  if (k.length !== 64) throw new Error('ENCRYPTION_KEY must be 32 bytes as 64 hex characters');
  return Buffer.from(k, 'hex');
}

export function encrypt(plain) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map((b) => b.toString('base64')).join('.');
}

export function decrypt(payload) {
  const [iv, tag, enc] = payload.split('.').map((s) => Buffer.from(s, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(enc), decipher.final()]).toString('utf8');
}

export function verifyMetaSignature(rawBody, header, secret) {
  if (!header || !header.startsWith('sha256=')) return false;
  const expected = crypto.createHmac('sha256', secret || '').update(rawBody).digest('hex');
  const given = header.slice(7);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}
