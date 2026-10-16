import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Empty, fmtNum } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import PlatformIcon from '@/components/PlatformIcon';
import { typeInfo } from '@/lib/automationTypes';

export const dynamic = 'force-dynamic';

export default async function AutomationsList({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const status = ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(sp?.status) ? sp.status : undefined;
  const channelId = sp?.account || undefined;

  const [channels, automations] = await Promise.all([
    prisma.channel.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { connectedAt: 'asc' } }),
    prisma.automation.findMany({
      where: { workspaceId: ctx.workspace.id, ...(status ? { status } : {}), ...(channelId ? { channelId } : {}), ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { channel: { select: { platform: true, username: true } }, _count: { select: { events: { where: { dmStatus: 'SENT' } } } } },
    }),
  ]);
  const canEdit = ctx.can('editAutomations');

  return (
    <>
      <PageHeader title="Automations" description="Each automation watches comments and replies with your message."
        actions={canEdit && channels.length > 0 && <Link href="/dashboard/automations/new" className="btn-primary">New automation</Link>} />

      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name" className="field w-56" aria-label="Search by name" />
        <select name="status" defaultValue={status || ''} className="field w-40" aria-label="Status">
          <option value="">All statuses</option><option value="ACTIVE">Running</option><option value="PAUSED">Paused</option><option value="COMPLETED">Finished</option>
        </select>
        {channels.length > 1 && (
          <select name="account" defaultValue={channelId || ''} className="field w-56" aria-label="Account">
            <option value="">All accounts</option>
            {channels.map((c) => <option key={c.id} value={c.id}>{c.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'} · {c.username}</option>)}
          </select>
        )}
        <button className="btn-ghost">Apply</button>
      </form>

      {automations.length === 0 ? (
        <Empty title={q || status || channelId ? 'No automations match these filters' : 'No automations yet'}
          href={canEdit && channels.length ? '/dashboard/automations/new' : null} cta="Create an automation">
          {channels.length === 0 ? 'Connect an account first on the Accounts page.' : null}
        </Empty>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Automation</th><th className="th">Type</th><th className="th">Applies to</th><th className="th">Trigger</th><th className="th">Sent</th><th className="th">Status</th></tr></thead>
            <tbody>
              {automations.map((a) => (
                <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="td">
                    <Link href={`/dashboard/automations/${a.id}`} className="flex items-center gap-3">
                      {a.mediaThumb ? <img src={a.mediaThumb} alt="" className="h-10 w-10 rounded-md object-cover" /> : <span className="flex h-10 w-10 items-center justify-center rounded-md bg-canvas"><PlatformIcon platform={a.channel.platform} /></span>}
                      <span><span className="block font-semibold hover:underline">{a.name}</span>
                        <span className="flex items-center gap-1 text-xs text-slate"><PlatformIcon platform={a.channel.platform} className="h-3 w-3" />{a.channel.username}</span></span>
                    </Link>
                  </td>
                  <td className="td whitespace-nowrap">{typeInfo(a.type, a.channel.platform)?.title}{a.requireFollow && <span className="block text-xs text-slate">Follow required</span>}</td>
                  <td className="td">{a.type === 'DM_FLOW' ? (a.channel.platform === 'FACEBOOK' ? 'Messenger' : 'Direct messages') : a.scope === 'ALL_POSTS' ? 'All posts' : 'One post'}</td>
                  <td className="td">{a.matchType === 'ANY' ? <span className="text-slate">Any comment</span> : <span className="line-clamp-2">{a.keywords.join(', ')}</span>}</td>
                  <td className="td tabular-nums">{fmtNum(a._count.events)}{a.maxReplies ? <span className="text-slate"> / {fmtNum(a.maxReplies)}</span> : ''}</td>
                  <td className="td"><StatusBadge s={a.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
