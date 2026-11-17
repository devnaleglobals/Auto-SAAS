import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { prisma } from '@/lib/db';
import { clientIp, limitOr429 } from '@/lib/ratelimit';
import { adminPasswordProblem, adminSessionToken, adminCookieOpts, ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminLog } from '@/lib/admin';

const same = (a, b) => { const x = Buffer.from(String(a)); const y = Buffer.from(String(b)); return x.length === y.length && crypto.timingSafeEqual(x, y); };

// Creates the FIRST admin (Owner). Works only while no admin exists, and only with ADMIN_SETUP_TOKEN.
export async function POST(req) {
  const limited = await limitOr429([[`adminsetup:ip:${clientIp(req)}`, 5, 3600]]);
  if (limited) return limited;
  const expected = process.env.ADMIN_SETUP_TOKEN || '';
  if (expected.length < 16) return NextResponse.json({ error: 'Set ADMIN_SETUP_TOKEN (at least 16 characters) in Vercel, redeploy, then try again.' }, { status: 503 });
  if (await prisma.admin.count()) return NextResponse.json({ error: 'An admin already exists. Sign in instead.' }, { status: 409 });
  const { token, name, email, password } = await req.json().catch(() => ({}));
  if (!same(token || '', expected)) return NextResponse.json({ error: 'The setup token is wrong.' }, { status: 401 });
  const e = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  const problem = adminPasswordProblem(password);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const admin = await prisma.admin.create({ data: { email: e, name: String(name || 'Owner').trim().slice(0, 60), passwordHash: await bcrypt.hash(password, 12), role: 'OWNER', lastLoginAt: new Date() } });
  await adminLog(admin, 'admin_created', { detail: `${e} (first owner, via setup)` });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminSessionToken(admin), adminCookieOpts(ADMIN_SESSION_SECONDS));
  return res;
}
