import { prisma } from '@/lib/db';
import { getContext } from '@/lib/context';
import { PageHeader, Empty, fmtDate, fmtNum } from '@/components/ui';
import PlatformIcon from '@/components/PlatformIcon';

export const dynamic = 'force-dynamic';

export default async function Leads({ searchParams }) {
  const ctx = await getContext();
  const sp = await searchParams;
  const q = sp?.q?.trim();
  const where = {
    workspaceId: ctx.workspace.id,
    ...(q ? { OR: ['name', 'phone', 'email', 'username', 'source'].map((f) => ({ [f]: { contains: q, mode: 'insensitive' } })) } : {}),
  };
  const [leads, total] = await Promise.all([
    prisma.lead.findMany({ where, orderBy: { updatedAt: 'desc' }, take: 300, include: { channel: { select: { platform: true, username: true } } } }),
    prisma.lead.count({ where: { workspaceId: ctx.workspace.id } }),
  ]);
  const questions = [...new Set(leads.flatMap((l) => Object.keys(l.answers || {})))].slice(0, 4);

  return (
    <>
      <PageHeader title="Leads" description="Names, numbers, emails and answers people shared in your conversations."
        actions={total > 0 && <a href="/api/leads/export" className="btn-dark">Download CSV</a>} />
      {total === 0 ? (
        <Empty title="No leads yet">Add an “Ask name”, “Ask phone”, “Ask email” or “Ask a question” message to any conversation. Answers appear here.</Empty>
      ) : (
        <>
          <form className="mb-4 flex flex-wrap gap-2">
            <input name="q" defaultValue={q} placeholder="Search name, phone, email…" className="field w-72" aria-label="Search leads" />
            <button className="btn-ghost">Search</button>
            <span className="self-center text-sm text-slate">{fmtNum(total)} total</span>
          </form>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="border-b border-line"><tr>
                <th className="th">Person</th><th className="th">Name</th><th className="th">Phone</th><th className="th">Email</th>
                {questions.map((x) => <th key={x} className="th">{x}</th>)}
                <th className="th">From</th><th className="th">Updated</th>
              </tr></thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-b border-line last:border-0">
                    <td className="td"><span className="flex items-center gap-1.5 font-semibold"><PlatformIcon platform={l.channel.platform} className="h-3.5 w-3.5" />{l.username ? (l.channel.platform === 'INSTAGRAM' ? `@${l.username}` : l.username) : <span className="font-normal text-slate">Unknown</span>}</span></td>
                    <td className="td">{l.name || <span className="text-slate">–</span>}</td>
                    <td className="td whitespace-nowrap">{l.phone ? <a className="hover:underline" href={`tel:${l.phone.replace(/[^\d+]/g, '')}`}>{l.phone}</a> : <span className="text-slate">–</span>}</td>
                    <td className="td">{l.email ? <a className="hover:underline" href={`mailto:${l.email}`}>{l.email}</a> : <span className="text-slate">–</span>}</td>
                    {questions.map((x) => <td key={x} className="td">{l.answers?.[x] || <span className="text-slate">–</span>}</td>)}
                    <td className="td text-slate">{l.source}</td>
                    <td className="td whitespace-nowrap text-slate">{fmtDate(l.updatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </>
  );
}
