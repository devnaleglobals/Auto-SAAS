import { requireAdminPage, ROLE_LABEL, adminCan } from '@/lib/admin';
import { prisma } from '@/lib/db';
import AdminNav from '@/components/AdminNav';
import { FeedbackProvider } from '@/components/Feedback';

export const metadata = { title: 'Admin console — ReplyRelay', robots: { index: false, follow: false } };

export default async function AdminLayout({ children }) {
  const admin = await requireAdminPage();
  const openTickets = adminCan(admin, 'tickets') ? await prisma.ticket.count({ where: { status: 'OPEN' } }) : 0;
  const perms = ['clients.view', 'automations', 'billing', 'tickets', 'settings', 'emails', 'admins'].filter((p) => adminCan(admin, p));
  return (
    <FeedbackProvider>
      <AdminNav admin={{ name: admin.name, email: admin.email, role: ROLE_LABEL[admin.role], totp: admin.totpEnabled }} perms={perms} openTickets={openTickets} />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">
        {!admin.totpEnabled && (
          <div role="status" className="mb-6 rounded-lg border border-marigold/50 bg-marigold/10 px-4 py-3 text-sm">
            Protect the admin console: turn on <a href="/admin/settings/security" className="font-semibold underline">2-step verification</a> for your account.
          </div>
        )}
        {children}
      </main>
    </FeedbackProvider>
  );
}
