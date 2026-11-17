import { redirect } from 'next/navigation';
import { prisma } from '@/lib/db';
import { currentAdmin } from '@/lib/admin';
import { AdminLoginForm } from '@/components/AdminAuthForms';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Admin sign in — ReplyRelay', robots: { index: false, follow: false } };

export default async function AdminLogin() {
  if (await currentAdmin()) redirect('/admin');
  if ((await prisma.admin.count()) === 0) redirect('/admin/setup');
  return <AdminLoginForm />;
}
