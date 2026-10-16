import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Empty, fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

const LABELS = {
  'automation.created': 'created automation', 'automation.edited': 'edited automation', 'automation.deleted': 'deleted automation',
  'automation.paused': 'paused automation', 'automation.resumed': 'resumed automation', 'automation.duplicated': 'duplicated automation',
  'account.connected': 'connected', 'account.disconnected': 'disconnected',
  'team.invite_created': 'created an invite:', 'team.invite_revoked': 'revoked an invite:', 'team.member_joined': 'joined:',
  'team.role_changed': 'changed a role:', 'team.member_removed': 'removed', 'workspace.renamed': 'renamed the workspace to',
};

export default async function Activity() {
  const ctx = await getContext();
  const logs = await prisma.auditLog.findMany({
    where: { workspaceId: ctx.workspace.id }, orderBy: { createdAt: 'desc' }, take: 200, include: { user: { select: { name: true } } },
  });
  return (
    <>
      <PageHeader title="Activity" description="Who changed what in this workspace. The latest 200 actions are shown." />
      {logs.length === 0 ? <Empty title="No activity yet">Changes to accounts, automations and the team will appear here.</Empty> : (
        <ol className="card divide-y divide-line">
          {logs.map((l) => (
            <li key={l.id} className="flex flex-wrap items-baseline justify-between gap-2 px-4 py-3 text-sm">
              <span><strong>{l.user?.name || 'System'}</strong> {LABELS[l.action] || l.action} {l.detail && <span className="font-medium">{l.detail}</span>}</span>
              <time className="text-xs text-slate" dateTime={l.createdAt.toISOString()}>{fmtDate(l.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
