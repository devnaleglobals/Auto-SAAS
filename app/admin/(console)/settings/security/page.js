import { requireAdminPage } from '@/lib/admin';
import { SecurityForms } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function MySecurity() {
  const admin = await requireAdminPage();
  return <SecurityForms totpEnabled={admin.totpEnabled} />;
}
