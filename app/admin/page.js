import Link from 'next/link';
import { prisma } from '@/lib/db';
import { platformStats } from '@/lib/adminStats';
import { PLANS, rupees, effectivePlan } from '@/lib/plans';
import { StatGrid, Stat, fmtNum, fmtDate } from '@/components/ui';
import Bars from '@/components/Bars';

export const dynamic = 'force-dynamic';

export default async function AdminOverview() {
  const s = await platformStats();
  const [recent, logs] = await Promise.all([
    prisma.workspace.findMany({ orderBy: { createdAt: 'desc' }, take: 8, include: { memberships: { where: { role: 'OWNER' }, include: { user: { select: { email: true, name: true } } } }, _count: { select: { channels: true } } } }),
    prisma.adminLog.findMany({ orderBy: { createdAt: 'desc' }, take: 8 }),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Platform overview</h1>
      <p className="mt-1 text-slate">Every client on ReplyRelay, this month.</p>

      <div className="mt-8"><StatGrid>
        <Stat label="Monthly recurring revenue" value={rupees(s.mrr)} tone="ok" sub={`${fmtNum(s.paying)} paying clients`} />
        <Stat label="Collected this month" value={rupees(s.revenueMonth)} sub={`${fmtNum(s.paymentsMonth)} payments`} />
        <Stat label="Clients (workspaces)" value={fmtNum(s.workspaces)} sub={`${fmtNum(s.users)} users`} />
        <Stat label="Messages sent this month" value={fmtNum(s.messages)} sub={`${fmtNum(s.activeAutomations)} automations running`} />
      </StatGrid></div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">New clients, last 30 days</h2>
          <div className="mt-4"><Bars days={s.signupDays} label="new workspaces" /></div>
        </section>
        <section className="card p-5">
          <h2 className="font-display text-lg font-bold">Clients by plan</h2>
          <ul className="mt-4 space-y-3">
            {Object.entries(s.byPlan).map(([k, n]) => (
              <li key={k}>
                <div className="flex justify-between text-sm"><span className="font-semibold">{PLANS[k].name}</span><span className="tabular-nums text-slate">{fmtNum(n)}</span></div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-canvas"><div className="bar-fill h-full rounded-full bg-navy" style={{ width: `${s.workspaces ? (n / s.workspaces) * 100 : 0}%` }} /></div>
              </li>
            ))}
          </ul>
          <div className="mt-5 grid grid-cols-2 gap-3 border-t border-line pt-4 text-sm">
            <Link href="/admin/workspaces?status=broken" className={`rounded-lg p-3 ${s.broken ? 'bg-bad/5 text-bad' : 'bg-canvas'}`}><span className="block font-display text-2xl font-bold">{s.broken}</span>accounts need reconnecting</Link>
            <Link href="/admin/workspaces?status=suspended" className="rounded-lg bg-canvas p-3"><span className="block font-display text-2xl font-bold">{s.suspended}</span>suspended clients</Link>
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <div className="mb-3 flex items-baseline justify-between"><h2 className="font-display text-lg font-bold">Newest clients</h2><Link href="/admin/workspaces" className="text-sm font-semibold text-slate hover:text-ink">All clients</Link></div>
          <ul className="card divide-y divide-line">
            {recent.map((w) => (
              <li key={w.id}><Link href={`/admin/workspaces/${w.id}`} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-canvas">
                <span className="min-w-0"><span className="block truncate font-semibold">{w.name}</span><span className="block truncate text-xs text-slate">{w.memberships[0]?.user.email || w.memberships[0]?.user.name || 'No owner email'}</span></span>
                <span className="shrink-0 text-right text-xs text-slate"><span className="block font-semibold text-ink">{PLANS[effectivePlan(w)].name}</span>{fmtDate(w.createdAt)}</span>
              </Link></li>
            ))}
          </ul>
        </section>
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Recent admin actions</h2>
          {logs.length === 0 ? <p className="card border-dashed p-6 text-sm text-slate">Plan changes, suspensions and notes you make appear here.</p> : (
            <ul className="card divide-y divide-line text-sm">
              {logs.map((l) => <li key={l.id} className="px-4 py-3"><span className="font-semibold">{l.action.replace(/_/g, ' ')}</span> {l.detail && <span className="text-slate">{l.detail}</span>}<span className="block text-xs text-slate">{l.adminEmail}, {fmtDate(l.createdAt)}</span></li>)}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}
