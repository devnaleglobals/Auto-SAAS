import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { getPlatform } from '@/lib/platforms';
import { Stat, StatGrid, fmtDate, fmtNum, pct } from '@/components/ui';
import StatusBadge from '@/components/StatusBadge';
import Controls from '@/components/Controls';
import PlatformIcon from '@/components/PlatformIcon';
import { stepsOf } from '@/lib/flows';
import { typeInfo } from '@/lib/automationTypes';

export const dynamic = 'force-dynamic';

export default async function AutomationDetail({ params, searchParams }) {
  const ctx = await getContext();
  const { id } = await params;
  const sp = await searchParams;
  const a = await prisma.automation.findFirst({ where: { id, workspaceId: ctx.workspace.id }, include: { channel: true } });
  if (!a) notFound();

  const dm = ['SENT', 'FAILED', 'SKIPPED'].includes(sp?.dm) ? sp.dm : undefined;
  const clicked = sp?.clicked === '1';
  const q = sp?.q?.trim();
  const where = {
    automationId: a.id,
    ...(dm ? { dmStatus: dm } : {}),
    ...(clicked ? { clickCount: { gt: 0 } } : {}),
    ...(q ? { OR: [{ commenterUsername: { contains: q, mode: 'insensitive' } }, { commentText: { contains: q, mode: 'insensitive' } }] } : {}),
  };
  const [events, counts, replyCounts, clickAgg, clickers] = await Promise.all([
    prisma.event.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.event.groupBy({ by: ['dmStatus'], where: { automationId: a.id }, _count: true }),
    prisma.event.groupBy({ by: ['replyStatus'], where: { automationId: a.id }, _count: true }),
    prisma.event.aggregate({ where: { automationId: a.id }, _sum: { clickCount: true } }),
    prisma.event.count({ where: { automationId: a.id, clickCount: { gt: 0 } } }),
  ]);
  const c = Object.fromEntries(counts.map((x) => [x.dmStatus, x._count]));
  const rc = Object.fromEntries(replyCounts.map((x) => [x.replyStatus, x._count]));
  const steps = stepsOf(a);
  const isFlow = steps.length > 0;
  const [convs, convStates, flowKinds, taps, clickSum] = isFlow ? await Promise.all([
    prisma.conversation.findMany({ where: { automationId: a.id }, orderBy: { updatedAt: 'desc' }, take: 200 }),
    prisma.conversation.groupBy({ by: ['state'], where: { automationId: a.id }, _count: true }),
    prisma.flowLog.groupBy({ by: ['kind'], where: { conversation: { automationId: a.id } }, _count: true }),
    prisma.flowLog.groupBy({ by: ['detail'], where: { kind: 'tap', conversation: { automationId: a.id } }, _count: true, orderBy: { _count: { detail: 'desc' } }, take: 8 }),
    prisma.conversation.aggregate({ where: { automationId: a.id }, _sum: { clicks: true } }),
  ]) : [[], [], [], [], null];
  const linkTaps = clickSum?._sum?.clicks || 0;
  const cs = Object.fromEntries(convStates.map((x) => [x.state, x._count]));
  const fk = Object.fromEntries(flowKinds.map((x) => [x.kind, x._count]));
  const convTotal = Object.values(cs).reduce((x, y) => x + y, 0);
  const stepName = (id) => { const i = steps.findIndex((st) => st.id === id); return i < 0 ? '–' : steps[i].name || `Message ${i + 1}`; };
  const platform = getPlatform(a.channel.platform);
  const handle = a.channel.platform === 'INSTAGRAM' ? `@${a.channel.username}` : a.channel.username;

  return (
    <>
      <Link href="/dashboard/automations" className="text-sm font-semibold text-slate hover:text-ink">← Automations</Link>

      <div className="mt-5 flex flex-wrap items-start justify-between gap-6">
        <div className="flex gap-5">
          {a.mediaThumb ? <img src={a.mediaThumb} alt="" className="h-24 w-24 rounded-lg object-cover" />
            : <span className="flex h-24 w-24 items-center justify-center rounded-lg bg-white text-center text-xs font-semibold text-slate">{a.scope === 'ALL_POSTS' ? 'All posts' : 'Post'}</span>}
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="font-display text-3xl font-bold tracking-tight">{a.name}</h1><StatusBadge s={a.status} /></div>
            <p className="mt-2 flex flex-wrap gap-1.5"><span className="rounded-md bg-ink/5 px-2 py-0.5 text-xs font-semibold">{typeInfo(a.type, a.channel.platform)?.title}</span>{a.requireFollow && <span className="rounded-md bg-marigold/20 px-2 py-0.5 text-xs font-semibold">Follow required</span>}</p>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate">
              <PlatformIcon platform={a.channel.platform} className="h-3.5 w-3.5" /> {handle} · {a.type === 'DM_FLOW' ? (a.channel.platform === 'FACEBOOK' ? 'Messenger' : 'direct messages') : a.type === 'STORY_REPLY' ? 'story replies' : a.type === 'STORY_MENTION' ? 'story mentions' : a.scope === 'ALL_POSTS' ? 'all posts' : 'one post'}
              {a.mediaPermalink && <> · <a href={a.mediaPermalink} target="_blank" rel="noreferrer" className="underline">View post</a></>}
            </p>
            <p className="mt-3 text-sm">{a.type === 'COMMENT_MODERATION' ? <>Removes: <strong>{[...a.keywords.slice(0, 8), a.modHideLinks && 'links'].filter(Boolean).join(', ')}</strong></> : a.type === 'STORY_MENTION' ? 'Trigger: any story mention' : <>Trigger: {a.matchType === 'ANY' ? 'any comment' : <>{a.matchType === 'EXACT' ? 'exactly' : 'contains'} <strong>{a.keywords.join(', ')}</strong></>}</>}</p>
            <p className="text-sm text-slate">
              {a.startAt ? `From ${fmtDate(a.startAt)}` : `Since ${fmtDate(a.createdAt)}`}{a.endAt && ` until ${fmtDate(a.endAt)}`} · {fmtNum(a.replyCount)}{a.maxReplies ? ` of ${fmtNum(a.maxReplies)}` : ''} replies used
            </p>
          </div>
        </div>
        <Controls id={a.id} name={a.name} status={a.status} type={a.type} canEdit={ctx.can('editAutomations')} />
      </div>

      {a.lastCheckNote && (
        <p className="card mt-6 px-4 py-3 text-sm">
          <span className="font-semibold">Last check{a.lastCheckedAt && <> · {fmtDate(a.lastCheckedAt)}</>}:</span> {a.lastCheckNote}
        </p>
      )}

 {isFlow && (
        <div className="mt-6">
          <StatGrid>
            <Stat label="Conversations" value={fmtNum(convTotal)} sub={`${fmtNum(cs.DONE || 0)} reached the end`} />
            <Stat label="Waiting for a follow" value={fmtNum(cs.AWAITING_FOLLOW || 0)} sub={a.requireFollow ? `${fmtNum(fk.follow_prompt || 0)} follow messages sent` : 'Follow check is off'} />
            <Stat label="Followed after asking" value={fmtNum(fk.follow_ok || 0)} tone="ok" />
            <Stat label="Button taps" value={fmtNum(fk.tap || 0)} sub={[linkTaps && `${fmtNum(linkTaps)} link taps`, fk.lead && `${fmtNum(fk.lead)} answers saved`, fk.follow_up && `${fmtNum(fk.follow_up)} reminders sent`, fk.error && `${fmtNum(fk.error)} errors`].filter(Boolean).join(' – ') || null} />
          </StatGrid>
        </div>
      )}

      {a.type === 'COMMENT_MODERATION' && (
        <div className="mt-6">
          <StatGrid>
            <Stat label="Comments removed" value={fmtNum((rc.HIDDEN || 0) + (rc.DELETED || 0))} tone="ok" sub={rc.DELETED ? `${fmtNum(rc.DELETED)} deleted` : null} />
            <Stat label="Failed" value={fmtNum(rc.FAILED || 0)} tone={rc.FAILED ? 'bad' : undefined} />
            <Stat label="Blocked words" value={fmtNum(a.keywords.length)} sub={a.modHideLinks ? 'Links removed too' : null} />
            <Stat label="Action" value={a.modAction === 'DELETE' ? 'Delete' : 'Hide'} />
          </StatGrid>
        </div>
      )}
      {a.type === 'COMMENT_REPLY' && (
        <div className="mt-6">
          <StatGrid>
            <Stat label="Comments matched" value={fmtNum(Object.values(c).reduce((x, y) => x + y, 0))} />
            <Stat label="Replies posted" value={fmtNum(rc.SENT || 0)} tone="ok" />
            <Stat label="Failed" value={fmtNum(rc.FAILED || 0)} tone={rc.FAILED ? 'bad' : undefined} />
            <Stat label="Limit" value={a.maxReplies ? `${fmtNum(a.replyCount)} / ${fmtNum(a.maxReplies)}` : 'None'} />
          </StatGrid>
        </div>
      )}
      {a.type === 'COMMENT_DM' && (
        <div className="mt-6">
          <StatGrid>
            <Stat label={isFlow ? 'First messages sent' : 'Messages sent'} value={fmtNum(c.SENT || 0)} tone="ok" />
            <Stat label="Failed" value={fmtNum(c.FAILED || 0)} tone={c.FAILED ? 'bad' : undefined} sub={c.SKIPPED ? `${fmtNum(c.SKIPPED)} skipped (limit)` : null} />
            <Stat label="Link clicks" value={a.linkUrl ? fmtNum(clickAgg._sum.clickCount || 0) : '–'} sub={a.linkUrl ? (a.trackClicks ? `${fmtNum(clickers)} people clicked` : 'Tracking is off') : 'No tracked link'} />
            <Stat label="Click-through rate" value={a.linkUrl && a.trackClicks ? pct(clickers, c.SENT || 0) : '–'} />
          </StatGrid>
        </div>
      )}

      {isFlow && (
        <section className="mt-8">
          <div className="mb-3 flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Conversations</h2>
            {taps.length > 0 && (
              <p className="text-sm text-slate">Most tapped: {taps.map((t) => `${t.detail} (${t._count})`).join(' · ')}</p>
            )}
          </div>
          {convs.length === 0 ? (
            <p className="card border-dashed p-8 text-slate">
              No conversations yet. {a.type === 'DM_FLOW' ? `Send “${a.keywords[0] || 'hi'}” in a DM from a different account to test it.` : a.type === 'STORY_REPLY' ? 'Reply to one of your stories from a different account to test it.' : a.type === 'STORY_MENTION' ? 'Mention this account in a story from a different account to test it.' : 'Comment the keyword from a different account, then tap the button in the message.'}
            </p>
          ) : (
            <div className="card overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead className="border-b border-line"><tr><th className="th">Person</th><th className="th">Status</th><th className="th">Now at</th><th className="th">Follows you</th><th className="th">Last activity</th></tr></thead>
                <tbody>
                  {convs.map((cv) => {
                    const url = cv.username && platform.profileUrl(cv.username);
                    return (
                      <tr key={cv.id} className="border-b border-line last:border-0">
                        <td className="td font-semibold">{cv.username ? (url ? <a className="hover:underline" href={url} target="_blank" rel="noreferrer">@{cv.username}</a> : cv.username) : <span className="text-slate">ID …{cv.contactId.slice(-6)}</span>}</td>
                        <td className="td">{cv.state === 'AWAITING_FOLLOW' ? <span className="rounded-full bg-marigold/20 px-2.5 py-0.5 text-xs font-semibold">Asked to follow{cv.followPrompts > 1 ? ` (${cv.followPrompts}×)` : ''}</span>
                          : cv.state === 'DONE' ? <span className="rounded-full bg-ok/10 px-2.5 py-0.5 text-xs font-semibold text-ok">Finished</span>
                          : <span className="rounded-full bg-sky/10 px-2.5 py-0.5 text-xs font-semibold text-sky">In progress</span>}</td>
                        <td className="td">{stepName(cv.currentStepId)}</td>
                        <td className="td">{cv.followed === true ? 'Yes' : cv.followed === false ? 'Not yet' : <span className="text-slate">–</span>}</td>
                        <td className="td whitespace-nowrap text-slate">{fmtDate(cv.updatedAt)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {['COMMENT_REPLY', 'COMMENT_DM', 'COMMENT_MODERATION'].includes(a.type) && <section className="mt-8">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-bold">{a.type === 'COMMENT_MODERATION' ? 'Removed comments' : a.type === 'COMMENT_REPLY' ? 'Comments replied to' : 'Who got the message'}</h2>
          <form className="flex flex-wrap gap-2">
            <input name="q" defaultValue={q} placeholder="Search user or comment" className="field w-52" aria-label="Search" />
            <select name="dm" defaultValue={dm || ''} className="field w-36" aria-label="Message status"><option value="">All</option><option value="SENT">Sent</option><option value="FAILED">Failed</option><option value="SKIPPED">Skipped</option></select>
            {a.linkUrl && a.trackClicks && <label className="flex items-center gap-2 rounded-lg border border-line bg-white px-3 text-sm"><input type="checkbox" name="clicked" value="1" defaultChecked={clicked} className="accent-ink" />Clicked</label>}
            <button className="btn-ghost">Filter</button>
            <a href={`/api/automations/${a.id}/export`} className="btn-dark">Download CSV</a>
          </form>
        </div>

        {events.length === 0 ? (
          <p className="card border-dashed p-8 text-slate">
            {q || dm || clicked ? 'No rows match these filters.' : `No replies yet. Comment “${a.keywords[0] || 'hi'}” on ${a.scope === 'ALL_POSTS' ? 'any post' : 'the post'} from a different account to test it.`}
          </p>
        ) : (
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line"><tr><th className="th">When</th><th className="th">User</th><th className="th">Comment</th><th className="th">Message</th><th className="th">Public reply</th><th className="th">Clicks</th></tr></thead>
              <tbody>
                {events.map((e) => {
                  const url = e.commenterUsername && platform.profileUrl(e.commenterUsername);
                  return (
                    <tr key={e.id} className="border-b border-line last:border-0">
                      <td className="td whitespace-nowrap text-slate">{fmtDate(e.createdAt)}</td>
                      <td className="td font-semibold">{!e.commenterUsername ? '–' : url ? <a className="hover:underline" href={url} target="_blank" rel="noreferrer">@{e.commenterUsername}</a> : e.commenterUsername}</td>
                      <td className="td max-w-xs">{e.commentText}{e.matchedKeyword && <span className="mt-1 block text-xs text-slate">matched “{e.matchedKeyword}”</span>}</td>
                      <td className="td"><StatusBadge s={e.dmStatus} />{e.dmError && <span className="mt-1 block max-w-[220px] text-xs text-bad">{e.dmError}</span>}</td>
                      <td className="td"><StatusBadge s={e.replyStatus} />{e.replyText && <span className="mt-1 block max-w-[200px] text-xs text-slate">{e.replyText}</span>}{e.replyError && <span className="mt-1 block max-w-[200px] text-xs text-bad">{e.replyError}</span>}</td>
                      <td className="td tabular-nums">{e.linkCode ? (e.clickCount ? <span className="font-semibold text-ok">{e.clickCount}</span> : <span className="text-slate">0</span>) : '–'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>}
    </>
  );
}
