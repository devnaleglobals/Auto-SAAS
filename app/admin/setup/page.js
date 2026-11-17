import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { AdminSetupForm } from '@/components/AdminAuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin setup — ReplyRelay', robots: { index: false, follow: false } };

// Only available until the first admin exists.
export default async function AdminSetup() {
  if (await prisma.admin.count()) redirect('/admin/login');
  return <AdminSetupForm tokenConfigured={(process.env.ADMIN_SETUP_TOKEN || '').length >= 16} />;
}
