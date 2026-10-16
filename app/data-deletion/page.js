import LegalPage from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Data Deletion — ReplyRelay' };
const CONTACT = COMPANY.email;

export default function DataDeletion() {
  return (
    <LegalPage title="Delete your data" updated="12 October 2026">
      <p>You can stop ReplyRelay's access to your Instagram account and have your data deleted at any time.</p>

      <h2>Stop access from Instagram</h2>
      <ul>
        <li>Open Instagram and go to Settings, then Apps and websites.</li>
        <li>Find our app in the Active tab and select Remove.</li>
      </ul>

      <h2>Stop access from Facebook</h2>
      <ul>
        <li>Open Facebook and go to Settings and privacy, then Settings, then Business integrations (or Apps and websites).</li>
        <li>Find our app and select Remove.</li>
      </ul>
      <p>ReplyRelay can no longer read your comments or send messages from that moment.</p>

      <h2>Delete everything we stored</h2>
      <p>Email <a className="underline" href={`mailto:${CONTACT}?subject=Delete%20my%20ReplyRelay%20data`}>{CONTACT}</a> with the subject “Delete my ReplyRelay data” from the email address you signed up with, and include your Instagram username or Facebook Page name. Within 7 days we delete your ReplyRelay account, connected Instagram accounts, Facebook Pages and access tokens, automations, and all comment and message logs, and we confirm by email.</p>

      <h2>Delete a single automation</h2>
      <p>In your dashboard, open the automation and select Delete. Its settings and its full comment log are removed immediately.</p>
    </LegalPage>
  );
}
