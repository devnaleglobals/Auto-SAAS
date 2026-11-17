import { redirect } from 'next/navigation';
import { getContext } from '@/lib/context';
import Sidebar from '@/components/Sidebar';
import { FeedbackProvider } from '@/components/Feedback';
import CommandPalette from '@/components/CommandPalette';
import { getCompany } from '@/lib/company';
import { PLANS, effectivePlan, usageThisMonth, onTrial } from '@/lib/plans';
import { getAnnouncement, getSignupSettings } from '@/lib/settings';

export default async function DashLayout({ children }) {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  const planKey = effectivePlan(ctx.workspace);
  const plan = { name: PLANS[planKey].name, used: usageThisMonth(ctx.workspace), cap: PLANS[planKey].messages, canUpgrade: planKey !== 'AGENCY' && ctx.can('manageWorkspace') };
  const [announcement, platform, COMPANY] = await Promise.all([getAnnouncement(), getSignupSettings(), getCompany()]);
  const trialDays = onTrial(ctx.workspace) ? Math.max(0, Math.ceil((new Date(ctx.workspace.trialEndsAt) - Date.now()) / 86400000)) : null;
  return (
    <FeedbackProvider>
    <div className="min-h-screen">
      <Sidebar
        user={{ name: ctx.user.name, email: ctx.user.email }}
        workspace={{ id: ctx.workspace.id, name: ctx.workspace.name }}
        workspaces={ctx.memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name }))}
        role={ctx.role}
        plan={plan}
      />
      <CommandPalette canEdit={ctx.can('editAutomations')} />
      <main className="lg:pl-60">
        {announcement && (
          <div role="status" className={`border-b px-5 py-3 text-sm font-medium lg:px-10 ${announcement.tone === 'warn' ? 'border-marigold/40 bg-marigold/15 text-ink' : 'border-sky/20 bg-sky/5 text-ink'}`}>
            {announcement.text}{announcement.link && <> <a href={announcement.link} className="font-semibold underline" target="_blank" rel="noreferrer">Learn more</a></>}
          </div>
        )}
        {platform.maintenance && (
          <div role="alert" className="border-b border-marigold/40 bg-marigold/15 px-5 py-3 text-sm font-medium text-ink lg:px-10">
            {platform.maintenanceMessage || 'Scheduled maintenance is in progress. Automations are paused and will resume shortly.'}
          </div>
        )}
        {trialDays !== null && (
          <div role="status" className="border-b border-sky/20 bg-sky/5 px-5 py-2.5 text-sm text-ink lg:px-10">
            Free {PLANS[planKey].name} trial: {trialDays} day{trialDays === 1 ? '' : 's'} left. {ctx.can('manageWorkspace') && <a href="/dashboard/billing" className="font-semibold underline">Choose a plan</a>}
          </div>
        )}
        {ctx.workspace.suspended && (
          <div role="alert" className="border-b border-bad/30 bg-bad/5 px-5 py-3 text-sm font-medium text-bad lg:px-10">
            This workspace is paused, so automations aren’t sending. Reason: {ctx.workspace.suspendReason}. Contact {COMPANY.email} to resolve it.
          </div>
        )}
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
    </FeedbackProvider>
  );
}
