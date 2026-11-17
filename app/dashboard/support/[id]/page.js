import Link from 'next/link';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { fmtDate } from '@/components/ui';
import { CATEGORIES, STATUS_LABEL } from '@/lib/tickets';
import { TicketReply } from '@/components/SupportForms';

export const dynamic = 'force-dynamic';

export default async function SupportTicket({ params }) {
  const ctx = await requireContext();
  const { id } = await params;
  const t = await prisma.ticket.findFirst({
    where: { id, workspaceId: ctx.workspace.id },
    include: { messages: { where: { internal: false }, orderBy: { createdAt: 'asc' } } }, // internal admin notes are never shown
  });
  if (!t) notFound();
  return (
    <>
      <Link href="/dashboard/support" className="text-sm font-semibold text-slate hover:text-ink">← Support</Link>
      <h1 className="mt-3 font-display text-2xl font-bold">#{t.number} {t.subject}</h1>
      <p className="mt-1 text-sm text-slate">{CATEGORIES[t.category]} · {STATUS_LABEL[t.status]} · opened {fmtDate(t.createdAt)}</p>
      <div className="mt-6 max-w-3xl space-y-3">
        {t.messages.map((m) => (
          <div key={m.id} className={`rounded-2xl border p-4 ${m.authorType === 'ADMIN' ? 'border-sky/30 bg-sky/5' : m.authorType === 'SYSTEM' ? 'border-dashed border-line text-slate' : 'border-line bg-surface'}`}>
            <p className="text-xs text-slate"><strong className="text-ink">{m.authorType === 'ADMIN' ? `${m.authorName} (Support)` : m.authorName}</strong> · {fmtDate(m.createdAt)}</p>
            <p className="mt-2 whitespace-pre-wrap break-words text-sm">{m.body}</p>
          </div>
        ))}
        <TicketReply id={t.id} closed={['CLOSED', 'RESOLVED'].includes(t.status)} />
      </div>
    </>
  );
}
