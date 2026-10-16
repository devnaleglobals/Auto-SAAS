import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Notice } from '@/components/ui';
import AccountCard from '@/components/AccountCard';
import PlatformIcon from '@/components/PlatformIcon';

export const dynamic = 'force-dynamic';

const notices = {
  ok: ['ok', 'Account connected.'],
  denied: ['bad', 'Connection cancelled. Try again and select Allow on every permission.'],
  state: ['bad', 'The connection link expired. Try again.'],
  taken: ['bad', 'This account is already connected to another workspace. Disconnect it there first.'],
  personal: ['bad', 'This is a personal Instagram account. Switch it to Business or Creator in Instagram settings, then connect again.'],
  nopages: ['bad', 'No Facebook Pages were shared. Connect again and select the Pages you want to automate.'],
  role: ['bad', 'Only workspace admins can connect accounts.'],
  limit: ['bad', 'Your plan’s account limit is reached. Upgrade on the Billing page to connect more accounts.'],
  partial: ['bad', 'Some accounts were connected; the rest are over your plan’s account limit. Upgrade on the Billing page to add them.'],
  error: ['bad', 'The connection failed.'],
};

export default async function Accounts({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const channels = await prisma.channel.findMany({
    where: { workspaceId: ctx.workspace.id }, orderBy: { connectedAt: 'asc' },
    include: { _count: { select: { automations: true } } },
  });
  const canManage = ctx.can('manageAccounts');
  const n = notices[sp?.connect];

  return (
    <>
      <PageHeader title="Accounts" description="Instagram Business or Creator accounts and Facebook Pages this workspace automates."
        actions={canManage && (<>
          <a href="/api/instagram/connect" className="btn-dark"><PlatformIcon platform="INSTAGRAM" /> Connect Instagram</a>
          <a href="/api/facebook/connect" className="btn-ghost"><PlatformIcon platform="FACEBOOK" /> Connect Facebook Page</a>
        </>)} />
      {n && <Notice tone={n[0]}>{n[1]} {sp?.reason && <span className="font-normal opacity-80">({sp.reason})</span>}</Notice>}
      {channels.length === 0 ? (
        <div className="card border-dashed p-10">
          <p className="font-semibold">No accounts connected yet.</p>
          <p className="mt-1 max-w-xl text-sm text-slate">You'll sign in on Instagram or Facebook and allow ReplyRelay to read comments and send messages. Instagram accounts must be Business or Creator. For Facebook, choose the Pages you manage.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {channels.map((c) => (
            <AccountCard key={c.id} canManage={canManage} c={{
              id: c.id, platform: c.platform, username: c.username, picture: c.picture, followers: c.followers,
              needsReconnect: c.needsReconnect, welcomeCount: Array.isArray(c.iceBreakers) ? c.iceBreakers.length : 0, tokenExpiresAt: c.tokenExpiresAt ? c.tokenExpiresAt.toISOString() : null, automations: c._count.automations,
            }} />
          ))}
        </ul>
      )}
    </>
  );
}
