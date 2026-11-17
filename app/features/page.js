import Link from 'next/link';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';

export const metadata = { title: 'Features — ReplyRelay', description: 'Comment to DM, auto replies, DM conversations with buttons, lead capture, story replies and moderation for Instagram and Facebook.' };

const GROUPS = [
  ['Comments', [
    ['Comment to DM', 'Send a private message to everyone who comments a keyword, on one post or all posts. Track how many open your link.'],
    ['Public replies', 'Reply under the comment with up to 10 rotating messages.'],
    ['Keyword matching', 'Contains, exact match, or any comment. Works with Hindi, Marathi and emoji.'],
    ['Moderation', 'Hide or delete comments with blocked words or links automatically, including on ads.'],
  ]],
  ['Messages', [
    ['DM conversations', 'Multi-step chats with up to 3 buttons per message and links, started by a keyword.'],
    ['Lead capture', 'Ask for name, phone, email or any question. Answers land in Leads, exportable to CSV.'],
    ['Follow check', 'On Instagram, ask people to follow before sending the link, checked on every message.'],
    ['Reminders', 'One follow-up if someone didn’t open the link, inside Meta’s 24-hour window.'],
    ['Welcome menu', 'Up to 4 ready questions people can tap when they open a chat with you.'],
    ['Story replies & mentions', 'Instagram: reply when someone answers or mentions your story.'],
  ]],
  ['Business', [
    ['Instagram + Facebook', 'Connect Instagram Business/Creator accounts and Facebook Pages in one workspace.'],
    ['Team and roles', 'Invite your team as Admin, Member or Viewer. Every change is logged.'],
    ['Analytics', 'Messages sent, replies, link clicks, leads and conversation steps per automation.'],
    ['Billing in rupees', 'Monthly plans through Razorpay with UPI autopay, cards and GST invoices.'],
    ['Support', 'Raise tickets from your dashboard and follow the conversation by email.'],
    ['Privacy controls', 'Download or delete your data anytime. People can reply STOP to opt out.'],
  ]],
];

export default function Features() {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">Everything you need to turn comments into conversations.</h1>
        <p className="mt-4 max-w-2xl text-slate">ReplyRelay uses Meta’s official, approved API. We never ask for your Instagram or Facebook password, and only reply to people who interacted with you first.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Link href="/demo" className="btn-primary">Try the live demo</Link><Link href="/signup" className="btn-ghost">Start free trial</Link></div>
        {GROUPS.map(([title, items]) => (
          <section key={title} className="mt-14">
            <h2 className="font-display text-2xl font-bold">{title}</h2>
            <dl className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {items.map(([t, d]) => <div key={t} className="card p-5"><dt className="font-display text-lg font-bold">{t}</dt><dd className="mt-1.5 text-sm text-slate">{d}</dd></div>)}
            </dl>
          </section>
        ))}
        <section className="mt-14 rounded-2xl bg-surface p-6 text-sm">
          <h2 className="font-display text-xl font-bold">Security</h2>
          <ul className="mt-3 grid gap-2 text-slate sm:grid-cols-2">
            <li>Meta access tokens encrypted with AES-256-GCM</li><li>Payments handled by Razorpay; we never see card or UPI details</li>
            <li>Every Meta and Razorpay notification verified by signature</li><li>Rate-limited sign-in, team roles and full activity logs</li>
          </ul>
        </section>
      </section>
      <PublicFooter />
    </main>
  );
}
