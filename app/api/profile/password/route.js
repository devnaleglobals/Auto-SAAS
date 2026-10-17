import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireApi } from '@/lib/context';

export async function POST(req) {
  const [ctx, err] = await requireApi('view');
  if (err) return err;
  const { current, next } = await req.json().catch(() => ({}));
  const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
  if (!user.email || !user.passwordHash) return NextResponse.json({ error: 'You sign in with Instagram or Facebook, so there’s no password to change.' }, { status: 400 });
  if (!(await bcrypt.compare(current || '', user.passwordHash))) return NextResponse.json({ error: 'Your current password isn’t right.' }, { status: 400 });
  if (!next || next.length < 8) return NextResponse.json({ error: 'Use at least 8 characters for the new password.' }, { status: 400 });
  if (next === current) return NextResponse.json({ error: 'Choose a password different from your current one.' }, { status: 400 });
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(next, 12) } });
  return NextResponse.json({ ok: true });
}
