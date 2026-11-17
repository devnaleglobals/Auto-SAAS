import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireAdminPage } from '@/lib/admin';
import { fmtDate } from '@/components/ui';
import { CATEGORIES } from '@/lib/tickets';
import { PLANS, effectivePlan } from '@/lib/plans';
import { AdminTicketChat } from '@/components/TicketChat';
import AdminTicketPanel from '@/components/AdminTicketPanel';

export const dynamic = 'force-dynamic';

export default async function AdminTicket({ params }) {
  await requireAdminPage('tickets');
  const { id } = await params;
  const t = await prisma.ticket.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: 'asc' } }, workspace: true },
  });
  if (!t) notFound();
  const [admins, others] = await Promise.all([
    prisma.admin.findMany({ where: { active: true, role: { in: ['OWNER', 'ADMIN', 'SUPPORT'] } }, select: { id: true, name: true } }),
    prisma.ticket.findMany({ where: { id: { not: t.id }, OR: [{ email: t.email }, ...(t.workspaceId ? [{ workspaceId: t.workspaceId }] : [])] }, orderBy: { lastReplyAt: 'desc' }, take: 5, select: { id: true, number: true, subject: true, status: true } }),
  ]);
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <Link href="/admin/tickets" className="text-sm font-semibold text-slate hover:text-ink">← Tickets</Link>
          <h1 className="mt-2 truncate font-display text-2xl font-bold">#{t.number} {t.subject}</h1>
          <p className="mt-0.5 text-sm text-slate">{CATEGORIES[t.category] || t.category} · opened {fmtDate(t.createdAt)} from {t.source === 'website' ? 'the website' : 'the dashboard'}</p>
        </div>
      </div>
      <div className="mt-5 grid gap-6 lg:grid-cols-[1fr_300px]">
        <AdminTicketChat
          ticket={{ id: t.id, name: t.name, email: t.email }}
          messages={t.messages.map((m) => ({ id: m.id, authorType: m.authorType, authorName: m.authorName, body: m.body, internal: m.internal, createdAt: m.createdAt.toISOString() }))}
        />
        <AdminTicketPanel
          ticket={{ id: t.id, status: t.status, priority: t.priority, assignedToId: t.assignedToId || '' }}
          admins={admins}
          client={{ name: t.name, email: t.email, source: t.source, workspace: t.workspace ? { id: t.workspace.id, name: t.workspace.name, plan: PLANS[effectivePlan(t.workspace)].name, suspended: t.workspace.suspended } : null }}
          others={others}
        />
      </div>
    </>
  );
}
