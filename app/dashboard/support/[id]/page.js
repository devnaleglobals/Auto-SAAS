import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { CATEGORIES, STATUS_LABEL } from '@/lib/tickets';
import { ClientTicketChat } from '@/components/TicketChat';

export const dynamic = 'force-dynamic';

export default async function SupportTicket({ params }) {
  const ctx = await requireContext();
  const { id } = await params;
  const t = await prisma.ticket.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { messages: { where: { internal: false }, orderBy: { createdAt: 'asc' } } }, // internal admin notes are never sent to the client
  });
  if (!t) notFound();
  return (
    <>
      <Link href="/dashboard/support" className="text-sm font-semibold text-slate hover:text-ink">← All tickets</Link>
      <div className="mt-4">
        <ClientTicketChat
          ticket={{ id: t.id, number: t.number, subject: t.subject, status: t.status, statusLabel: STATUS_LABEL[t.status], categoryLabel: CATEGORIES[t.category] }}
          messages={t.messages.map((m) => ({ id: m.id, authorType: m.authorType, authorName: m.authorName, body: m.body, createdAt: m.createdAt.toISOString() }))}
        />
      </div>
    </>
  );
}
