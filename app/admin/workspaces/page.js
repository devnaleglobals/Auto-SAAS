import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PLANS, effectivePlan, usageThisMonth, limitsOf } from '@/lib/plans';
import { fmtNum, fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminWorkspaces({ searchParams }) {
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const status = sp?.status;
  const where = {
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { memberships: { some: { user: { OR: [{ email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } } } }] } : {}),
    ...(status === 'suspended' ? { suspended: true } : {}),
    ...(status === 'broken' ? { channels: { some: { needsReconnect: true } } } : {}),
  };
  let rows = await prisma.workspace.findMany({
    where, orderBy: { createdAt: 'desc' }, take: 300,
    include: {
      memberships: { where: { role: 'OWNER' }, include: { user: { select: { email: true, name: true } } } },
      _count: { select: { channels: true, memberships: true, automations: true } },
    },
  });
  if (PLANS[sp?.plan]) rows = rows.filter((w) => effectivePlan(w) === sp.plan);

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Clients</h1>
      <p className="mt-1 text-slate">Every workspace on the platform. Open one to change its plan, suspend it or add notes.</p>
      <form className="my-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search workspace, owner name or email" className="field w-80" aria-label="Search clients" />
        <select name="plan" defaultValue={sp?.plan || ''} className="field w-40" aria-label="Plan">
          <option value="">All plans</option>{Object.entries(PLANS).map(([k, p]) => <option key={k} value={k}>{p.name}</option>)}
        </select>
        <select name="status" defaultValue={status || ''} className="field w-56" aria-label="Status">
          <option value="">Any status</option><option value="broken">Needs reconnecting</option><option value="suspended">Suspended</option>
        </select>
        <button className="btn-dark">Apply</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-line"><tr>
            <th className="th">Client</th><th className="th">Owner</th><th className="th">Plan</th><th className="th">Messages this month</th>
            <th className="th">Accounts</th><th className="th">Team</th><th className="th">Automations</th><th className="th">Joined</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {rows.map((w) => {
              const used = usageThisMonth(w), cap = limitsOf(w).messages;
              const owner = w.memberships[0]?.user;
              return (
                <tr key={w.id} className="border-b border-line last:border-0 hover:bg-canvas">
                  <td className="td"><Link href={`/admin/workspaces/${w.id}`} className="font-semibold hover:underline">{w.name}</Link></td>
                  <td className="td"><span className="block">{owner?.name || '–'}</span><span className="block text-xs text-slate">{owner?.email || 'Social sign-in'}</span></td>
                  <td className="td">{PLANS[effectivePlan(w)].name}{w.plan !== 'FREE' && !w.razorpaySubId && <span className="block text-xs text-slate">complimentary</span>}</td>
                  <td className="td tabular-nums"><span className={used >= cap ? 'font-semibold text-bad' : ''}>{fmtNum(used)}</span><span className="text-slate"> / {fmtNum(cap)}</span></td>
                  <td className="td tabular-nums">{w._count.channels}</td>
                  <td className="td tabular-nums">{w._count.memberships}</td>
                  <td className="td tabular-nums">{w._count.automations}</td>
                  <td className="td whitespace-nowrap text-slate">{fmtDate(w.createdAt)}</td>
                  <td className="td">{w.suspended ? <span className="rounded-full bg-bad/10 px-2.5 py-0.5 text-xs font-semibold text-bad">Suspended</span> : <span className="rounded-full bg-ok/10 px-2.5 py-0.5 text-xs font-semibold text-ok">Active</span>}</td>
                </tr>
              );
            })}
            {rows.length === 0 && <tr><td colSpan={9} className="td py-10 text-center text-slate">No clients match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
