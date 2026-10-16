import Link from 'next/link';
import { prisma } from '@/lib/db';
import { PLANS, rupees } from '@/lib/plans';
import { StatGrid, Stat, fmtNum, fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AdminPayments() {
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const [payments, all, month, failed] = await Promise.all([
    prisma.payment.findMany({ orderBy: { createdAt: 'desc' }, take: 300, include: { workspace: { select: { id: true, name: true } } } }),
    prisma.payment.aggregate({ where: { status: 'captured' }, _sum: { amount: true }, _count: true }),
    prisma.payment.aggregate({ where: { status: 'captured', createdAt: { gte: monthStart } }, _sum: { amount: true }, _count: true }),
    prisma.payment.count({ where: { status: 'failed', createdAt: { gte: monthStart } } }),
  ]);
  const r = (paise) => rupees(Math.round((paise || 0) / 100));
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Payments</h1>
      <p className="mt-1 text-slate">Charges recorded from Razorpay. Refunds and payouts are managed in your Razorpay dashboard.</p>
      <div className="mt-6"><StatGrid>
        <Stat label="Collected this month" value={r(month._sum.amount)} tone="ok" sub={`${fmtNum(month._count)} payments`} />
        <Stat label="Collected all time" value={r(all._sum.amount)} sub={`${fmtNum(all._count)} payments`} />
        <Stat label="Failed this month" value={fmtNum(failed)} tone={failed ? 'bad' : undefined} />
        <Stat label="Average payment" value={all._count ? r((all._sum.amount || 0) / all._count) : '–'} />
      </StatGrid></div>
      <div className="card mt-6 overflow-x-auto">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-line"><tr><th className="th">Date</th><th className="th">Client</th><th className="th">Plan</th><th className="th">Amount</th><th className="th">Method</th><th className="th">Status</th><th className="th">Razorpay ID</th></tr></thead>
          <tbody>
            {payments.map((p) => (
              <tr key={p.id} className="border-b border-line last:border-0">
                <td className="td whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                <td className="td"><Link href={`/admin/workspaces/${p.workspace.id}`} className="font-semibold hover:underline">{p.workspace.name}</Link></td>
                <td className="td">{PLANS[p.plan]?.name || '–'}</td>
                <td className="td tabular-nums">{r(p.amount)}</td>
                <td className="td capitalize">{p.method || '–'}</td>
                <td className="td"><span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${p.status === 'captured' ? 'bg-ok/10 text-ok' : 'bg-bad/10 text-bad'}`}>{p.status === 'captured' ? 'Paid' : p.status}</span></td>
                <td className="td text-xs text-slate">{p.razorpayId}</td>
              </tr>
            ))}
            {payments.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-slate">No payments yet. They appear here when Razorpay charges a subscription.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
