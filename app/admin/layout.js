import { requireAdminPage } from '@/lib/admin';
import AdminNav from '@/components/AdminNav';
import { FeedbackProvider } from '@/components/Feedback';

export const metadata = { title: 'Platform admin — ReplyRelay', robots: { index: false } };

export default async function AdminLayout({ children }) {
  const admin = await requireAdminPage();
  return (
    <FeedbackProvider>
      <AdminNav email={admin.email} />
      <main className="mx-auto max-w-7xl px-5 py-8 lg:px-8">{children}</main>
    </FeedbackProvider>
  );
}
