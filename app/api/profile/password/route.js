import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireApi, audit } from '@/lib/context';
import { createSession } from '@/lib/auth';
import { limitOr429 } from '@/lib/ratelimit';

export async function POST(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const limited = await limitOr429([[`pwchange:${ctx.user.id}`, 10, 900]]);
  if (limited) return limited;
  const { current, next } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
  if (!user.email || !user.passwordHash) return NextResponse.json({ error: 'You sign in with Instagram or Facebook, so there’s no password to change.' }, { status: 400 });
  if (!(await bcrypt.compare(String(current || '').slice(0, 200), user.passwordHash))) return NextResponse.json({ error: 'Your current password isn’t right.' }, { status: 400 });
  if (!next || next.length < 8) return NextResponse.json({ error: 'Use at least 8 characters for the new password.' }, { status: 400 });
  if (next.length > 72) return NextResponse.json({ error: 'Use 72 characters or fewer.' }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'Choose a password different from your current one.' }, { status: 400 });
  // Signs out every other device; this browser gets a fresh session.
  const updated = await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12), sessionVersion: { increment: 1 } } });
  await createSession(updated);
  await audit(ctx, 'profile.password_changed', null);
  return NextResponse.json({ ok: true });
}
