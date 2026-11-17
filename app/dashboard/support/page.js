import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, fmtDate } from '@/components/ui';
import { CATEGORIES, STATUS_LABEL } from '@/lib/tickets';
import { getCompany } from '@/lib/company';
import { NewTicketButton } from '@/components/TicketChat';

export const dynamic = 'force-dynamic';

const BADGE = { OPEN: 'bg-sky/10 text-ink', PENDING: 'bg-marigold/25 text-ink', RESOLVED: 'bg-ok/10 text-ok', CLOSED: 'bg-canvas text-slate' };

export default async function Support({ searchParams }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const [tickets, company] = await Promise.all([
    prisma.ticket.findMany({
      where: { workspaceId: ctx.workspace.id }, orderBy: { lastReplyAt: 'desc' }, take: 100,
      include: { messages: { where: { internal: false }, orderBy: { createdAt: 'desc' }, take: 1 } },
    }),
    getCompany(),
  ]);
  const newButton = <NewTicketButton categories={CATEGORIES} hasEmail={Boolean(ctx.user.email)} startOpen={sp?.new === '1'} />;
  return (
    <>
      <PageHeader title="Support" description={`Ask a question or report a problem. We usually reply within ${company.responseTime}, here and by email.`} actions={newButton} />
      {tickets.length === 0 ? (
        <div className="card border-dashed p-10 text-center">
          <p className="font-semibold">No tickets yet</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate">Stuck with an automation, a connection or billing? Create a ticket and our team will help.</p>
          <div className="mt-5">{newButton}</div>
        </div>
      ) : (
        <ul className="card divide-y divide-line">
          {tickets.map((t) => {
            const last = t.messages[0];
            const waiting = t.status === 'PENDING';
            return (
              <li key={t.id}><Link href={`/dashboard/support/${t.id}`} className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-canvas">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${waiting ? 'bg-marigold' : t.status === 'OPEN' ? 'bg-sky' : 'bg-line'}`} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">#{t.number} {t.subject}</span>
                  <span className="block truncate text-sm text-slate">{last ? `${last.authorType === 'ADMIN' ? 'Support' : 'You'}: ${last.body}` : CATEGORIES[t.category]}</span>
                </span>
                <span className="hidden shrink-0 text-right text-xs text-slate sm:block">{fmtDate(t.lastReplyAt)}</span>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ${BADGE[t.status]}`}>{waiting ? 'New reply' : STATUS_LABEL[t.status]}</span>
              </Link></li>
            );
          })}
        </ul>
      )}
    </>
  );
}
