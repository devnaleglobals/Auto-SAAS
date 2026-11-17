import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { typeInfo } from '@/lib/automationTypes';
import { fmtNum, fmtDate } from '@/components/ui';
import PlatformIcon from '@/components/PlatformIcon';
import StatusBadge from '@/components/StatusBadge';

export const dynamic = 'force-dynamic';

// Every automation on the platform. Shows settings and delivery health only, never the people who commented.
export default async function AdminAutomations({ searchParams }) {
  await requireAdminPage('automations');
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const status = ['ACTIVE', 'PAUSED', 'COMPLETED'].includes(sp?.status) ? sp.status : undefined;
  const failing = sp?.health === 'failing';
  const since = new Date(Date.now() - 7 * 86400000);
  const where = {
    ...(status ? { status } : {}),
    ...(q ? { OR: [{ name: { contains: q, mode: 'insensitive' } }, { workspace: { name: { contains: q, mode: 'insensitive' } } }, { channel: { username: { contains: q, mode: 'insensitive' } } }] } : {}),
    ...(failing ? { events: { some: { createdAt: { gte: since }, OR: [{ dmStatus: 'FAILED' }, { replyStatus: 'FAILED' }] } } } : {}),
  };
  const rows = await prisma.automation.findMany({
    where, orderBy: { updatedAt: 'desc' }, take: 200,
    include: { workspace: { select: { id: true, name: true } }, channel: { select: { platform: true, username: true, needsReconnect: true } } },
  });
  const ids = rows.map((r) => r.id);
  const [sent, failed] = ids.length ? await Promise.all([
    prisma.event.groupBy({ by: ['automationId'], where: { automationId: { in: ids }, createdAt: { gte: since }, dmStatus: 'SENT' }, _count: true }),
    prisma.event.groupBy({ by: ['automationId'], where: { automationId: { in: ids }, createdAt: { gte: since }, OR: [{ dmStatus: 'FAILED' }, { replyStatus: 'FAILED' }] }, _count: true }),
  ]) : [[], []];
  const S = Object.fromEntries(sent.map((x) => [x.automationId, x._count]));
  const F = Object.fromEntries(failed.map((x) => [x.automationId, x._count]));

  return (
    <>
      <h1 className="font-display text-3xl font-bold">Automations</h1>
      <p className="mt-1 max-w-3xl text-slate">Every client automation. You can view settings and delivery health, and pause or resume with a reason (the client is told). Editing needs the client’s support access.</p>
      <form className="my-6 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Search automation, client or account" className="field w-80" aria-label="Search automations" />
        <select name="status" defaultValue={status || ''} className="field w-40" aria-label="Status">
          <option value="">Any status</option><option value="ACTIVE">Running</option><option value="PAUSED">Paused</option><option value="COMPLETED">Finished</option>
        </select>
        <select name="health" defaultValue={failing ? 'failing' : ''} className="field w-52" aria-label="Health">
          <option value="">Any health</option><option value="failing">With failures (7 days)</option>
        </select>
        <button className="btn-dark">Apply</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="w-full min-w-[980px] text-sm">
          <thead className="border-b border-line"><tr>
            <th className="th">Automation</th><th className="th">Client</th><th className="th">Type</th><th className="th">Sent (7 days)</th><th className="th">Failed (7 days)</th><th className="th">Last change</th><th className="th">Status</th>
          </tr></thead>
          <tbody>
            {rows.map((a) => (
              <tr key={a.id} className="border-b border-line last:border-0 hover:bg-canvas">
                <td className="td">
                  <Link href={`/admin/automations/${a.id}`} className="font-semibold hover:underline">{a.name}</Link>
                  <span className="mt-0.5 flex items-center gap-1 text-xs text-slate"><PlatformIcon platform={a.channel.platform} className="h-3 w-3" />{a.channel.username}{a.channel.needsReconnect && <span className="font-semibold text-bad"> · needs reconnecting</span>}</span>
                </td>
                <td className="td"><Link href={`/admin/workspaces/${a.workspace.id}`} className="hover:underline">{a.workspace.name}</Link></td>
                <td className="td">{typeInfo(a.type, a.channel.platform)?.title}</td>
                <td className="td tabular-nums">{fmtNum(S[a.id])}</td>
                <td className="td tabular-nums">{F[a.id] ? <span className="font-semibold text-bad">{fmtNum(F[a.id])}</span> : '0'}</td>
                <td className="td whitespace-nowrap text-slate">{fmtDate(a.updatedAt)}</td>
                <td className="td"><StatusBadge s={a.status} /></td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="td py-10 text-center text-slate">No automations match these filters.</td></tr>}
          </tbody>
        </table>
      </div>
    </>
  );
}
