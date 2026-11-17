import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';
import { CATEGORIES, ADMIN_STATUS_LABEL } from '@/lib/tickets';

export const dynamic = 'force-dynamic';
const TABS = [['open', 'Open', { status: 'OPEN' }], ['pending', 'Waiting for client', { status: 'PENDING' }], ['mine', 'Assigned to me', null], ['resolved', 'Resolved & closed', { status: { in: ['RESOLVED', 'CLOSED'] } }], ['all', 'All', {}]];
const PRI = { URGENT: 'bg-bad text-white', HIGH: 'bg-bad/10 text-bad', NORMAL: 'bg-canvas text-ink', LOW: 'bg-canvas text-slate' };

export default async function AdminTickets({ searchParams }) {
  const admin = await requireAdminPage('tickets');
  const sp = await searchParams;
  const tab = TABS.find((t) => t[0] === sp?.tab) || TABS[0];
  const q = String(sp?.q || '').trim();
  const where = { ...(tab[0] === 'mine' ? { assignedToId: admin.id, status: { in: ['OPEN', 'PENDING'] } } : tab[2]) };
  if (q) where.OR = [{ subject: { contains: q, mode: 'insensitive' } }, { email: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }, ...(/^\d+$/.test(q.replace('#', '')) ? [{ number: Number(q.replace('#', '')) }] : [])];
  const [tickets, counts] = await Promise.all([
    prisma.ticket.findMany({ where, orderBy: [{ lastReplyAt: 'desc' }], take: 200, include: { workspace: { select: { name: true } }, assignedTo: { select: { name: true } } } }),
    prisma.ticket.groupBy({ by: ['status'], _count: true }),
  ]);
  const count = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Support tickets</h1>
      <p className="mt-1 text-slate">Requests from clients (dashboard) and visitors (website contact form). Replies are emailed to them.</p>
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-1 text-sm" aria-label="Ticket filters">
          {TABS.map(([k, label]) => (
            <Link key={k} href={`/admin/tickets?tab=${k}`} aria-current={tab[0] === k ? 'page' : undefined} className={`rounded-lg px-3 py-1.5 font-semibold ${tab[0] === k ? 'bg-navy text-white' : 'text-slate hover:bg-surface'}`}>
              {label}{k === 'open' && count.OPEN ? ` (${count.OPEN})` : ''}{k === 'pending' && count.PENDING ? ` (${count.PENDING})` : ''}
            </Link>
          ))}
        </nav>
        <form className="flex gap-2"><input type="hidden" name="tab" value={tab[0]} /><input name="q" defaultValue={q} placeholder="Search #, subject, email" className="field w-64" aria-label="Search tickets" /><button className="btn-dark">Search</button></form>
      </div>
      <div className="card mt-4 overflow-x-auto">
        {tickets.length === 0 ? <p className="p-8 text-center text-sm text-slate">No tickets here.</p> : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Ticket</th><th className="th">From</th><th className="th">Category</th><th className="th">Priority</th><th className="th">Status</th><th className="th">Assigned</th><th className="th">Last update</th></tr></thead>
            <tbody>{tickets.map((t) => (
              <tr key={t.id} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="td"><Link href={`/admin/tickets/${t.id}`} className="font-semibold hover:underline">#{t.number} {t.subject}</Link></td>
                <td className="td"><span className="block">{t.name}</span><span className="text-xs text-slate">{t.workspace?.name || (t.source === 'website' ? 'Website visitor' : t.email)}</span></td>
                <td className="td">{CATEGORIES[t.category] || t.category}</td>
                <td className="td"><span className={`rounded px-1.5 py-0.5 text-xs font-semibold ${PRI[t.priority]}`}>{t.priority.toLowerCase()}</span></td>
                <td className="td">{ADMIN_STATUS_LABEL[t.status]}</td>
                <td className="td text-slate">{t.assignedTo?.name || '–'}</td>
                <td className="td whitespace-nowrap text-slate">{fmtDate(t.lastReplyAt)}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
