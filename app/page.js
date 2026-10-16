import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChatDemo from '@/components/ChatDemo';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';
import { PLANS, rupees } from '@/lib/plans';

export default async function Home() {
  if (await getSession()) redirect('/dashboard');
  const features = [
    ['Reply to comments', 'Thank people publicly under their comment, with a few variations so it never looks copy-pasted.'],
    ['Comment to private message', 'Anyone who comments your keyword gets your link or offer in their inbox within seconds.'],
    ['Conversations with buttons', 'Build a chat with up to 3 buttons per message. Ask people to follow first if you want.'],
    ['See what worked', 'Who got each message, who tapped, who clicked the link, and who followed after you asked.'],
  ];
  return (
    <main className="overflow-x-hidden">
      <PublicHeader />

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] md:text-7xl">
            Every comment can become a customer.
          </h1>
          <p className="mt-6 max-w-xl text-base text-slate md:text-lg">
            When someone comments on your Instagram or Facebook post, ReplyRelay replies, sends them a private message, and walks them through a conversation you design.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">Start free</Link>
            <Link href="/login" className="btn-ghost px-6 py-3 text-base">I have an account</Link>
          </div>
          <p className="mt-5 text-xs text-slate">Works with Instagram Business and Creator accounts and Facebook Pages.</p>
        </div>
        <ChatDemo />
      </section>

      <section className="border-y border-line bg-white">
        <dl className="mx-auto grid max-w-6xl gap-x-10 gap-y-8 px-6 py-14 sm:grid-cols-2 lg:grid-cols-4">
          {features.map(([t, d]) => (
            <div key={t}><dt className="font-display text-lg font-bold">{t}</dt><dd className="mt-2 text-sm text-slate">{d}</dd></div>
          ))}
        </dl>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-4xl">Start free. Upgrade when it works.</h2>
            <p className="mt-3 max-w-xl text-slate">Free for one account and {PLANS.FREE.messages} messages a month. Paid plans from {rupees(PLANS.STARTER.price)} a month, cancel anytime.</p>
          </div>
          <div className="flex gap-3"><Link href="/pricing" className="btn-ghost">See pricing</Link><Link href="/signup" className="btn-primary">Start free</Link></div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
