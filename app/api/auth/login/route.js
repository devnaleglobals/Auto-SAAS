import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { clientIp, limitOr429 } from '@/lib/ratelimit';

// A real bcrypt hash, so a login for an unknown email takes as long as one for a real account.
const DUMMY_HASH = '$2a$12$CzuKeX1N3/0sZuCJh7iHvemN2kn2PVtXZ9gz1G4BAFaBZBOSN54LC';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email || '').toLowerCase().trim().slice(0, 200);
  const limited = await limitOr429([[`login:ip:${clientIp(req)}`, 20, 900], [`login:email:${e}`, 8, 900]]);
  if (limited) return limited;

  const user = e ? await prisma.user.findUnique({ where: { email: e } }) : null;
  if (user && !user.passwordHash) {
    return NextResponse.json({ error: 'This account uses Instagram or Facebook to sign in. Use the button above.' }, { status: 401 });
  }
  const ok = await bcrypt.compare(String(password || '').slice(0, 200), user?.passwordHash || DUMMY_HASH);
  if (!user || !ok) return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});
  await createSession(user);
  return NextResponse.json({ ok: true });
}
