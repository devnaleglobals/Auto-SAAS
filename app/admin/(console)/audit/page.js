import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';

export const dynamic = 'force-dynamic';

export default async function AuditLog({ searchParams }) {
  await requireAdminPage('settings');
  const sp = await searchParams;
  const q = String(sp?.q || '').trim();
  const logs = await prisma.adminLog.findMany({
    where: q ? { OR: [{ adminEmail: { contains: q, mode: 'insensitive' } }, { action: { contains: q, mode: 'insensitive' } }, { detail: { contains: q, mode: 'insensitive' } }] } : {},
    orderBy: { createdAt: 'desc' }, take: 500,
  });
  return (
    <>
      <h1 className="font-display text-3xl font-bold">Audit log</h1>
      <p className="mt-1 text-slate">Every admin sign-in and change in the console. Kept for 2 years.</p>
      <form className="my-6 flex gap-2"><input name="q" defaultValue={q} placeholder="Admin, action or detail" className="field w-80" aria-label="Search" /><button className="btn-dark">Search</button></form>
      <ul className="card divide-y divide-line text-sm">
        {logs.length === 0 && <li className="p-6 text-center text-slate">Nothing yet.</li>}
        {logs.map((l) => <li key={l.id} className="flex flex-wrap justify-between gap-2 px-4 py-2.5"><span><strong>{l.action.replace(/_/g, ' ')}</strong> <span className="text-slate">{l.detail}</span></span><span className="text-xs text-slate">{l.adminEmail} · {fmtDate(l.createdAt)}</span></li>)}
      </ul>
    </>
  );
}
