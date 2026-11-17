import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdminPage, adminCan } from '@/lib/admin';
import { typeInfo } from '@/lib/automationTypes';
import { stepsOf } from '@/lib/flows';
import { hasSupportAccess } from '@/lib/supportAccess';
import { Stat, StatGrid, fmtNum, fmtDate, pct } from '@/components/ui';
import PlatformIcon from '@/components/PlatformIcon';
import StatusBadge from '@/components/StatusBadge';
import AdminAutomationActions from '@/components/AdminAutomationActions';

export const dynamic = 'force-dynamic';

const Row = ({ k, children }) => <div className="grid grid-cols-[150px_1fr] gap-3 border-b border-line py-2.5 text-sm last:border-0"><dt className="text-slate">{k}</dt><dd className="min-w-0 break-words">{children || <span className="text-slate">–</span>}</dd></div>;

export default async function AdminAutomation({ params }) {
  const admin = await requireAdminPage('automations');
  const { id } = await params;
  const a = await prisma.automation.findUnique({ where: { id }, include: { channel: true, workspace: { select: { id: true, name: true, supportAccessUntil: true } } } });
  if (!a) notFound();
  const [byDm, byReply, recent, errors, supportLog] = await Promise.all([
    prisma.event.groupBy({ by: ['dmStatus'], where: { automationId: a.id }, _count: true }),
    prisma.event.groupBy({ by: ['replyStatus'], where: { automationId: a.id }, _count: true }),
    // Delivery log without who commented or what they wrote: support needs the outcome, not the person.
    prisma.event.findMany({ where: { automationId: a.id }, orderBy: { createdAt: 'desc' }, take: 25, select: { id: true, createdAt: true, matchedKeyword: true, dmStatus: true, dmError: true, replyStatus: true, replyError: true, clickCount: true } }),
    prisma.event.groupBy({ by: ['dmError'], where: { automationId: a.id, dmStatus: 'FAILED', dmError: { not: null } }, _count: true, orderBy: { _count: { dmError: 'desc' } }, take: 5 }),
    prisma.adminLog.findMany({ where: { workspaceId: a.workspaceId, action: { startsWith: 'automation.' }, detail: { startsWith: a.name } }, orderBy: { createdAt: 'desc' }, take: 10 }),
  ]);
  const d = Object.fromEntries(byDm.map((x) => [x.dmStatus, x._count]));
  const r = Object.fromEntries(byReply.map((x) => [x.replyStatus, x._count]));
  const total = Object.values(d).reduce((s, n) => s + n, 0);
  const steps = stepsOf(a);
  const access = hasSupportAccess(a.workspace);
  const handle = a.channel.platform === 'INSTAGRAM' ? `@${a.channel.username}` : a.channel.username;

  return (
    <>
      <div className="flex flex-wrap gap-x-3 text-sm font-semibold text-slate">
        <Link href="/admin/automations" className="hover:text-ink">← Automations</Link>
        <span>·</span><Link href={`/admin/workspaces/${a.workspace.id}`} className="hover:text-ink">{a.workspace.name}</Link>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{a.name}</h1><StatusBadge s={a.status} />
      </div>
      <p className="mt-1 flex flex-wrap items-center gap-1.5 text-sm text-slate">
        <PlatformIcon platform={a.channel.platform} className="h-3.5 w-3.5" />{handle} · {typeInfo(a.type, a.channel.platform)?.title} · created {fmtDate(a.createdAt)}
        {a.channel.needsReconnect && <span className="font-semibold text-bad"> · account needs reconnecting (client must reconnect)</span>}
      </p>

      <div className="mt-6"><StatGrid>
        <Stat label="Triggered" value={fmtNum(total)} />
        <Stat label="Messages sent" value={fmtNum(d.SENT)} sub={pct(d.SENT || 0, total)} />
        <Stat label="Failed" value={fmtNum((d.FAILED || 0) + (r.FAILED || 0))} tone={(d.FAILED || r.FAILED) ? 'bad' : undefined} />
        <Stat label="Replies used" value={`${fmtNum(a.replyCount)}${a.maxReplies ? ` / ${fmtNum(a.maxReplies)}` : ''}`} />
      </StatGrid></div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
        <div className="min-w-0 space-y-8">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Settings</h2>
            <dl className="card px-5 py-2">
              <Row k="Applies to">{a.type === 'DM_FLOW' ? 'Direct messages' : a.type?.startsWith('STORY') ? 'Stories' : a.scope === 'ALL_POSTS' ? 'All posts' : <>One post{/^https?:\/\//i.test(a.mediaPermalink || '') && <> · <a href={a.mediaPermalink} target="_blank" rel="noreferrer" className="underline">view</a></>}</>}</Row>
              <Row k="Trigger">{a.matchType === 'ANY' ? 'Any comment' : `${a.matchType === 'EXACT' ? 'Exactly' : 'Contains'}: ${a.keywords.join(', ')}`}</Row>
              {a.commentReplies.length > 0 && <Row k="Public replies">{a.commentReplies.map((x, i) => <span key={i} className="block">“{x}”</span>)}</Row>}
              {a.dmMessage && <Row k="Private message"><span className="whitespace-pre-wrap">{a.dmMessage}</span></Row>}
              {a.linkUrl && <Row k="Link"><span className="break-all">{a.linkUrl}</span></Row>}
              {steps.length > 0 && <Row k="Conversation">{steps.length} message{steps.length > 1 ? 's' : ''}{a.openerButton && ` · opener button “${a.openerButton}”`}</Row>}
              <Row k="Follow required">{a.requireFollow ? 'Yes' : 'No'}</Row>
              {a.followUpMins && <Row k="Follow-up">After {a.followUpMins} min</Row>}
              {a.type === 'COMMENT_MODERATION' && <Row k="Moderation">{a.modAction === 'DELETE' ? 'Delete' : 'Hide'}{a.modHideLinks ? ' · also links' : ''}</Row>}
              <Row k="Schedule">{a.startAt ? `From ${fmtDate(a.startAt)}` : 'Immediately'}{a.endAt ? ` until ${fmtDate(a.endAt)}` : ''}</Row>
              <Row k="Last check">{a.lastCheckedAt ? `${fmtDate(a.lastCheckedAt)}${a.lastCheckNote ? `: ${a.lastCheckNote}` : ''}` : null}</Row>
            </dl>
          </section>

          {errors.length > 0 && (
            <section>
              <h2 className="mb-3 font-display text-lg font-bold">Most common errors</h2>
              <ul className="card divide-y divide-line text-sm">{errors.map((e) => <li key={e.dmError} className="flex justify-between gap-4 px-4 py-2.5"><span className="break-words">{e.dmError}</span><span className="shrink-0 font-semibold tabular-nums">{fmtNum(e._count)}×</span></li>)}</ul>
            </section>
          )}

          <section>
            <h2 className="mb-1 font-display text-lg font-bold">Recent deliveries</h2>
            <p className="mb-3 text-xs text-slate">Who commented and what they wrote are hidden here to protect the client’s customers. The client sees them on their Leads page.</p>
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[620px] text-sm">
                <thead className="border-b border-line"><tr><th className="th">When</th><th className="th">Keyword</th><th className="th">Message</th><th className="th">Public reply</th><th className="th">Taps</th></tr></thead>
                <tbody>
                  {recent.map((e) => (
                    <tr key={e.id} className="border-b border-line align-top last:border-0">
                      <td className="td whitespace-nowrap text-slate">{fmtDate(e.createdAt)}</td>
                      <td className="td">{e.matchedKeyword || '–'}</td>
                      <td className="td"><StatusBadge s={e.dmStatus} />{e.dmError && <span className="mt-1 block text-xs text-bad">{e.dmError}</span>}</td>
                      <td className="td"><StatusBadge s={e.replyStatus} />{e.replyError && <span className="mt-1 block text-xs text-bad">{e.replyError}</span>}</td>
                      <td className="td tabular-nums">{e.clickCount || 0}</td>
                    </tr>
                  ))}
                  {recent.length === 0 && <tr><td colSpan={5} className="td py-8 text-center text-slate">Nothing has triggered yet.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <AdminAutomationActions
            id={a.id} name={a.name} status={a.status}
            access={access} accessUntil={a.workspace.supportAccessUntil ? fmtDate(a.workspace.supportAccessUntil) : null}
            canDelete={adminCan(admin, 'danger')} workspaceId={a.workspace.id}
          />
          {supportLog.length > 0 && (
            <section className="card p-5">
              <h2 className="font-display text-base font-bold">Support history</h2>
              <ul className="mt-3 space-y-2 text-sm">{supportLog.map((l) => <li key={l.id}><span className="font-semibold">{l.action.replace('automation.', '').replace('_', ' ')}</span> by {l.adminEmail}<span className="block text-xs text-slate">{fmtDate(l.createdAt)}{l.detail?.includes(': ') ? ` · ${l.detail.split(': ').slice(1).join(': ')}` : ''}</span></li>)}</ul>
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
