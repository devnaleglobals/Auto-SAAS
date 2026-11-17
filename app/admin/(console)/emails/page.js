import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function EmailLog({ searchParams }) {
  await requireAdminPage('emails');
  const sp = await searchParams;
  const status = ['SENT', 'FAILED', 'SKIPPED'].includes(sp?.status) ? sp.status : undefined;
  const q = String(sp?.q || '').trim();
  const where = { ...(status ? { status } : {}), ...(q ? { OR: [{ to: { contains: q, mode: 'insensitive' } }, { subject: { contains: q, mode: 'insensitive' } }] } : {}) };
  const [rows, failed24] = await Promise.all([
    prisma.emailLog.findMany({ where, orderBy: { createdAt: 'desc' }, take: 300 }),
    prisma.emailLog.count({ where: { status: 'FAILED', createdAt: { gt: new Date(Date.now() - 86400000) } } }),
  ]);
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Emails</h1>
      <p className="mt-1 text-slate">Every email the platform tried to send, with the provider’s reason when it failed. {failed24 > 0 && <strong className="text-bad">{failed24} failed in the last 24 hours.</strong>}</p>
      <form className="my-6 flex flex-wrap gap-2">
        <select name="status" defaultValue={status || ''} className="field w-40" aria-label="Status"><option value="">All</option><option value="SENT">Sent</option><option value="FAILED">Failed</option><option value="SKIPPED">Skipped</option></select>
        <input name="q" defaultValue={q} placeholder="Recipient or subject" className="field w-72" aria-label="Search" />
        <button className="btn-dark">Filter</button>
      </form>
      <div className="card overflow-x-auto">
        {rows.length === 0 ? <p className="p-8 text-center text-sm text-slate">No emails yet.</p> : (
          <table className="w-full min-w-[860px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Time</th><th className="th">To</th><th className="th">Subject</th><th className="th">Provider</th><th className="th">Status</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id} className="border-b border-line align-top last:border-0">
                <td className="td whitespace-nowrap text-slate">{fmtDate(r.createdAt)}</td>
                <td className="td break-all">{r.to}</td>
                <td className="td">{r.subject}{r.template && <span className="block text-xs text-slate">{r.template}</span>}</td>
                <td className="td">{r.provider}</td>
                <td className="td"><span className={`font-semibold ${r.status === 'SENT' ? 'text-ok' : r.status === 'FAILED' ? 'text-bad' : 'text-slate'}`}>{r.status.toLowerCase()}</span>{r.error && <span className="block max-w-xs break-words text-xs text-bad">{r.error}</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        )}
      </div>
    </>
  );
}
