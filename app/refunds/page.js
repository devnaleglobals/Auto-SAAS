import LegalPage from '@/components/LegalPage';
import { getCompany } from '@/lib/company';

export const revalidate = 60; // picks up admin changes within a minute
export const metadata = { title: 'Refund & Cancellation Policy — ReplyRelay' };

export default async function Refunds() {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="14 November 2026">
      <p>This policy applies to paid ReplyRelay plans sold by {operatedBy()}, {COMPANY.address}. Payments are processed by Razorpay.</p>

      <h2>Free plan</h2>
      <p>The Free plan costs nothing and needs no card, so you can try ReplyRelay fully before paying.</p>

      <h2>Cancelling</h2>
      <ul>
        <li>You can cancel a paid plan anytime from Billing in your dashboard. No email or call is needed.</li>
        <li>After you cancel, you are not charged again. Your plan stays active until the end of the period you already paid for, then your workspace moves to the Free plan. Your automations and data are kept.</li>
        <li>If you delete your account or workspace, the subscription is cancelled immediately.</li>
      </ul>

      <h2>Refunds</h2>
      <ul>
        <li><strong>Charged by mistake or charged twice:</strong> we refund the full amount.</li>
        <li><strong>Service not working:</strong> if ReplyRelay could not work for your account for reasons on our side and we can’t fix it, we refund the current month.</li>
        <li><strong>First payment:</strong> if you ask within 7 days of your first payment for a plan, we refund it in full.</li>
        <li>Otherwise, we don’t refund partial months after a renewal, because you can cancel anytime before the next renewal.</li>
        <li>Limits or actions taken by Meta on your Instagram or Facebook account (for example a restricted account) are outside our control and aren’t grounds for a refund on their own, but write to us and we’ll look at each case fairly.</li>
      </ul>

      <h2>How to ask for a refund</h2>
      <p>Email <a className="underline" href={`mailto:${COMPANY.email}?subject=Refund%20request`}>{COMPANY.email}</a> from your account email with your workspace name and the payment date. We reply within 2 working days. Approved refunds are sent back to the original payment method through Razorpay and usually reach you in 5–7 working days, depending on your bank.</p>

      <h2>Contact</h2>
      <p>{COMPANY.name}, {COMPANY.address}{COMPANY.phone && `, ${COMPANY.phone}`}, <a className="underline" href={`mailto:${COMPANY.email}`}>{COMPANY.email}</a></p>
    </LegalPage>
  );
}
