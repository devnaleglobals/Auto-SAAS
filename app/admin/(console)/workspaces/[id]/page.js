import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { PLANS, PLAN_KEYS, effectivePlan, usageThisMonth, limitsOf, rupees, onTrial } from '@/lib/plans';
import { adminCan } from '@/lib/admin';
import { typeInfo } from '@/lib/automationTypes';
import { StatGrid, Stat, fmtNum, fmtDate } from '@/components/ui';
import PlatformIcon from '@/components/PlatformIcon';
import StatusBadge from '@/components/StatusBadge';
import AdminWorkspaceActions from '@/components/AdminWorkspaceActions';
import { requireAdminPage } from '@/lib/admin';

export const dynamic = 'force-dynamic';

export default async function AdminWorkspace({ params }) {
  const admin = await requireAdminPage('clients.view'); // checked on every page, not only in the layout
  const { id } = await params;
  const ws = await prisma.workspace.findUnique({
    where: { id },
    include: {
      memberships: { include: { user: true }, orderBy: { createdAt: 'asc' } },
      channels: { orderBy: { connectedAt: 'asc' } },
      automations: { orderBy: { createdAt: 'desc' }, include: { channel: { select: { platform: true, username: true } } } },
      payments: { orderBy: { createdAt: 'desc' }, take: 12 },
      tickets: { orderBy: { lastReplyAt: 'desc' }, take: 10 },
      creditTxns: { where: { status: 'PAID' }, orderBy: { createdAt: 'desc' }, take: 10 },
    },
  });
  if (!ws) notFound();
  const [leads, logs] = await Promise.all([
    prisma.lead.count({ where: { workspaceId: id } }),
    prisma.auditLog.findMany({ where: { workspaceId: id }, orderBy: { createdAt: 'desc' }, take: 10, include: { user: { select: { name: true } } } }),
  ]);
  const plan = effectivePlan(ws);
  const paid = ws.payments.filter((p) => p.status === 'captured').reduce((s, p) => s + p.amount, 0);

  return (
    <>
      <Link href="/admin/workspaces" className="text-sm font-semibold text-slate hover:text-ink">← Clients</Link>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <h1 className="font-display text-3xl font-bold">{ws.name}</h1>
        {ws.suspended && <span className="rounded-full bg-bad/10 px-2.5 py-0.5 text-xs font-semibold text-bad">Suspended</span>}
      </div>
      <p className="mt-1 text-sm text-slate">Joined {fmtDate(ws.createdAt)}. Workspace ID {ws.id}</p>

      <div className="mt-6"><StatGrid>
        <Stat label="Plan" value={PLANS[plan].name} sub={onTrial(ws) ? `Free trial until ${fmtDate(ws.trialEndsAt)}` : ws.periodEnd ? `${ws.razorpaySubId ? `Razorpay (${ws.subStatus})` : 'Complimentary'} until ${fmtDate(ws.periodEnd)}` : 'No paid period'} />
        <Stat label="Messages this month" value={fmtNum(usageThisMonth(ws))} sub={`of ${fmtNum(limitsOf(ws).messages)}`} />
        <Stat label="Total paid" value={rupees(Math.round(paid / 100))} sub={`${ws.payments.length} payment${ws.payments.length === 1 ? '' : 's'}`} />
        <Stat label="Message credits" value={fmtNum(ws.credits)} sub={`${fmtNum(leads)} leads collected`} />
      </StatGrid></div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.4fr_1fr]">
        <div className="space-y-6">
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Team</h2>
            <ul className="card divide-y divide-line text-sm">
              {ws.memberships.map((m) => (
                <li key={m.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                  <span><span className="font-semibold">{m.user.name}</span><span className="block text-xs text-slate">{m.user.email || 'Social sign-in'}{m.user.lastLoginAt ? `, last login ${fmtDate(m.user.lastLoginAt)}` : ''}</span></span>
                  <StatusBadge s={m.role} />
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Connected accounts</h2>
            {ws.channels.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">No accounts connected yet.</p> : (
              <ul className="card divide-y divide-line text-sm">
                {ws.channels.map((c) => (
                  <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
                    <span className="flex items-center gap-2"><PlatformIcon platform={c.platform} />{c.platform === 'INSTAGRAM' ? `@${c.username}` : c.username}</span>
                    <span className={`text-xs font-semibold ${c.needsReconnect ? 'text-bad' : 'text-ok'}`}>{c.needsReconnect ? 'Needs reconnecting' : 'Connected'}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Automations</h2>
            {ws.automations.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">No automations yet.</p> : (
              <div className="card overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="border-b border-line"><tr><th className="th">Name</th><th className="th">Type</th><th className="th">Replies</th><th className="th">Status</th></tr></thead>
                  <tbody>{ws.automations.map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="td"><span className="flex items-center gap-1.5"><PlatformIcon platform={a.channel.platform} className="h-3.5 w-3.5" />{a.name}</span></td>
                      <td className="td">{typeInfo(a.type, a.channel.platform)?.title}</td>
                      <td className="td tabular-nums">{fmtNum(a.replyCount)}</td>
                      <td className="td"><StatusBadge s={a.status} /></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Support tickets</h2>
            {ws.tickets.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">No tickets.</p> : (
              <ul className="card divide-y divide-line text-sm">{ws.tickets.map((t) => <li key={t.id}><Link href={`/admin/tickets/${t.id}`} className="flex justify-between gap-3 px-4 py-2.5 hover:bg-canvas"><span><strong>#{t.number}</strong> {t.subject}</span><StatusBadge s={t.status} /></Link></li>)}</ul>
            )}
          </section>
          {ws.creditTxns.length > 0 && <section>
            <h2 className="mb-3 font-display text-lg font-bold">Credit history</h2>
            <ul className="card divide-y divide-line text-sm">{ws.creditTxns.map((c) => <li key={c.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span><strong className={c.credits > 0 ? 'text-ok' : 'text-bad'}>{c.credits > 0 ? '+' : ''}{fmtNum(c.credits)}</strong> {c.kind === 'PURCHASE' ? `bought ${c.packName || ''} for ${rupees(Math.round(c.amount / 100))}` : c.note}</span><span className="text-xs text-slate">{fmtDate(c.createdAt)}</span></li>)}</ul>
          </section>}
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Billing details</h2>
            <dl className="card grid gap-2 p-4 text-sm sm:grid-cols-[140px_1fr]">
              <dt className="text-slate">Business</dt><dd>{ws.billingName || '–'}</dd>
              <dt className="text-slate">Email</dt><dd>{ws.billingEmail || '–'}</dd>
              <dt className="text-slate">Phone</dt><dd>{ws.billingPhone || '–'}</dd>
              <dt className="text-slate">GSTIN</dt><dd>{ws.billingGstin || '–'}</dd>
              <dt className="text-slate">Address</dt><dd>{ws.billingAddress || '–'}</dd>
              <dt className="text-slate">Razorpay</dt><dd className="break-all font-mono text-xs">{ws.razorpaySubId || 'No subscription'}{ws.razorpayCustomerId ? ` · ${ws.razorpayCustomerId}` : ''}</dd>
            </dl>
          </section>
          <section>
            <h2 className="mb-3 font-display text-lg font-bold">Recent activity in this workspace</h2>
            {logs.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">Nothing yet.</p> : (
              <ul className="card divide-y divide-line text-sm">{logs.map((l) => <li key={l.id} className="px-4 py-2.5"><strong>{l.user?.name || 'System'}</strong> {l.action.replace(/[._]/g, ' ')} <span className="text-slate">{l.detail}</span><span className="block text-xs text-slate">{fmtDate(l.createdAt)}</span></li>)}</ul>
            )}
          </section>
        </div>
        <AdminWorkspaceActions
          can={{ edit: adminCan(admin, 'clients.edit'), billing: adminCan(admin, 'billing'), danger: adminCan(admin, 'danger') }}
          plans={PLAN_KEYS.map((k) => [k, PLANS[k].name])}
          ws={{
            id: ws.id, name: ws.name, plan: ws.plan, periodEnd: ws.periodEnd?.toISOString() || null, suspended: ws.suspended, suspendReason: ws.suspendReason, adminNote: ws.adminNote,
            credits: ws.credits, trialPlan: ws.trialPlan, trialEndsAt: ws.trialEndsAt?.toISOString() || null, razorpaySubId: ws.razorpaySubId, subStatus: ws.subStatus,
            billingName: ws.billingName || '', billingEmail: ws.billingEmail || '', billingPhone: ws.billingPhone || '', billingGstin: ws.billingGstin || '', billingAddress: ws.billingAddress || '',
          }} />
      </div>
    </>
  );
}
