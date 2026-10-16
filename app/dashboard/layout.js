import { redirect } from 'next/navigation';
import { getContext } from '@/lib/context';
import Sidebar from '@/components/Sidebar';
import { FeedbackProvider } from '@/components/Feedback';

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
      />
      <main className="lg:pl-60">
        <div className="mx-auto max-w-6xl px-5 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
    </FeedbackProvider>
  );
}
