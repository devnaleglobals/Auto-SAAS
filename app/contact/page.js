import LegalPage from '@/components/LegalPage';
import { getCompany } from '@/lib/company';
import ContactForm from '@/components/ContactForm';

export const revalidate = 60; // picks up admin changes within a minute
export const metadata = { title: 'Contact — ReplyRelay' };

export default async function Contact() {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  return (
    <LegalPage title="Contact us" updated="17 November 2026">
      <p>ReplyRelay is a product of {operatedBy()}.</p>
      <dl className="grid gap-4 sm:grid-cols-[160px_1fr]">
        <dt className="font-semibold">Business</dt><dd>{COMPANY.name}</dd>
        {COMPANY.legalName && <><dt className="font-semibold">Proprietor</dt><dd>{COMPANY.legalName}</dd></>}
        <dt className="font-semibold">Address</dt><dd>{COMPANY.address}</dd>
        {COMPANY.phone && <><dt className="font-semibold">Phone</dt><dd><a className="underline" href={`tel:${COMPANY.phone.replace(/[^\d+]/g, '')}`}>{COMPANY.phone}</a></dd></>}
        <dt className="font-semibold">Email</dt><dd><a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></dd>
        {COMPANY.gstin && <><dt className="font-semibold">GSTIN</dt><dd>{COMPANY.gstin}</dd></>}
      </dl>
      <h2>Send us a message</h2>
      <p>Existing customers can also raise a ticket from Dashboard → Support. We reply within {COMPANY.responseTime}.</p>
      <ContactForm />

      <h2>Grievance Officer</h2>
      <p>
        For complaints about the service, content or how we handle personal data (Information Technology Act, 2000 and Digital Personal Data Protection Act, 2023):<br />
        {COMPANY.grievanceName && <>{COMPANY.grievanceName}, </>}{COMPANY.name}, {COMPANY.address}<br />
        <a className="underline" href={`mailto:${COMPANY.grievanceEmail}`}>{COMPANY.grievanceEmail}</a>
      </p>
      <p>We acknowledge complaints within 24 hours and resolve them within 15 days.</p>
    </LegalPage>
  );
}
