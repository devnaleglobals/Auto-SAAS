import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, fmtDate } from '@/components/ui';
import TeamManager from '@/components/TeamManager';
import StatusBadge from '@/components/StatusBadge';
import { limitsOf } from '@/lib/plans';
import { appUrl } from '@/lib/platforms';

export const dynamic = 'force-dynamic';

export default async function Team() {
  const ctx = await getContext();
  const [members, invites] = await Promise.all([
    prisma.membership.findMany({ where: { workspaceId: ctx.workspace.id }, include: { user: true }, orderBy: { createdAt: 'asc' } }),
    prisma.invite.findMany({ where: { workspaceId: ctx.workspace.id, acceptedAt: null, expiresAt: { gt: new Date() } }, orderBy: { createdAt: 'desc' } }),
  ]);
  const rows = members.map((m) => ({ id: m.id, userId: m.userId, name: m.user.name, email: m.user.email, role: m.role, joined: fmtDate(m.createdAt), lastActive: m.user.lastLoginAt ? fmtDate(m.user.lastLoginAt) : null }));
  const seats = limitsOf(ctx.workspace).members;

  return (
    <>
      <PageHeader title="Team" description={`People who can see or manage this workspace. ${rows.length} of ${seats} seats used.`} />
      {ctx.can('manageTeam') ? (
        <TeamManager members={rows} myRole={ctx.role} meId={ctx.user.id}
          seatsLeft={Math.max(0, seats - rows.length)}
          invites={invites.map((i) => ({ id: i.id, label: i.label, role: i.role, expires: fmtDate(i.expiresAt), url: `${appUrl()}/invite/${i.token}` }))} />
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-line"><tr><th className="th">Name</th><th className="th">Role</th></tr></thead>
            <tbody>{rows.map((m) => <tr key={m.id} className="border-b border-line last:border-0"><td className="td font-semibold">{m.name}</td><td className="td"><StatusBadge s={m.role} /></td></tr>)}</tbody>
          </table>
        </div>
      )}
    </>
  );
}
