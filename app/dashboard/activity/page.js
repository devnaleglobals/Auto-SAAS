import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, Empty, fmtDate } from '@/components/ui';
import { PLANS } from '@/lib/plans';

const detailText = (l) => (l.action.startsWith('billing.') && PLANS[l.detail] ? PLANS[l.detail].name : l.detail);

export const dynamic = 'force-dynamic';

const LABELS = {
  'automation.created': 'created automation', 'automation.edited': 'edited automation', 'automation.deleted': 'deleted automation',
  'automation.paused': 'paused automation', 'automation.resumed': 'resumed automation', 'automation.duplicated': 'duplicated automation',
  'account.connected': 'connected', 'account.disconnected': 'disconnected',
  'team.invite_created': 'created an invite:', 'team.invite_revoked': 'revoked an invite:', 'team.member_joined': 'joined:',
  'support.automation_paused': 'paused automation', 'support.automation_resumed': 'resumed automation', 'support.automation_edited': 'edited automation',
  'support.automation_deleted': 'deleted automation', 'support.automations_paused_all': 'paused all running automations:', 'support.automations_resumed_all': 'resumed',
  'support.access_granted': 'allowed support to edit automations', 'support.access_removed': 'turned off support access',
  'support.ticket_opened': 'opened support ticket',
  'billing.activated': 'plan started:', 'billing.charged': 'plan renewed:', 'billing.cancelled': 'cancelled the plan', 'billing.completed': 'previous subscription ended:',
  'billing.checkout_started': 'started checkout:', 'billing.credits_bought': 'bought message credits:', 'billing.credits_checkout': 'started a credits purchase:',
  'billing.details_updated': 'updated billing details', 'billing.plan_changed': 'changed plan to', 'billing.downgrade_scheduled': 'scheduled a plan change to', 'billing.downgrade_started': 'plan changed to',
  'billing.refund_unused': 'refund for unused days:', 'billing.refund_failed': 'refund for unused days failed (our team will handle it):',
  'billing.halted': 'payment failed, plan on hold:', 'billing.pending': 'payment retrying:', 'billing.resumed': 'plan resumed:', 'billing.authenticated': 'payment method set up:',
  'team.role_changed': 'changed a role:', 'team.member_removed': 'removed', 'workspace.renamed': 'renamed the workspace to',
};

export default async function Activity() {
  const ctx = await requireContext();
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
              <span><strong>{l.user?.name || (l.action.startsWith('support.automation') ? 'ReplyRelay support' : 'System')}</strong> {LABELS[l.action] || l.action} {l.detail && <span className="font-medium">{detailText(l)}</span>}</span>
              <time className="text-xs text-slate" dateTime={l.createdAt.toISOString()}>{fmtDate(l.createdAt)}</time>
            </li>
          ))}
        </ol>
      )}
    </>
  );
}
