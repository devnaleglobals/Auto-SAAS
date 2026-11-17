import LegalPage from '@/components/LegalPage';
import { getCompany } from '@/lib/company';

export const revalidate = 60; // picks up admin changes within a minute
export const metadata = { title: 'Service Delivery Policy — ReplyRelay' };

export default async function Delivery() {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  return (
    <LegalPage title="Service Delivery Policy" updated="14 November 2026">
      <p>ReplyRelay is online software (SaaS) provided by {operatedBy()}. Nothing is shipped physically.</p>

      <h2>How the service is delivered</h2>
      <ul>
        <li>Your account is ready as soon as you sign up, on the Free plan.</li>
        <li>When you buy a paid plan, it is activated on your workspace immediately after Razorpay confirms the payment, usually within a minute. You’ll see the new plan on the Billing page and receive an invoice by email from Razorpay.</li>
        <li>If a successful payment isn’t reflected within 30 minutes, email us and we’ll activate it manually.</li>
        <li>The service is delivered online at {`${process.env.APP_URL || 'our website'}`.replace(/^https?:\/\//, '')} and works in any modern web browser. No download is needed.</li>
      </ul>

      <h2>Contact</h2>
      <p>{COMPANY.name}, {COMPANY.address}{COMPANY.phone && `, ${COMPANY.phone}`}, <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
    </LegalPage>
  );
}
