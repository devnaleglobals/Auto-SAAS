import LegalPage from '@/components/LegalPage';
import { getCompany } from '@/lib/company';
import { RETENTION } from '@/lib/retentionPolicy';

export const revalidate = 60; // picks up admin changes within a minute
export const metadata = { title: 'Privacy Policy — ReplyRelay' };

export default async function Privacy() {
  const COMPANY = await getCompany();
  const operatedBy = () => COMPANY.operatedBy;
  const CONTACT = COMPANY.email;
  return (
    <LegalPage title="Privacy Policy" updated="17 November 2026">
      <p>ReplyRelay is operated by {operatedBy()}, {COMPANY.address} (“we”, “us”). ReplyRelay lets Instagram Business and Creator accounts and Facebook Pages reply to comments, send private messages, run automated conversations and moderate comments. This policy explains what personal data we handle, why, how long we keep it and the rights you have. It is written to meet India’s Digital Personal Data Protection Act, 2023 (DPDP Act), the Information Technology Act, 2000 and its rules, and Meta’s Platform Terms.</p>

      <h2>Who is responsible for what</h2>
      <ul>
        <li><strong>Your ReplyRelay account and billing details:</strong> we decide how this data is used, so we are the <em>Data Fiduciary</em>.</li>
        <li><strong>Data about the people who comment on or message your accounts</strong> (comments, messages, details they share in conversations): you, the business using ReplyRelay, decide what to collect and why. You are the Data Fiduciary for it and we process it only on your instructions, as your <em>Data Processor</em>. You are responsible for having a lawful basis and for telling those people how you use their details.</li>
      </ul>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Account:</strong> your name and email address with a securely hashed password, or the ID of the Instagram or Facebook account you sign in with; when you accepted these terms; when you last signed in.</li>
        <li><strong>Connected accounts:</strong> for Instagram, the account ID, username, name, profile picture and follower count; for Facebook, the ID, name, picture and follower count of the Pages you choose; and the access token Meta issues, stored encrypted.</li>
        <li><strong>Posts:</strong> post IDs, captions, thumbnails and links, so you can choose where an automation runs.</li>
        <li><strong>Comments and messages:</strong> for posts and conversations your automations handle, the comment or message ID and text, and the sender’s platform ID and username or name; what we sent in reply; and whether a link was opened (a count, not who opened it).</li>
        <li><strong>Leads:</strong> details people choose to type into your conversations, such as a name, phone number, email or answers to your questions.</li>
        <li><strong>Automations and team:</strong> the messages, keywords, links and settings you create, your team members and their roles, and a log of changes made in your workspace.</li>
        <li><strong>Billing:</strong> your plan, business name, billing email, phone, GSTIN and address, and the status of your payments. Card, UPI and bank details are entered on Razorpay’s checkout and never reach our servers.</li>
        <li><strong>Support requests:</strong> the name, email, subject and messages you send through Support or our contact form, and our replies.</li>
        <li><strong>Email records:</strong> the recipient, subject and delivery status of emails we send you, to fix delivery problems.</li>
        <li><strong>Technical:</strong> your IP address is used briefly to limit repeated sign-in attempts. Our hosting provider keeps standard server logs for a short time.</li>
      </ul>

      <h2>How we use it</h2>
      <ul>
        <li>To run the automations you create: read new comments and messages on the accounts you connect, send the replies and messages you wrote, and show you logs and analytics.</li>
        <li>To create your account, sign you in, keep it secure and prevent abuse.</li>
        <li>To bill you, issue GST invoices and meet tax and accounting obligations.</li>
        <li>To send service emails: password resets, team invites, connection problems and payment notices. You can turn off the optional ones in Settings.</li>
      </ul>
      <p>We do not sell personal data, use it for advertising, build profiles of the people who message you, or use data from Meta’s platforms for any purpose other than providing ReplyRelay to you. We do not use it to train AI models.</p>

      <h2>Meta platform data</h2>
      <p>We access Instagram and Facebook only through Meta’s official APIs and only with the permissions you grant. We follow Meta’s Platform Terms and Developer Policies: data we receive from Meta is used only to provide the features you turned on, is not shared with data brokers or advertisers, and is deleted when you disconnect an account, when Meta tells us you removed our app, or when you ask us to delete it.</p>
      <p><strong>Instagram permissions:</strong> <em>instagram_business_basic</em> to show your profile and posts, <em>instagram_business_manage_comments</em> to read, reply to, hide and delete comments, and <em>instagram_business_manage_messages</em> to send private replies and conversation messages.</p>
      <p><strong>Facebook permissions:</strong> <em>public_profile</em> to sign you in, <em>pages_show_list</em> to list your Pages, <em>pages_read_engagement</em> and <em>pages_read_user_content</em> to read posts and comments, <em>pages_manage_engagement</em> to reply to, hide and delete comments, <em>pages_manage_metadata</em> to receive comment and message notifications, and <em>pages_messaging</em> to send private replies and Messenger conversations.</p>

      <h2>People who message your accounts</h2>
      <p>ReplyRelay only sends a private message after someone comments, replies to a story, mentions the account or messages it, and only within the time windows Meta allows. Anyone can reply <strong>STOP</strong> to stop automatic messages from that account, and <strong>START</strong> to turn them back on. People who want their data removed can contact the business they interacted with, or email us at <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a>.</p>

      <h2>Who we share data with</h2>
      <p>Only with service providers that help us run ReplyRelay, under contracts that require them to protect it:</p>
      <ul>
        <li><strong>Meta Platforms</strong> (Instagram and Facebook), to read comments and send the messages you set up.</li>
        <li><strong>Vercel Inc.</strong> (application hosting) and <strong>Neon Inc.</strong> (database), which may store data on servers outside India.</li>
        <li><strong>Razorpay Software Pvt. Ltd.</strong> (payments and invoices, India).</li>
        <li>Our <strong>email delivery provider</strong> (such as Resend, SendGrid, Zoho ZeptoMail or our mail server), to send account, alert and support emails.</li>
      </ul>
      <p>We may also disclose data when Indian law requires it, for example to comply with a lawful order. Transfers outside India are made only to countries not restricted by the Government of India under the DPDP Act.</p>

      <h2>How long we keep it</h2>
      <ul>
        <li>Account, connected accounts and automations: while your account is active. Deleting them in the app removes them immediately.</li>
        <li>Comment and message logs and conversation history: {RETENTION.activityDays} days, then deleted automatically.</li>
        <li>Leads: until you delete them, or {RETENTION.leadDays} days after they were last updated.</li>
        <li>Workspace change log: {RETENTION.auditDays} days.</li>
        <li>Support tickets: until {RETENTION.auditDays} days after they are closed. Email delivery records: 180 days.</li>
        <li>Message IDs kept only to avoid sending the same reply twice: {RETENTION.dedupeDays} days.</li>
        <li>Invoices and payment records: in our Razorpay account for as long as Indian tax law requires.</li>
        <li>Database backups roll over and no longer contain deleted data after about 30 days.</li>
      </ul>

      <h2>Your rights</h2>
      <p>Under the DPDP Act you can:</p>
      <ul>
        <li><strong>Access</strong> your data: Settings → Privacy &amp; data → Download your data.</li>
        <li><strong>Correct or update</strong> it: edit your profile, billing details and automations in the app, or email us.</li>
        <li><strong>Erase</strong> it: Settings → Privacy &amp; data → Delete my account, or follow our <a className="underline" href="/data-deletion">data deletion instructions</a>.</li>
        <li><strong>Withdraw consent</strong> at any time by disconnecting your accounts or deleting your account. This doesn’t affect anything done before you withdrew it.</li>
        <li><strong>Nominate</strong> someone to exercise these rights if you die or become unable to, by emailing us.</li>
        <li><strong>Raise a grievance</strong> with our Grievance Officer (below). If you aren’t satisfied with our answer, you can complain to the Data Protection Board of India.</li>
      </ul>
      <p>We answer requests within 30 days, usually much sooner.</p>

      <h2>Cookies</h2>
      <p>We use only cookies needed for the service to work: one to keep you signed in, one to remember your current workspace, and two short-lived ones that protect the Instagram and Facebook sign-in. Your light or dark theme choice is saved in your browser. We don’t use advertising or tracking cookies, and no third-party analytics.</p>

      <h2>Security</h2>
      <p>All traffic uses HTTPS. Meta access tokens are encrypted with AES-256-GCM, and passwords are hashed with bcrypt. Notifications from Meta and Razorpay are verified with a cryptographic signature before they are processed. Sign-in attempts are rate-limited, team access uses roles, and changes in each workspace are logged. If a personal data breach happens, we will inform affected people and the Data Protection Board of India as the law requires.</p>

      <h2>Children</h2>
      <p>ReplyRelay is a business tool for people aged 18 and over. We don’t knowingly collect data from children. If you believe a child has created an account, email us and we will delete it.</p>

      <h2>Changes</h2>
      <p>If we make important changes to this policy, we’ll email account owners and show a notice in the app before they take effect.</p>

      <h2>Grievance Officer and contact</h2>
      <p>
        {COMPANY.grievanceName && <>Grievance Officer: {COMPANY.grievanceName}<br /></>}
        {COMPANY.name}, {COMPANY.address}<br />
        Email: <a className="underline" href={`mailto:${COMPANY.grievanceEmail}`}>{COMPANY.grievanceEmail}</a>
        {COMPANY.phone && <><br />Phone: {COMPANY.phone}</>}
      </p>
    </LegalPage>
  );
}
