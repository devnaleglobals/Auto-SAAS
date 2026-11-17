import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdminPage, adminCan } from '@/lib/admin';
import { fmtDate } from '@/components/ui';
import { PLANS, effectivePlan } from '@/lib/plans';
import StatusBadge from '@/components/StatusBadge';
import AdminUserManager, { UserMemberships } from '@/components/AdminUserManager';

export const dynamic = 'force-dynamic';

export default async function AdminUserDetail({ params }) {
  const admin = await requireAdminPage('clients.view');
  const { id } = await params;
  const u = await prisma.user.findUnique({
    where: { id },
    include: { memberships: { include: { workspace: true }, orderBy: { createdAt: 'asc' } } },
  });
  if (!u) notFound();
  const [activity, tickets, workspaces] = await Promise.all([
    prisma.auditLog.findMany({ where: { userId: id }, orderBy: { createdAt: 'desc' }, take: 25, include: { workspace: { select: { name: true } } } }),
    u.email ? prisma.ticket.findMany({ where: { email: u.email }, orderBy: { lastReplyAt: 'desc' }, take: 10 }) : [],
    prisma.workspace.findMany({ where: { memberships: { none: { userId: id } } }, orderBy: { name: 'asc' }, take: 500, select: { id: true, name: true } }),
  ]);
  const signIn = [u.passwordHash && 'Email + password', u.facebookId && 'Facebook'].filter(Boolean).join(', ') || 'Instagram';
  return (
    <>
      <Link href="/admin/users" className="text-sm font-semibold text-slate hover:text-ink">← Users</Link>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{u.name}</h1>
        {u.disabled && <span className="rounded-full bg-bad/10 px-2.5 py-0.5 text-xs font-semibold text-bad">Disabled</span>}
      </div>
      <p className="mt-1 text-sm text-slate">{u.email || 'No email'} · signs in with {signIn} · joined {fmtDate(u.createdAt)} · last login {u.lastLoginAt ? fmtDate(u.lastLoginAt) : 'never'}</p>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Clients (workspaces)</h2>
            <UserMemberships
              userId={u.id}
              canEdit={adminCan(admin, 'clients.edit')}
              memberships={u.memberships.map((m) => ({ id: m.id, workspaceId: m.workspaceId, name: m.workspace.name, role: m.role, plan: PLANS[effectivePlan(m.workspace)].name, suspended: m.workspace.suspended }))}
              otherWorkspaces={workspaces}
            />
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Recent activity</h2>
            {activity.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">No activity yet.</p> : (
              <ul className="card divide-y divide-line text-sm">{activity.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span><strong>{l.action.replace(/[._]/g, ' ')}</strong> <span className="text-slate">{l.detail}</span> <span className="text-xs text-slate">({l.workspace?.name})</span></span><span className="text-xs text-slate">{fmtDate(l.createdAt)}</span></li>)}</ul>
            )}
          </section>
          {tickets.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Support tickets</h2>
              <ul className="card divide-y divide-line text-sm">{tickets.map((t) => <li key={t.id}><Link href={`/admin/tickets/${t.id}`} className="flex justify-between gap-3 px-4 py-2.5 hover:bg-canvas"><span><strong>#{t.number}</strong> {t.subject}</span><StatusBadge s={t.status} /></Link></li>)}</ul>
            </section>
          )}
        </div>
        {adminCan(admin, 'clients.edit')
          ? <AdminUserManager user={{ id: u.id, name: u.name, email: u.email || '', disabled: u.disabled, hasPassword: Boolean(u.passwordHash), notifyReconnect: u.notifyReconnect, notifyBilling: u.notifyBilling }} canDelete={adminCan(admin, 'danger')} />
          : <p className="card h-fit p-5 text-sm text-slate">Your role can view this user but not change them.</p>}
      </div>
    </>
  );
}
