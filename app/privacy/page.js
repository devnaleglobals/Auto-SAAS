import LegalPage from '@/components/LegalPage';
import { COMPANY, operatedBy } from '@/lib/company';

export const metadata = { title: 'Privacy Policy — ReplyRelay' };
const CONTACT = COMPANY.email;

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="12 October 2026">
      <p>ReplyRelay is operated by {operatedBy()}, {COMPANY.address}. It lets Instagram Business and Creator accounts and Facebook Pages send automatic private messages and comment replies when people comment on their posts. This policy explains what data we handle and why.</p>

      <h2>Data we collect</h2>
      <ul>
        <li><strong>Your ReplyRelay account:</strong> name, and either your email address and a securely hashed password, or the ID of the Instagram or Facebook account you signed in with.</li>
        <li><strong>Your connected accounts:</strong> for Instagram, the account ID, username, name, profile picture and follower count; for Facebook, the ID, name, picture and follower count of the Pages you choose. We also store the access token issued by Meta, encrypted.</li>
        <li><strong>Your posts:</strong> post IDs, captions, thumbnails and links, so you can pick which post an automation runs on.</li>
        <li><strong>Comments on your selected posts:</strong> comment ID, comment text, and the commenter's ID and username or name, so we can send the reply you configured and show you a log of it.</li>
        <li><strong>Messages and replies you write:</strong> the DM text, link and comment replies you set up in an automation.</li>
      </ul>

      <h2>How we use it</h2>
      <p>We use this data only to run the automations you create: reading new comments on the posts you select, sending the direct message and public reply you wrote, and showing you who received them. We do not sell data, use it for advertising, or share it with third parties except the service providers that host the app (Vercel) and database (Neon), who process it on our behalf.</p>

      <h2>Permissions we request</h2>
      <p><strong>Instagram:</strong> <em>instagram_business_basic</em> to show your profile and posts, <em>instagram_business_manage_comments</em> to read and reply to comments, and <em>instagram_business_manage_messages</em> to send private replies to commenters.</p>
      <p><strong>Facebook:</strong> <em>public_profile</em> and <em>email</em> to sign you in, <em>pages_show_list</em> to list your Pages, <em>pages_read_engagement</em> and <em>pages_read_user_content</em> to read posts and comments, <em>pages_manage_engagement</em> to reply to comments, <em>pages_manage_metadata</em> to receive comment notifications, and <em>pages_messaging</em> to send private replies in Messenger.</p>
      <p>We only act on posts you select in an active automation.</p>

      <h2>Retention</h2>
      <p>We keep your data while your account is active. Deleting an automation deletes its comment log. Removing ReplyRelay from your Instagram or Facebook settings stops all access immediately. You can ask us to delete all of your data at any time, as described on our <a className="underline" href="/data-deletion">data deletion page</a>.</p>

      <h2>Security</h2>
      <p>Instagram access tokens are encrypted with AES-256. Passwords are hashed with bcrypt. All traffic uses HTTPS. Incoming notifications from Meta are verified with a signature before they are processed.</p>

      <h2>Contact</h2>
      <p>Questions about privacy: <a className="underline" href={`mailto:${CONTACT}`}>{CONTACT}</a></p>
    </LegalPage>
  );
}
