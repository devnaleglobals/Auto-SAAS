import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const { token, password } = await req.json().catch(() => ({}));
  if (!password || password.length < 8) return NextResponse.json({ error: 'Use at least 8 characters.' }, { status: 400 });
  const reset = token ? await prisma.passwordReset.findUnique({ where: { token } }) : null;
  if (!reset || reset.usedAt || reset.expiresAt < new Date()) return NextResponse.json({ error: 'This link has expired. Ask for a new one.' }, { status: 410 });
  const user = await prisma.user.update({ where: { id: reset.userId }, data: { passwordHash: await bcrypt.hash(password, 12) } });
  await prisma.passwordReset.update({ where: { token }, data: { usedAt: new Date() } });
  await createSession(user);
  return NextResponse.json({ ok: true });
}
