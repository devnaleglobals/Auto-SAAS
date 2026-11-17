import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { clientIp, limitOr429 } from '@/lib/ratelimit';
import { adminSessionToken, twoFactorTicket, adminCookieOpts, ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminLog } from '@/lib/admin';

const DUMMY = '$2a$12$CzuKeX1N3/0sZuCJh7iHvemN2kn2PVtXZ9gz1G4BAFaBZBOSN54LC';

// Step 1 of the admin login: email + password. Returns { needs2fa, ticket } when 2-step is on.
export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  const e = String(email || '').toLowerCase().trim().slice(0, 200);
  const limited = await limitOr429([[`adminlogin:ip:${clientIp(req)}`, 10, 900], [`adminlogin:email:${e}`, 5, 900]]);
  if (limited) return limited;
  const admin = e ? await prisma.admin.findUnique({ where: { email: e } }) : null;
  const ok = await bcrypt.compare(String(password || '').slice(0, 200), admin?.passwordHash || DUMMY);
  if (!admin || !ok || !admin.active) {
    console.warn('admin login failed', e, clientIp(req));
    return NextResponse.json({ error: 'Email or password is incorrect.' }, { status: 401 });
  }
  if (admin.totpEnabled) return NextResponse.json({ needs2fa: true, ticket: await twoFactorTicket(admin) });
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await adminLog(admin, 'admin_login', { detail: clientIp(req) });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminSessionToken(admin), adminCookieOpts(ADMIN_SESSION_SECONDS));
  return res;
}
