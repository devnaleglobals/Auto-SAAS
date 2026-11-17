import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { decrypt } from '@/lib/crypto';
import { verifyCode } from '@/lib/totp';
import { clientIp, limitOr429 } from '@/lib/ratelimit';
import { readTwoFactorTicket, adminSessionToken, adminCookieOpts, ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminLog } from '@/lib/admin';

// Step 2 of the admin login: the 6-digit code from the authenticator app.
export async function POST(req) {
  const { ticket, code } = await req.json().catch(() => ({}));
  const aid = await readTwoFactorTicket(ticket);
  if (!aid) return NextResponse.json({ error: 'The sign-in took too long. Start again.' }, { status: 401 });
  const limited = await limitOr429([[`admin2fa:${aid}`, 6, 900], [`admin2fa:ip:${clientIp(req)}`, 15, 900]]);
  if (limited) return limited;
  const admin = await prisma.admin.findUnique({ where: { id: aid } });
  if (!admin?.active || !admin.totpEnabled || !admin.totpSecretEnc) return NextResponse.json({ error: 'Start again.' }, { status: 401 });
  if (!verifyCode(decrypt(admin.totpSecretEnc), code)) return NextResponse.json({ error: 'That code isn’t right. Use the newest code in your authenticator app.' }, { status: 401 });
  await prisma.admin.update({ where: { id: admin.id }, data: { lastLoginAt: new Date() } });
  await adminLog(admin, 'admin_login', { detail: `${clientIp(req)} (2-step)` });
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminSessionToken(admin), adminCookieOpts(ADMIN_SESSION_SECONDS));
  return res;
}
