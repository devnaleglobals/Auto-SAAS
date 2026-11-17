import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminPasswordProblem, adminSessionToken, adminCookieOpts, ADMIN_COOKIE, ADMIN_SESSION_SECONDS, adminLog } from '@/lib/admin';

export async function POST(req) {
  const [admin, err] = await requireAdminApi();
  if (err) return err;
  const { current, next } = await req.json().catch(() => ({}));
  if (!(await bcrypt.compare(String(current || '').slice(0, 200), admin.passwordHash))) return NextResponse.json({ error: 'Your current password isn’t right.' }, { status: 400 });
  const problem = adminPasswordProblem(next);
  if (problem) return NextResponse.json({ error: problem }, { status: 400 });
  const updated = await prisma.admin.update({ where: { id: admin.id }, data: { passwordHash: await bcrypt.hash(next, 12), sessionVersion: { increment: 1 } } });
  await adminLog(admin, 'admin_password_changed');
  const res = NextResponse.json({ ok: true });
  res.cookies.set(ADMIN_COOKIE, await adminSessionToken(updated), adminCookieOpts(ADMIN_SESSION_SECONDS));
  return res;
}
