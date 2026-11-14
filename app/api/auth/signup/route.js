import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { createSession } from '@/lib/auth';
import { createWorkspaceFor } from '@/lib/context';
import { clientIp, limitOr429 } from '@/lib/ratelimit';

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export async function POST(req) {
  const limited = await limitOr429([[`signup:ip:${clientIp(req)}`, 10, 3600]]);
  if (limited) return limited;
  const { name, email, password, company, acceptTerms } = await req.json().catch(() => ({}));
  const n = String(name || '').trim().slice(0, 60);
  const e = String(email || '').toLowerCase().trim();
  const p = String(password || '');
  if (!n || !e || !p) return NextResponse.json({ error: 'Name, email and password are required.' }, { status: 400 });
  if (!EMAIL.test(e) || e.length > 200) return NextResponse.json({ error: 'Check your email address.' }, { status: 400 });
  if (p.length < 8) return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 });
  if (p.length > 72) return NextResponse.json({ error: 'Password must be 72 characters or fewer.' }, { status: 400 });
  if (!acceptTerms) return NextResponse.json({ error: 'Please accept the Terms of Service and Privacy Policy to continue.' }, { status: 400 });
  if (await prisma.user.findUnique({ where: { email: e } })) {
    return NextResponse.json({ error: 'An account with this email already exists. Log in instead.' }, { status: 409 });
  }
  const user = await prisma.user.create({ data: { name: n, email: e, passwordHash: await bcrypt.hash(p, 12), termsAcceptedAt: new Date() } });
  await createWorkspaceFor(user, String(company || '').trim().slice(0, 60) || null);
  await createSession(user);
  return NextResponse.json({ ok: true });
}
