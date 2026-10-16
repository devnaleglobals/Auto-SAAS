import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';

export async function POST(req) {
  const { email, password } = await req.json();
  const user = await prisma.user.findUnique({ where: { email: (email || '').toLowerCase().trim() } });
  if (user && !user.passwordHash) {
    return NextResponse.json({ error: 'This account uses Instagram or Facebook to sign in. Use the button above.' }, { status: 401 });
  }
  if (!user || !(await bcrypt.compare(password || '', user.passwordHash))) {
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
  await createSession(user);
  return NextResponse.json({ ok: true });
}
