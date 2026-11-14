// Simple fixed-window rate limiting stored in Postgres, so it works across serverless instances.
import { NextResponse } from 'next/server';
import { prisma } from './db';

// The visitor's IP as reported by Vercel.
export function clientIp(req) {
  return (req.headers.get('x-real-ip') || req.headers.get('x-forwarded-for')?.split(',')[0] || 'unknown').trim();
}

// Counts one attempt for `key`. Returns true while the key is within `limit` per `windowSec`.
export async function hit(key, limit, windowSec) {
  const now = new Date();
  try {
    const row = await prisma.rateLimit.findUnique({ where: { key } });
    if (!row || row.resetAt <= now) {
      await prisma.rateLimit.upsert({
        where: { key },
        create: { key, count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
        update: { count: 1, resetAt: new Date(now.getTime() + windowSec * 1000) },
      });
      return true;
    }
    const updated = await prisma.rateLimit.update({ where: { key }, data: { count: { increment: 1 } } });
    return updated.count <= limit;
  } catch (e) {
    console.warn('rate limit check failed', e.message);
    return true; // never lock people out because the limiter itself failed
  }
}

// Checks several rules; returns a 429 response if any is over its limit, otherwise null.
export async function limitOr429(rules) {
  for (const [key, limit, windowSec] of rules) {
    if (!(await hit(key, limit, windowSec))) {
      const mins = Math.ceil(windowSec / 60);
      return NextResponse.json({ error: `Too many attempts. Wait ${mins} minute${mins === 1 ? '' : 's'} and try again.` }, { status: 429, headers: { 'Retry-After': String(windowSec) } });
    }
  }
  return null;
}
