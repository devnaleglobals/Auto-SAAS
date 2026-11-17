import { requireAdminPage } from '@/lib/admin';
import { getSetting } from '@/lib/settings';
import { GeneralForm } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function GeneralSettings() {
  await requireAdminPage('settings');
  return <GeneralForm initial={await getSetting('general', {})} />;
}
