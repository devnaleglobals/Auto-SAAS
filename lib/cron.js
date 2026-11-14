// Cron endpoints accept the secret as `Authorization: Bearer <CRON_SECRET>` (Vercel Cron) or `?key=` (cron-job.org).
import crypto from 'crypto';

const same = (a, b) => {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && crypto.timingSafeEqual(x, y);
};

export function cronAuthorized(req) {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16) return false; // refuse to run unprotected
  const key = new URL(req.url).searchParams.get('key');
  return same(req.headers.get('authorization'), `Bearer ${secret}`) || same(key, secret);
}

export const unauthorized = () => new Response('Unauthorized', { status: 401 });
