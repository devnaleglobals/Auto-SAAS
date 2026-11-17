import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';
import { AdminsManager } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function AdminTeam() {
  const me = await requireAdminPage('admins');
  const admins = await prisma.admin.findMany({ orderBy: { createdAt: 'asc' }, select: { id: true, name: true, email: true, role: true, active: true, totpEnabled: true, lastLoginAt: true } });
  return <AdminsManager meId={me.id} admins={admins.map((a) => ({ ...a, lastLoginAt: a.lastLoginAt ? fmtDate(a.lastLoginAt) : null }))} />;
}
