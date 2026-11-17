import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';
import { CATEGORIES } from '@/lib/tickets';
import AdminTicketPanel from '@/components/AdminTicketPanel';

export const dynamic = 'force-dynamic';

export default async function AdminTicket({ params }) {
  await requireAdminPage('tickets');
  const { id } = await params;
  const t = await prisma.ticket.findUnique({ where: { id }, include: { messages: { orderBy: { createdAt: 'asc' } }, workspace: { select: { id: true, name: true, plan: true } } } });
  if (!t) notFound();
  const admins = await prisma.admin.findMany({ where: { active: true, role: { in: ['OWNER', 'ADMIN', 'SUPPORT'] } }, select: { id: true, name: true } });
  return (
    <>
      <Link href="/admin/tickets" className="text-sm font-semibold text-slate hover:text-ink">← Tickets</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">#{t.number} {t.subject}</h1>
      <p className="mt-1 text-sm text-slate">
        {t.name} &lt;{t.email}&gt; · {CATEGORIES[t.category] || t.category} · opened {fmtDate(t.createdAt)} from {t.source === 'website' ? 'the website' : 'the dashboard'}
        {t.workspace && <> · client <Link href={`/admin/workspaces/${t.workspace.id}`} className="font-semibold underline">{t.workspace.name}</Link></>}
      </p>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="space-y-3">
          {t.messages.map((m) => (
            <div key={m.id} className={`rounded-2xl border p-4 ${m.internal ? 'border-marigold/50 bg-marigold/10' : m.authorType === 'ADMIN' ? 'border-line bg-canvas' : m.authorType === 'SYSTEM' ? 'border-dashed border-line' : 'border-line bg-surface'}`}>
              <p className="text-xs text-slate"><strong className="text-ink">{m.authorName}</strong> · {m.authorType === 'CLIENT' ? 'client' : m.authorType === 'ADMIN' ? (m.internal ? 'internal note' : 'support') : 'system'} · {fmtDate(m.createdAt)}</p>
              <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p>
            </div>
          ))}
        </div>
        <AdminTicketPanel ticket={{ id: t.id, status: t.status, priority: t.priority, assignedToId: t.assignedToId || '' }} admins={admins} />
      </div>
    </>
  );
}
