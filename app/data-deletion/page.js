import LegalPage from '@/components/LegalPage';
import { COMPANY } from '@/lib/company';

export const metadata = { title: 'Data Deletion — ReplyRelay' };
const CONTACT = COMPANY.email;

export default function DataDeletion() {
  return (
    <LegalPage title="Delete your data" updated="14 November 2026">
      <p>You can stop ReplyRelay’s access to your Instagram account or Facebook Pages and have your data deleted at any time.</p>

      <h2>Delete everything yourself, instantly</h2>
      <ul>
        <li>Sign in to ReplyRelay and open <strong>Settings → Privacy &amp; data</strong>.</li>
        <li>Select <strong>Delete my account</strong>. Your account, every workspace you own, connected Instagram accounts and Facebook Pages, access tokens, automations, comment and message logs and leads are deleted immediately, and any paid plan is cancelled.</li>
      </ul>

      <h2>Remove one account or Page</h2>
      <p>On the <strong>Accounts</strong> page, select Disconnect. We stop receiving its comments and messages and delete its access token, automations, logs and leads.</p>

      <h2>Remove ReplyRelay from Instagram</h2>
      <ul>
        <li>In Instagram, go to Settings, then Apps and websites (or Website permissions).</li>
        <li>Find our app in the Active tab and select Remove. Instagram then lets you request deletion of your data, and we delete the account’s data automatically.</li>
      </ul>

      <h2>Remove ReplyRelay from Facebook</h2>
      <ul>
        <li>In Facebook, go to Settings and privacy, then Settings, then Business integrations (or Apps and websites).</li>
        <li>Find our app and select Remove. If you also choose to delete your data, Facebook sends us the request and we delete the Pages you connected (and your ReplyRelay account if you only sign in with Facebook). You get a confirmation code and a link to check the status.</li>
      </ul>
      <p>ReplyRelay can no longer read your comments or send messages from the moment access is removed.</p>

      <h2>Ask us by email</h2>
      <p>Email <a className="underline" href={`mailto:${CONTACT}?subject=Delete%20my%20ReplyRelay%20data`}>{CONTACT}</a> with the subject “Delete my ReplyRelay data” from the email address you signed up with, and include your Instagram username or Facebook Page name. We delete your data within 7 days and confirm by email.</p>

      <h2>If you commented on or messaged a business that uses ReplyRelay</h2>
      <p>Reply <strong>STOP</strong> in the conversation to stop automatic messages. To have your comments, messages or the details you shared deleted, ask that business, or email us with the account name and we’ll pass it on and help them remove it.</p>

      <h2>What we keep</h2>
      <p>Invoices and payment records stay in our Razorpay account for as long as Indian tax law requires. Backups roll over and no longer contain deleted data after about 30 days.</p>
    </LegalPage>
  );
}
