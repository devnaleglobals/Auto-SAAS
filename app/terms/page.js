import LegalPage from '@/components/LegalPage';
import { COMPANY, operatedBy } from '@/lib/company';

export const metadata = { title: 'Terms of Service — ReplyRelay' };
const CONTACT = COMPANY.email;

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="13 October 2026">
      <p>These terms apply to ReplyRelay, a service operated by {operatedBy()}, {COMPANY.address} (“we”). By creating an account or connecting an Instagram or Facebook account, you agree to them.</p>

      <h2>What ReplyRelay does</h2>
      <p>ReplyRelay sends replies and private messages, runs conversations, moderates comments and stores the results for Instagram professional accounts and Facebook Pages you connect, following the automations you set up.</p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You only connect accounts and Pages you own or are authorised to manage.</li>
        <li>You follow Meta’s Platform Terms, Community Standards, Instagram and Messenger policies, and applicable law, including India’s Information Technology Act and data protection rules.</li>
        <li>You don’t use ReplyRelay for spam, misleading offers, harassment, illegal products, or messages people didn’t ask for. Automations reply only to people who commented, replied, mentioned you or messaged you.</li>
        <li>You are responsible for the content of your messages, links and the offers in them, and for how you use the leads you collect.</li>
        <li>You keep your login secure and are responsible for activity in your workspace, including by team members you invite.</li>
      </ul>

      <h2>Meta platform limits</h2>
      <p>ReplyRelay depends on Meta’s APIs. Meta may limit, delay or change features, require you to reconnect accounts, or restrict accounts that break its rules. We aren’t responsible for actions Meta takes on your accounts, and features may change when Meta changes its APIs.</p>

      <h2>Plans and payments</h2>
      <ul>
        <li>Paid plans are billed monthly in advance through Razorpay and renew automatically until cancelled.</li>
        <li>You can cancel anytime from the Billing page; your plan stays active until the end of the paid period. We don’t offer refunds for partial months unless required by law.</li>
        <li>Each plan includes the message, account and team limits shown on the pricing page. When a limit is reached, automations pause until the next month or an upgrade.</li>
        <li>We may change prices with at least 30 days’ notice by email.</li>
      </ul>

      <h2>Availability</h2>
      <p>We work to keep ReplyRelay running reliably but don’t guarantee it will be uninterrupted or error-free. Messages may occasionally be delayed or not sent, for example when Meta is unavailable.</p>

      <h2>Suspension and termination</h2>
      <p>We may suspend or close workspaces that break these terms or Meta’s policies, or that put the service or other customers at risk. You can delete your account and data anytime as described on our <a className="underline" href="/data-deletion">data deletion page</a>.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, ReplyRelay is provided “as is”, and our total liability for any claim is limited to the amount you paid us in the three months before the claim. We aren’t liable for indirect losses such as lost profits or lost business.</p>

      <h2>Privacy</h2>
      <p>How we handle data is described in our <a className="underline" href="/privacy">Privacy Policy</a>.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and courts in Pune, Maharashtra have jurisdiction.</p>

      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </LegalPage>
  );
}
