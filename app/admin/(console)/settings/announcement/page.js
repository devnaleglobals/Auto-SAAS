import { requireAdminPage } from '@/lib/admin';
import { getSetting } from '@/lib/settings';
import { Card } from '@/components/AdminSettings';
import AnnouncementForm from '@/components/AnnouncementForm';

export const dynamic = 'force-dynamic';

export default async function AnnouncementSettings() {
  await requireAdminPage('settings');
  return (
    <Card title="Announcement banner" description="Shown at the top of every client’s dashboard, e.g. planned maintenance or a new feature.">
      <AnnouncementForm initial={await getSetting('announcement', {})} />
    </Card>
  );
}
