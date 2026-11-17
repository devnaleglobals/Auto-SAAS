import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { requireAdminApi, adminLog } from '@/lib/admin';

const ROLES = ['OWNER', 'ADMIN', 'SUPPORT', 'BILLING'];

async function ownersLeft(exceptId) {
  return prisma.admin.count({ where: { role: 'OWNER', active: true, id: { not: exceptId } } });
}

// Change role, activate/deactivate, sign out everywhere, or reset 2-step for another admin.
export async function PATCH(req, { params }) {
  const [admin, err] = await requireAdminApi('admins');
  if (err) return err;
  const { id } = await params;
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const b = await req.json().catch(() => ({}));
  const data = {};
  if (b.role !== undefined) {
    if (!ROLES.includes(b.role)) return NextResponse.json({ error: 'Choose a role.' }, { status: 400 });
    if (target.role === 'OWNER' && b.role !== 'OWNER' && !(await ownersLeft(id))) return NextResponse.json({ error: 'Keep at least one owner.' }, { status: 400 });
    data.role = b.role;
  }
  if (b.active !== undefined) {
    if (id === admin.id) return NextResponse.json({ error: 'You can’t deactivate yourself.' }, { status: 400 });
    if (!b.active && target.role === 'OWNER' && !(await ownersLeft(id))) return NextResponse.json({ error: 'Keep at least one owner.' }, { status: 400 });
    data.active = Boolean(b.active);
    data.sessionVersion = { increment: 1 };
  }
  if (b.signOut) data.sessionVersion = { increment: 1 };
  if (b.reset2fa) { data.totpEnabled = false; data.totpSecretEnc = null; }
  await prisma.admin.update({ where: { id }, data });
  await adminLog(admin, 'admin_updated', { detail: `${target.email}: ${Object.keys(b).join(', ')}` });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req, { params }) {
  const [admin, err] = await requireAdminApi('admins');
  if (err) return err;
  const { id } = await params;
  if (id === admin.id) return NextResponse.json({ error: 'You can’t remove yourself.' }, { status: 400 });
  const target = await prisma.admin.findUnique({ where: { id } });
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (target.role === 'OWNER' && !(await ownersLeft(id))) return NextResponse.json({ error: 'Keep at least one owner.' }, { status: 400 });
  await prisma.admin.delete({ where: { id } });
  await adminLog(admin, 'admin_removed', { detail: target.email });
  return NextResponse.json({ ok: true });
}
