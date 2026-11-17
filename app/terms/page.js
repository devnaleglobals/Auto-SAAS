import LegalPage from '@/components/LegalPage';
import { getCompany } from '@/lib/company';

export const revalidate = 60; // picks up admin changes within a minute
export const metadata = { title: 'Terms of Service — ReplyRelay' };

export default async function Terms() {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  return (
    <LegalPage title="Terms of Service" updated="17 November 2026">
      <p>These terms apply to ReplyRelay, a service operated by {operatedBy()}, {COMPANY.address} (“we”). By creating an account or connecting an Instagram or Facebook account, you agree to them. You must be at least 18 and, if you use ReplyRelay for a business, authorised to accept these terms for it.</p>

      <h2>What ReplyRelay does</h2>
      <p>ReplyRelay sends replies and private messages, runs conversations, moderates comments and stores the results for Instagram professional accounts and Facebook Pages you connect, following the automations you set up.</p>

      <h2>Your responsibilities</h2>
      <ul>
        <li>You only connect accounts and Pages you own or are authorised to manage.</li>
        <li>You follow Meta’s Platform Terms, Community Standards, Instagram and Messenger policies, and applicable law, including India’s Information Technology Act and data protection rules.</li>
        <li>You don’t use ReplyRelay for spam, misleading offers, harassment, illegal products, or messages people didn’t ask for. Automations reply only to people who commented, replied, mentioned you or messaged you.</li>
        <li>You are responsible for the content of your messages, links and the offers in them, and for how you use the leads you collect.</li>
        <li>For the comments, messages and lead details of people who interact with your accounts, you are the Data Fiduciary under India’s Digital Personal Data Protection Act, 2023 and we act as your Data Processor. You tell those people how you use their details, use them only for the purpose they were shared, and handle their requests to correct or delete them. People can reply STOP to stop automatic messages, and you must not work around that.</li>
        <li>You don’t use ReplyRelay to send unsolicited commercial messages, collect sensitive data (such as health, financial account or government ID details) through conversations, target children, or promote anything illegal, deceptive or restricted by Meta’s Commerce or Advertising policies.</li>
        <li>You keep your login secure and are responsible for activity in your workspace, including by team members you invite.</li>
      </ul>

      <h2>Meta platform limits</h2>
      <p>ReplyRelay depends on Meta’s APIs. Meta may limit, delay or change features, require you to reconnect accounts, or restrict accounts that break its rules. We aren’t responsible for actions Meta takes on your accounts, and features may change when Meta changes its APIs.</p>

      <h2>Plans and payments</h2>
      <ul>
        <li>Paid plans are billed monthly in advance through Razorpay and renew automatically until cancelled.</li>
        <li>You can cancel anytime from the Billing page; your plan stays active until the end of the paid period. We don’t offer refunds for partial months unless required by law.</li>
        <li>Each plan includes the message, account and team limits shown on the pricing page. When a limit is reached, automations pause until the next month or an upgrade.</li>
        <li>Prices are in Indian rupees; applicable GST is shown on your invoice.</li>
        <li>Refunds and cancellations follow our <a className="underline" href="/refunds">Refund &amp; Cancellation Policy</a>.</li>
        <li>We may change prices with at least 30 days’ notice by email.</li>
      </ul>

      <h2>Availability</h2>
      <p>We work to keep ReplyRelay running reliably but don’t guarantee it will be uninterrupted or error-free. Messages may occasionally be delayed or not sent, for example when Meta is unavailable.</p>

      <h2>Support and safety actions</h2>
      <p>To protect you, the people who message your accounts and the Meta platform, we may pause an automation or all of a workspace’s automations if it is failing repeatedly, sends unsolicited or misleading messages, or breaks these terms or Meta’s policies. We will email the workspace owner with the reason, and you can resume it once the problem is fixed. We change or delete your automations only with the support access you grant in Settings.</p>

      <h2>Suspension and termination</h2>
      <p>We may suspend or close workspaces that break these terms or Meta’s policies, or that put the service or other customers at risk. You can delete your account and data anytime from Settings → Privacy &amp; data, or as described on our <a className="underline" href="/data-deletion">data deletion page</a>.</p>

      <h2>Your content</h2>
      <p>You own the messages, automations and data you put into ReplyRelay. You give us permission to store and process it only to provide the service to you. When you delete it, or your account, we delete it as described in our Privacy Policy.</p>

      <h2>Indemnity</h2>
      <p>You agree to cover losses and reasonable costs we face because of a claim that your content, your messages or your use of ReplyRelay broke the law, these terms or someone else’s rights.</p>

      <h2>Changes to these terms</h2>
      <p>We’ll email account owners at least 15 days before important changes take effect. If you keep using ReplyRelay after that, the new terms apply; if you don’t agree, you can cancel and delete your account.</p>

      <h2>Liability</h2>
      <p>To the extent the law allows, ReplyRelay is provided “as is”, and our total liability for any claim is limited to the amount you paid us in the three months before the claim. We aren’t liable for indirect losses such as lost profits or lost business.</p>

      <h2>Privacy</h2>
      <p>How we handle data is described in our <a className="underline" href="/privacy">Privacy Policy</a>.</p>

      <h2>Governing law</h2>
      <p>These terms are governed by the laws of India, and courts in {COMPANY.jurisdiction} have exclusive jurisdiction.</p>

      <h2>Grievances</h2>
      <p>Complaints about the service or content can be sent to our Grievance Officer{COMPANY.grievanceName ? `, ${COMPANY.grievanceName}` : ''}, at <a className="underline" href={`mailto:${COMPANY.grievanceEmail}`}>{COMPANY.grievanceEmail}</a>. We acknowledge complaints within 24 hours and resolve them within 15 days.</p>

      <h2>Contact</h2>
      <p><a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </LegalPage>
  );
}
