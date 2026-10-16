import LegalPage from '@/components/LegalPage';
import { COMPANY, operatedBy } from '@/lib/company';

export const metadata = { title: 'Contact — ReplyRelay' };

export default function Contact() {
  return (
    <LegalPage title="Contact us" updated="13 October 2026">
      <p>ReplyRelay is a product of {operatedBy()}.</p>
      <dl className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <dt className="font-semibold">Business</dt><dd>{COMPANY.name}</dd>
        {COMPANY.legalName && <><dt className="font-semibold">Proprietor</dt><dd>{COMPANY.legalName}</dd></>}
        <dt className="font-semibold">Address</dt><dd>{COMPANY.address}</dd>
        {COMPANY.phone && <><dt className="font-semibold">Phone</dt><dd><a className="underline" href={`tel:${COMPANY.phone.replace(/[^\d+]/g, '')}`}>{COMPANY.phone}</a></dd></>}
        <dt className="font-semibold">Email</dt><dd><a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></dd>
        {COMPANY.gstin && <><dt className="font-semibold">GSTIN</dt><dd>{COMPANY.gstin}</dd></>}
      </dl>
      <p>We reply to support emails within one working day.</p>
    </LegalPage>
  );
}
