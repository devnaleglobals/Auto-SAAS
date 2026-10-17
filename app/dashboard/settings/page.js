import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/ui';
import WorkspaceSettings from '@/components/WorkspaceSettings';
import { ThemePicker } from '@/components/Theme';
import { appUrl } from '@/lib/platforms';

export const dynamic = 'force-dynamic';

export default async function Settings() {
  const ctx = await getContext();
  const base = appUrl();
  return (
    <>
      <PageHeader title="Settings" />
      <div className="space-y-6">
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Appearance</h2>
          <p className="mt-1 text-sm text-slate">Choose how ReplyRelay looks on this device.</p>
          <div className="mt-4"><ThemePicker /></div>
        </section>

        <WorkspaceSettings name={ctx.workspace.name} canEdit={ctx.can('manageWorkspace')} />

        <section className="card p-6">
          <h2 className="font-display text-lg font-bold">Your profile</h2>
          <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
            <div><dt className="text-slate">Name</dt><dd className="font-semibold">{ctx.user.name}</dd></div>
            <div><dt className="text-slate">Sign-in</dt><dd className="font-semibold">{ctx.user.email || (ctx.user.facebookId ? 'Facebook' : 'Instagram')}</dd></div>
            <div><dt className="text-slate">Role here</dt><dd className="font-semibold">{ctx.role.toLowerCase()}</dd></div>
          </dl>
        </section>

        {ctx.can('manageWorkspace') && (
          <section className="card p-6">
            <h2 className="font-display text-lg font-bold">Meta app links</h2>
            <p className="mt-1 text-sm text-slate">Paste these into your Meta developer app. They're also needed for App Review.</p>
            <dl className="mt-4 space-y-3 text-sm">
              {[
                ['Instagram redirect URI', `${base}/api/instagram/callback`],
                ['Facebook redirect URI', `${base}/api/facebook/callback`],
                ['Instagram webhook', `${base}/api/webhooks/instagram`],
                ['Facebook webhook', `${base}/api/webhooks/facebook`],
                ['Privacy Policy URL', `${base}/privacy`],
                ['Terms of Service URL', `${base}/terms`],
                ['Health check (uptime monitor)', `${base}/api/health`],
                ['Razorpay webhook', `${base}/api/billing/webhook`],
                ['Data deletion URL', `${base}/data-deletion`],
              ].map(([k, v]) => (
                <div key={k} className="grid gap-1 sm:grid-cols-[200px_1fr]"><dt className="font-semibold">{k}</dt><dd><code className="break-all rounded bg-canvas px-2 py-1">{v}</code></dd></div>
              ))}
            </dl>
          </section>
        )}
      </div>
    </>
  );
}
