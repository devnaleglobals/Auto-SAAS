import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader } from '@/components/ui';
import WorkspaceSettings from '@/components/WorkspaceSettings';
import { ThemePicker } from '@/components/Theme';
import SupportAccess from '@/components/SupportAccess';
import { Section, ProfileForm, PasswordForm, NotificationsForm, DeleteWorkspace, PrivacyData } from '@/components/SettingsForms';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const ctx = await requireContext();
  const user = await prisma.user.findUnique({ where: { id: ctx.user.id } });
  const isOwner = ctx.can('manageWorkspace');
  const ownsWorkspaces = ctx.memberships.some((m) => m.role === 'OWNER');
  const nav = [['profile', 'Profile'], ['password', 'Password'], ['notifications', 'Notifications'], ['appearance', 'Appearance'], ['workspace', 'Workspace'], ['support', 'Support access'], ['privacy', 'Privacy & data'], ...(isOwner ? [['danger', 'Delete workspace']] : [])];

  return (
    <>
      <PageHeader title="Settings" description="Your profile, sign-in, notifications and this workspace." />
      <div className="grid gap-8 lg:grid-cols-[200px_1fr]">
        <nav aria-label="Settings sections" className="hidden lg:block">
          <ul className="sticky top-8 space-y-0.5 text-sm">
            {nav.map(([id, label]) => (
              <li key={id}><a href={`#${id}`} className={`block rounded-lg px-3 py-2 font-medium text-slate transition-colors hover:bg-surface hover:text-ink ${id === 'danger' ? 'hover:text-bad' : ''}`}>{label}</a></li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0 space-y-6">
          <Section id="profile" title="Profile" description="How your name appears to your team.">
            <ProfileForm name={user.name} email={user.email} role={ctx.role.toLowerCase()} />
          </Section>
          <Section id="password" title="Password" description="Use at least 8 characters.">
            <PasswordForm hasPassword={Boolean(user.email && user.passwordHash)} />
          </Section>
          <Section id="notifications" title="Email notifications" description={user.email ? `Sent to ${user.email}.` : null}>
            <NotificationsForm hasEmail={Boolean(user.email)} initial={{ notifyReconnect: user.notifyReconnect, notifyBilling: user.notifyBilling }} />
          </Section>
          <Section id="appearance" title="Appearance" description="Choose how ReplyRelay looks on this device.">
            <ThemePicker />
          </Section>
          <div id="workspace" className="scroll-mt-8"><WorkspaceSettings name={ctx.workspace.name} canEdit={isOwner} /></div>
          <Section id="support" title="Support access" description="Decide what our support team may do in your workspace.">
            <SupportAccess until={ctx.workspace.supportAccessUntil ? new Date(ctx.workspace.supportAccessUntil).toISOString() : null} canEdit={isOwner} />
          </Section>
          <Section id="privacy" title="Privacy & data" description={<>Your rights over your data are explained in our <a href="/privacy" className="underline">Privacy Policy</a>.</>}>
            <PrivacyData hasPassword={Boolean(user.email && user.passwordHash)} ownsWorkspaces={ownsWorkspaces} />
          </Section>
          {isOwner && (
            <Section id="danger" title="Delete workspace" tone="danger">
              <DeleteWorkspace name={ctx.workspace.name} />
            </Section>
          )}
        </div>
      </div>
    </>
  );
}
