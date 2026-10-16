import Link from 'next/link';
import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { Notice, Empty, fmtNum } from '@/components/ui';
import DailyChart from '@/components/DailyChart';
import StatusBadge from '@/components/StatusBadge';
import PlatformIcon from '@/components/PlatformIcon';
import CountUp from '@/components/CountUp';
import AutoRefresh from '@/components/AutoRefresh';
import { limitsOf, usageThisMonth } from '@/lib/plans';

export const dynamic = 'force-dynamic';

const clip = (s, n = 60) => (s && s.length > n ? `${s.slice(0, n)}…` : s || '');
function ago(d) {
  const s = Math.max(1, Math.round((Date.now() - new Date(d).getTime()) / 1000));
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}
function greeting() {
  const h = Number(new Date().toLocaleString('en-IN', { hour: 'numeric', hour12: false, timeZone: 'Asia/Kolkata' }));
  return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';
}

export default async function Overview({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const ws = ctx.workspace.id;
  const since = new Date(Date.now() - 29 * 86400000); since.setHours(0, 0, 0, 0);

  const [channels, automations, events, recentEvents, recentFlow, convCount, leadCount, members, wsFull] = await Promise.all([
    prisma.channel.findMany({ where: { workspaceId: ws } }),
    prisma.automation.findMany({ where: { workspaceId: ws }, include: { channel: { select: { platform: true, username: true } } } }),
    prisma.event.findMany({ where: { automation: { workspaceId: ws }, createdAt: { gte: since } }, select: { automationId: true, createdAt: true, dmStatus: true, replyStatus: true, clickCount: true } }),
    prisma.event.findMany({ where: { automation: { workspaceId: ws } }, orderBy: { createdAt: 'desc' }, take: 12, include: { automation: { select: { name: true, channel: { select: { platform: true } } } } } }),
    prisma.flowLog.findMany({ where: { kind: { in: ['started', 'lead', 'follow_ok'] }, conversation: { automation: { workspaceId: ws } } }, orderBy: { createdAt: 'desc' }, take: 12, include: { conversation: { select: { username: true, automation: { select: { name: true, channel: { select: { platform: true } } } } } } } }),
    prisma.conversation.count({ where: { automation: { workspaceId: ws }, startedAt: { gte: since } } }),
    prisma.lead.count({ where: { workspaceId: ws, createdAt: { gte: since } } }),
    prisma.membership.count({ where: { workspaceId: ws } }),
    prisma.workspace.findUnique({ where: { id: ws } }),
  ]);

  const sent = events.filter((e) => e.dmStatus === 'SENT' || e.replyStatus === 'SENT').length;
  const clicks = events.reduce((s, e) => s + e.clickCount, 0);
  const clickers = events.filter((e) => e.clickCount > 0).length;
  const dmSent = events.filter((e) => e.dmStatus === 'SENT').length;

  const days = Array.from({ length: 30 }, (_, i) => {
    const d = new Date(since.getTime() + i * 86400000);
    return { key: d.toISOString().slice(0, 10), label: d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }), sent: 0, clicks: 0 };
  });
  const byDay = Object.fromEntries(days.map((d) => [d.key, d]));
  for (const e of events) {
    const d = byDay[new Date(e.createdAt).toISOString().slice(0, 10)];
    if (!d) continue;
    if (e.dmStatus === 'SENT' || e.replyStatus === 'SENT') d.sent++;
    d.clicks += e.clickCount;
  }

  // Live activity: what the automations did, in plain words
  const feed = [
    ...recentEvents.map((e) => {
      const who = e.commenterUsername || 'Someone';
      const text = e.replyStatus === 'HIDDEN' || e.replyStatus === 'DELETED'
        ? `${e.replyStatus === 'HIDDEN' ? 'Hid' : 'Deleted'} a comment from ${who}: “${clip(e.commentText, 50)}”`
        : e.dmStatus === 'FAILED' || e.replyStatus === 'FAILED'
          ? `Couldn’t reply to ${who}. Open the automation to see why.`
          : e.dmStatus === 'SENT'
            ? `Sent ${who} a private message after they commented “${clip(e.commentText, 40)}”`
            : `Replied to ${who}’s comment “${clip(e.commentText, 40)}”`;
      return { id: `e${e.id}`, at: e.createdAt, text, tone: e.dmStatus === 'FAILED' || e.replyStatus === 'FAILED' ? 'bad' : 'ok', platform: e.automation.channel.platform, where: e.automation.name };
    }),
    ...recentFlow.map((l) => {
      const who = l.conversation.username || 'Someone';
      const text = l.kind === 'lead' ? `${who} shared their ${String(l.detail || '').split(':')[0] || 'details'}` : l.kind === 'follow_ok' ? `${who} followed you after being asked` : `${who} started a conversation`;
      return { id: `f${l.id}`, at: l.createdAt, text, tone: l.kind === 'lead' ? 'lead' : 'ok', platform: l.conversation.automation.channel.platform, where: l.conversation.automation.name };
    }),
  ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 12);

  const steps = [
    { done: channels.length > 0, label: 'Connect an Instagram account or Facebook Page', href: '/dashboard/accounts' },
    { done: automations.length > 0, label: 'Create your first automation', href: '/dashboard/automations/new' },
    { done: events.length > 0 || recentFlow.length > 0, label: 'Get your first automatic reply (comment your keyword from another account)', href: automations[0] ? `/dashboard/automations/${automations[0].id}` : '/dashboard/automations' },
    { done: members > 1, label: 'Invite a teammate', href: '/dashboard/team' },
    { done: Boolean(wsFull?.billingName), label: 'Add billing details for invoices', href: '/dashboard/billing#billing-details' },
  ];
  const doneSteps = steps.filter((s) => s.done).length;

  const perAuto = {};
  for (const e of events) {
    const p = (perAuto[e.automationId] ||= { sent: 0, clicks: 0 });
    if (e.dmStatus === 'SENT' || e.replyStatus === 'SENT') p.sent++;
    p.clicks += e.clickCount;
  }
  const top = automations.map((a) => ({ ...a, ...(perAuto[a.id] || { sent: 0, clicks: 0 }) })).sort((a, b) => b.sent - a.sent).slice(0, 5);
  const broken = channels.filter((c) => c.needsReconnect);
  const used = usageThisMonth(wsFull);
  const cap = limitsOf(wsFull).messages;
  const running = automations.filter((a) => a.status === 'ACTIVE').length;
  const first = ctx.user.name?.split(' ')[0];

  return (
    <>
      <AutoRefresh seconds={30} />
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-[-0.01em]">{greeting()}{first ? `, ${first}` : ''}</h1>
          <p className="mt-1.5 text-slate">{running ? `${running} automation${running > 1 ? 's are' : ' is'} replying for you right now.` : 'Nothing is running yet. Start an automation to reply automatically.'}</p>
        </div>
        {ctx.can('editAutomations') && channels.length > 0 && <Link href="/dashboard/automations/new" className="btn-primary">New automation</Link>}
      </div>

      {sp?.connect === 'ok' && <Notice>Account connected. Create an automation to start replying.</Notice>}
      {broken.map((c) => (
        <Notice key={c.id} tone="bad" action={<Link href="/dashboard/accounts" className="btn-dark btn-sm">Reconnect</Link>}>The connection for {c.username} stopped working, so its automations are on hold.</Notice>
      ))}
      {used >= cap * 0.8 && (
        <Notice tone={used >= cap ? 'bad' : 'warn'} action={<Link href="/dashboard/billing" className="btn-dark btn-sm">See plans</Link>}>
          {used >= cap ? `You’ve used all ${fmtNum(cap)} messages this month, so automations are paused.` : `You’ve used ${fmtNum(used)} of ${fmtNum(cap)} messages this month.`}
        </Notice>
      )}

      {doneSteps < steps.length && (
        <section className="mb-6 rounded-xl border border-ink/10 bg-white p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Get set up</h2>
            <span className="text-sm text-slate">{doneSteps} of {steps.length} done</span>
          </div>
          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-canvas"><div className="bar-fill h-full rounded-full bg-marigold" style={{ width: `${(doneSteps / steps.length) * 100}%` }} /></div>
          <ol className="mt-4 grid gap-2 sm:grid-cols-2">
            {steps.map((s, i) => (
              <li key={s.label}>
                <Link href={s.href} className={`flex items-start gap-3 rounded-lg p-3 text-sm transition-colors ${s.done ? 'text-slate' : 'bg-canvas hover:bg-marigold/10'}`}>
                  <span className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${s.done ? 'bg-ok text-white' : 'border-2 border-ink/20 text-ink'}`}>{s.done ? '✓' : i + 1}</span>
                  <span className={s.done ? 'line-through decoration-slate/40' : 'font-semibold'}>{s.label}</span>
                </Link>
              </li>
            ))}
          </ol>
        </section>
      )}

      {channels.length === 0 ? (
        <Empty title="Connect your first account" href="/dashboard/accounts" cta="Connect an account">Connect an Instagram Business or Creator account, or a Facebook Page, to start replying automatically.</Empty>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
            {[
              ['Replies and messages sent', sent, `last 30 days, ${fmtNum(used)} this month`],
              ['Conversations started', convCount, 'last 30 days'],
              ['Leads collected', leadCount, 'names, phones and emails'],
              ['Link clicks', clicks, dmSent ? `${Math.round((clickers / dmSent) * 1000) / 10}% of messages clicked` : 'no tracked links yet'],
            ].map(([label, value, sub]) => (
              <div key={label} className="bg-white p-5">
                <dt className="text-sm text-slate">{label}</dt>
                <dd className="mt-1 font-display text-3xl font-bold"><CountUp value={value} /></dd>
                <dd className="mt-0.5 text-xs text-slate">{sub}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-6 grid gap-6 xl:grid-cols-[1.35fr_1fr]">
            <section className="card p-5">
              <h2 className="mb-4 font-display text-lg font-bold">Daily activity</h2>
              <DailyChart days={days} />
            </section>

            <section className="card flex flex-col p-5">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-bold">Live activity</h2>
                <span className="flex items-center gap-1.5 text-xs font-semibold text-ok"><span className="live-dot h-2 w-2 rounded-full bg-ok" aria-hidden />Live</span>
              </div>
              {feed.length === 0 ? (
                <p className="mt-6 text-sm text-slate">Replies, conversations and new leads appear here as they happen. Comment your keyword from another account to see the first one.</p>
              ) : (
                <ol className="mt-3 flex-1 space-y-1" aria-live="polite">
                  {feed.map((f, i) => (
                    <li key={f.id} className={`flex gap-3 rounded-lg px-2 py-2 ${i === 0 && Date.now() - new Date(f.at).getTime() < 120000 ? 'feed-in' : ''}`}>
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${f.tone === 'bad' ? 'bg-bad' : f.tone === 'lead' ? 'bg-marigold' : 'bg-ok'}`} aria-hidden />
                      <span className="min-w-0 flex-1 text-sm">
                        <span className="block">{f.text}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-slate"><PlatformIcon platform={f.platform} className="h-3 w-3" />{f.where}, {ago(f.at)}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              )}
            </section>
          </div>

          <section className="mt-6">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">Top automations</h2>
              <Link href="/dashboard/automations" className="text-sm font-semibold text-slate hover:text-ink">See all</Link>
            </div>
            {top.length === 0 ? <Empty title="No automations yet" href={ctx.can('editAutomations') ? '/dashboard/automations/new' : null} cta="Create an automation" /> : (
              <ul className="card divide-y divide-line">
                {top.map((a) => (
                  <li key={a.id}>
                    <Link href={`/dashboard/automations/${a.id}`} className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-canvas">
                      <PlatformIcon platform={a.channel.platform} />
                      <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{a.name}</span><span className="block truncate text-xs text-slate">{a.channel.username}</span></span>
                      <span className="hidden text-right text-sm tabular-nums sm:block"><strong>{fmtNum(a.sent)}</strong> <span className="text-slate">sent</span></span>
                      <span className="hidden text-right text-sm tabular-nums md:block"><strong>{fmtNum(a.clicks)}</strong> <span className="text-slate">clicks</span></span>
                      <StatusBadge s={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </>
  );
}
