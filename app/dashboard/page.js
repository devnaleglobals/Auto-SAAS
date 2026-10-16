import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Notice, Stat, StatGrid, Empty, fmtNum, pct } from '@/components/ui';
import DailyChart from '@/components/DailyChart';
import StatusBadge from '@/components/StatusBadge';
import PlatformIcon from '@/components/PlatformIcon';
import { limitsOf, usageThisMonth } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function Overview({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const ws = ctx.workspace.id;
  const since = new Date(Date.now() - 29 * 86400000);
  since.setHours(0, 0, 0, 0);

  const [channels, automations, events] = await Promise.all([
    prisma.channel.findMany({ where: { workspaceId: ws } }),
    prisma.automation.findMany({ where: { workspaceId: ws }, include: { channel: { select: { platform: true, username: true } } } }),
    prisma.event.findMany({
      where: { automation: { workspaceId: ws }, createdAt: { gte: since } },
      select: { automationId: true, createdAt: true, dmStatus: true, clickCount: true },
    }),
  ]);

  const sent = events.filter((e) => e.dmStatus === 'SENT').length;
  const failed = events.filter((e) => e.dmStatus === 'FAILED').length;
  const clicks = events.reduce((s, e) => s + e.clickCount, 0);
  const clickers = events.filter((e) => e.clickCount > 0).length;

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sent: 0, clicks: 0 };
  });
  const byDay = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const e of events) {
    const d = byDay[new Date(e.createdAt).toISOString().slice(0, 10)];
    if (!d) continue;
    if (e.dmStatus === 'SENT') d.sent++;
    d.clicks += e.clickCount;
  }

  const perAuto = {};
  for (const e of events) {
    const p = (perAuto[e.automationId] ||= { sent: 0, clicks: 0, clickers: 0 });
    if (e.dmStatus === 'SENT') p.sent++;
    p.clicks += e.clickCount;
    if (e.clickCount) p.clickers++;
  }
  const top = automations
    .map((a) => ({ ...a, ...(perAuto[a.id] || { sent: 0, clicks: 0, clickers: 0 }) }))
    .sort((a, b) => b.sent - a.sent || b.clicks - a.clicks)
    .slice(0, 6);

  const running = automations.filter((a) => a.status === 'ACTIVE').length;
  const wsFull = await prisma.workspace.findUnique({ where: { id: ws } });
  const used = usageThisMonth(wsFull);
  const cap = limitsOf(wsFull).messages;
  const broken = channels.filter((c) => c.needsReconnect);

  return (
    <>
      <PageHeader
        title="Overview"
        description="Last 30 days across every connected account in this workspace."
        actions={ctx.can('editAutomations') && channels.length > 0 && <Link href="/dashboard/automations/new" className="btn-primary">New automation</Link>}
      />

      {sp?.connect === 'ok' && <Notice>Account connected. Create an automation to start replying to comments.</Notice>}
      {used >= cap * 0.8 && (
        <Notice tone={used >= cap ? 'bad' : 'warn'} action={<Link href="/dashboard/billing" className="btn-dark btn-sm">See plans</Link>}>
          {used >= cap ? `You’ve used all ${cap.toLocaleString('en-IN')} messages this month, so automations are paused.` : `You’ve used ${used.toLocaleString('en-IN')} of ${cap.toLocaleString('en-IN')} messages this month.`}
        </Notice>
      )}
      {broken.map((c) => (
        <Notice key={c.id} tone="bad" action={<Link href="/dashboard/accounts" className="btn-dark btn-sm">Reconnect</Link>}>
          The connection for {c.username} stopped working. Its automations are on hold.
        </Notice>
      ))}

      {channels.length === 0 ? (
        <Empty title="Connect your first account" href="/dashboard/accounts" cta="Connect an account">
          Connect an Instagram Business or Creator account, or a Facebook Page, to start automating replies.
        </Empty>
      ) : (
        <>
          <StatGrid>
            <Stat label="Messages sent" value={fmtNum(sent)} tone="ok" sub={failed ? `${fmtNum(failed)} failed` : 'No failures'} />
            <Stat label="Link clicks" value={fmtNum(clicks)} sub={`${fmtNum(clickers)} people clicked`} />
            <Stat label="Click-through rate" value={pct(clickers, sent)} sub="People who clicked ÷ messages sent" />
            <Stat label="Running automations" value={running} sub={`${channels.length} connected account${channels.length > 1 ? 's' : ''}`} />
          </StatGrid>

          <section className="card mt-6 p-5">
            <h2 className="mb-4 font-display text-lg font-bold">Daily activity</h2>
            <DailyChart days={days} />
          </section>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Top automations</h2>
              <Link href="/dashboard/automations" className="text-sm font-semibold text-slate hover:text-ink">See all</Link>
            </div>
            {top.length === 0 ? (
              <Empty title="No automations yet" href={ctx.can('editAutomations') ? '/dashboard/automations/new' : null} cta="Create an automation" />
            ) : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[640px] text-sm">
                  <thead className="border-b border-line"><tr><th className="th">Automation</th><th className="th">Sent</th><th className="th">Clicks</th><th className="th">CTR</th><th className="th">Status</th></tr></thead>
                  <tbody>
                    {top.map((a) => (
                      <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas">
                        <td className="td"><Link href={`/dashboard/automations/${a.id}`} className="font-semibold hover:underline">{a.name}</Link>
                          <span className="mt-0.5 flex items-center gap-1 text-xs text-slate"><PlatformIcon platform={a.channel.platform} className="h-3 w-3" />{a.channel.username}</span></td>
                        <td className="td tabular-nums">{fmtNum(a.sent)}</td>
                        <td className="td tabular-nums">{fmtNum(a.clicks)}</td>
                        <td className="td tabular-nums">{pct(a.clickers, a.sent)}</td>
                        <td className="td"><StatusBadge s={a.status} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </>
  );
}
