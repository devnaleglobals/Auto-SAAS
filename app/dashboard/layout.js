import { redirect } from 'next/navigation';
import { getContext } from '@/lib/context';
import Sidebar from '@/components/Sidebar';
import { FeedbackProvider } from '@/components/Feedback';
import CommandPalette from '@/components/CommandPalette';
import { isSuperAdmin } from '@/lib/admin';
import { COMPANY } from '@/lib/company';

export default async function DashLayout({ children }) {
  const ctx = await getContext();
  if (!ctx) redirect('/login');
  return (
    <FeedbackProvider>
    <div className="min-h-screen">
      <Sidebar
        user={{ name: ctx.user.name, email: ctx.user.email }}
        workspace={{ id: ctx.workspace.id, name: ctx.workspace.name }}
        workspaces={ctx.memberships.map((m) => ({ id: m.workspaceId, name: m.workspace.name }))}
        role={ctx.role}
        isAdmin={isSuperAdmin(ctx.user.email)}
      />
      <CommandPalette isAdmin={isSuperAdmin(ctx.user.email)} canEdit={ctx.can('editAutomations')} />
      <main className="lg:pl-60">
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
