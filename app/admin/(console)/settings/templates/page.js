import { requireAdminPage } from '@/lib/admin';
import { getSetting } from '@/lib/settings';
import { TEMPLATES } from '@/lib/mailer';
import { TemplatesForm } from '@/components/AdminSettings';

export const dynamic = 'force-dynamic';

export default async function TemplateSettings() {
  await requireAdminPage('settings');
  return <TemplatesForm templates={TEMPLATES} overrides={await getSetting('emailTemplates', {})} />;
}
