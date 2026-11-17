import Link from 'next/link';
import { prisma } from '@/lib/db';
import { requireContext } from '@/lib/context';
import { PageHeader, fmtDate } from '@/components/ui';
import { CATEGORIES, STATUS_LABEL } from '@/lib/tickets';
import { getCompany } from '@/lib/company';
import { NewTicketForm } from '@/components/SupportForms';

export const dynamic = 'force-dynamic';

export default async function Support({ searchParams }) {
  const ctx = await requireContext();
  const sp = await searchParams;
  const [tickets, company] = await Promise.all([
    prisma.ticket.findMany({ where: { workspaceId: ctx.workspace.id }, orderBy: { lastReplyAt: 'desc' }, take: 100 }),
    getCompany(),
  ]);
  return (
    <>
      <PageHeader title="Support" description={`Ask a question or report a problem. We usually reply within ${company.responseTime}, by email and here.`} />
      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Your tickets</h2>
          {tickets.length === 0 ? <p className="card border-dashed p-8 text-center text-sm text-slate">No tickets yet. Use the form to contact support.</p> : (
            <ul className="card divide-y divide-line">
              {tickets.map((t) => (
                <li key={t.id}><Link href={`/dashboard/support/${t.id}`} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4 hover:bg-canvas">
                  <span className="min-w-0"><span className="block font-semibold">#{t.number} {t.subject}</span><span className="text-xs text-slate">{CATEGORIES[t.category]} · updated {fmtDate(t.lastReplyAt)}</span></span>
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${t.status === 'PENDING' ? 'bg-marigold/25 text-ink' : t.status === 'OPEN' ? 'bg-sky/10 text-ink' : 'bg-canvas text-slate'}`}>{STATUS_LABEL[t.status]}</span>
                </Link></li>
              ))}
            </ul>
          )}
        </section>
        <NewTicketForm categories={CATEGORIES} autoFocus={sp?.new === '1'} hasEmail={Boolean(ctx.user.email)} />
      </div>
    </>
  );
}
