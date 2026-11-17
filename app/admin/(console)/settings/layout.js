import { requireAdminPage, adminCan } from '@/lib/admin';
import SettingsNav from '@/components/AdminSettingsNav';

const ITEMS = [
  ['/admin/settings', 'General', 'settings'],
  ['/admin/settings/signup', 'Sign-up & trial', 'settings'],
  ['/admin/settings/plans', 'Plans & pricing', 'billing'],
  ['/admin/settings/payments', 'Payments', 'billing'],
  ['/admin/settings/email', 'Email delivery', 'settings'],
  ['/admin/settings/templates', 'Email templates', 'settings'],
  ['/admin/settings/announcement', 'Announcement', 'settings'],
  ['/admin/settings/admins', 'Admin team', 'admins'],
  ['/admin/settings/security', 'My security', null],
];

export default async function SettingsLayout({ children }) {
  const admin = await requireAdminPage();
  const items = ITEMS.filter(([, , p]) => !p || adminCan(admin, p)).map(([href, label]) => [href, label]);
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Settings</h1>
      <p className="mt-1 text-slate">Configure the platform: business details, plans, payments, email and the admin team.</p>
      <div className="mt-8 grid gap-8 lg:grid-cols-[210px_1fr]">
        <SettingsNav items={items} />
        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
