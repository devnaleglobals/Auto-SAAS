import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { clientIp, limitOr429 } from '@/lib/ratelimit';

const hashToken = (t) => crypto.createHash('sha256').update(String(t)).digest('hex');

export async function POST(req) {
  const limited = await limitOr429([[`reset:ip:${clientIp(req)}`, 20, 3600]]);
  if (limited) return limited;
  const { token, password } = await req.json().catch(() => ({}));
  const p = String(password || '');
  if (p.length < 8) return NextResponse.json({ error: 'Use at least 8 characters.' }, { status: 400 });
  if (p.length > 72) return NextResponse.json({ error: 'Use 72 characters or fewer.' }, { status: 400 });
  const key = token ? hashToken(token) : null;
  const reset = key ? await prisma.passwordReset.findUnique({ where: { token: key } }) : null;
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return NextResponse.json({ error: 'This link has expired. Ask for a new one.' }, { status: 410 });
  await prisma.passwordReset.update({ where: { token: key }, data: { usedAt: new Date() } });
  // New password + new session version: every other device is signed out.
  const user = await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(p, 12), sessionVersion: { increment: 1 } } });
  await createSession(user);
  return NextResponse.json({ ok: true });
}
