import LegalPage from '@/components/LegalPage';
import { prisma } from '@/lib/db';
import { getCompany } from '@/lib/company';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Data deletion status — ReplyRelay', robots: { index: false } };

const LABEL = { RECEIVED: 'Received, in progress', COMPLETED: 'Completed', NOT_FOUND: 'Completed: we held no data for this account' };

export default async function DeletionStatus({ searchParams }) {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  const code = String((await searchParams)?.code || '').toUpperCase().replace(/[^A-F0-9]/g, '').slice(0, 32);
  const r = code ? await prisma.deletionRequest.findUnique({ where: { code } }) : null;
  return (
    <LegalPage title="Data deletion status" updated={new Date().toISOString().slice(0, 10)}>
      {!r ? (
        <p>We couldn’t find a request with this confirmation code. Check the link from Facebook or Instagram, or email <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a>.</p>
      ) : (
        <dl className="grid gap-3 sm:grid-cols-[180px_1fr]">
          <dt className="font-semibold">Confirmation code</dt><dd className="font-mono">{r.code}</dd>
          <dt className="font-semibold">Requested from</dt><dd>{r.platform === 'FACEBOOK' ? 'Facebook' : 'Instagram'}</dd>
          <dt className="font-semibold">Received</dt><dd>{r.createdAt.toUTCString()}</dd>
          <dt className="font-semibold">Status</dt><dd>{LABEL[r.status] || r.status}</dd>
          {r.completedAt && <><dt className="font-semibold">Completed</dt><dd>{r.completedAt.toUTCString()}</dd></>}
        </dl>
      )}
      <p>Questions? Email <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a> and include your confirmation code.</p>
    </LegalPage>
  );
}
