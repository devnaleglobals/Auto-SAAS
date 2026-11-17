import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminPasswordProblem, adminLog } from '@/lib/admin';
import { sendTemplate } from '@/lib/mailer';
import { appUrl } from '@/lib/platforms';

const ROLES = ['OWNER', 'ADMIN', 'SUPPORT', 'BILLING'];

// Owners add admins with a temporary password; the new admin should change it and turn on 2-step.
export async function POST(req) {
  const [admin, err] = await requireAdminApi('admins');
  if (err) return err;
  const { email, name, role, password } = await req.json().catch(() => ({}));
  const e = String(email || '').toLowerCase().trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e)) return NextResponse.json({ error: 'Enter a valid email.' }, { status: 400 });
  if (!ROLES.includes(role)) return NextResponse.json({ error: 'Choose a role.' }, { status: 400 });
  const problem = adminPasswordProblem(password);
  if (problem) return NextResponse.json({ error: `Temporary password: ${problem}` }, { status: 400 });
  if (await prisma.admin.findUnique({ where: { email: e } })) return NextResponse.json({ error: 'That email is already an admin.' }, { status: 409 });
  const created = await prisma.admin.create({ data: { email: e, name: String(name || e.split('@')[0]).trim().slice(0, 60), role, passwordHash: await bcrypt.hash(password, 12) } });
  await adminLog(admin, 'admin_created', { detail: `${e} as ${role.toLowerCase()}` });
  await sendTemplate('admin_invite', e, { name: created.name, role: role.toLowerCase(), url: `${appUrl()}/admin/login`, invitedBy: admin.name }, { kind: 'system' }).catch(() => {});
  return NextResponse.json({ ok: true, id: created.id });
}
