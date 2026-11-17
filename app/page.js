import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getSession } from '@/lib/auth';
import ChatDemo from '@/components/ChatDemo';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';
import { rupees } from '@/lib/plans';
import { publicPricing } from '@/lib/publicData';

export const dynamic = 'force-dynamic';

const STEPS = [
  ['Connect', 'Sign in with Instagram or Facebook. No passwords shared: Meta’s official login gives us only the access you approve.'],
  ['Set the keyword', 'Choose a post (or all posts), the words to watch for, the public reply and the private message.'],
  ['Watch it work', 'Every matching comment gets answered in seconds, day and night, with a full log of who got what.'],
];
const FEATURES = [
  ['Comment → DM', 'Anyone who comments your keyword gets your link, price list or offer in their inbox.'],
  ['Public replies', 'Thank people under their comment with rotating replies so it never looks copy-pasted.'],
  ['Conversations with buttons', 'Up to 3 buttons per message, multi-step flows, ask for name, phone or email.'],
  ['Follow check', 'Ask people to follow your Instagram account before they get the link.'],
  ['Story replies & mentions', 'Reply automatically when someone answers or mentions your Instagram story.'],
  ['Spam moderation', 'Hide or delete comments with blocked words or links on posts and ads.'],
];

export default async function Home() {
  if (await getSession()) redirect('/dashboard');
  const { plans, trial } = await publicPricing();
  const cheapest = plans.filter((p) => p.price > 0).sort((a, b) => a.price - b.price)[0];
  return (
    <main className="overflow-x-hidden">
      <PublicHeader />
      <section className="mx-auto grid max-w-6xl items-center gap-14 px-6 pb-20 pt-8 lg:grid-cols-[1.1fr_1fr] lg:pt-16">
        <div>
          <p className="mb-4 inline-flex rounded-full bg-marigold/20 px-3 py-1 text-xs font-semibold">Approved Meta app · Instagram + Facebook</p>
          <h1 className="font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.02em] md:text-7xl">Every comment can become a customer.</h1>
          <p className="mt-6 max-w-xl text-base text-slate md:text-lg">When someone comments on your Instagram or Facebook post, ReplyRelay replies, sends them a private message, and walks them through a conversation you design.</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className="btn-primary px-6 py-3 text-base">{trial ? `Start ${trial.days}-day free trial` : 'Start free'}</Link>
            <Link href="/demo" className="btn-ghost px-6 py-3 text-base">Try the live demo</Link>
          </div>
          <p className="mt-5 text-xs text-slate">{trial ? `${trial.plan} features free for ${trial.days} days. No card needed.` : 'No card needed.'} Works with Instagram Business/Creator accounts and Facebook Pages.</p>
        </div>
        <ChatDemo />
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="font-display text-2xl font-bold md:text-4xl">How it works</h2>
          <ol className="mt-8 grid gap-6 md:grid-cols-3">
            {STEPS.map(([t, d], i) => <li key={t} className="card p-6"><span className="flex h-9 w-9 items-center justify-center rounded-full bg-navy font-display font-bold text-marigold">{i + 1}</span><p className="mt-4 font-display text-lg font-bold">{t}</p><p className="mt-2 text-sm text-slate">{d}</p></li>)}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex flex-wrap items-end justify-between gap-4"><h2 className="font-display text-2xl font-bold md:text-4xl">Everything in one place</h2><Link href="/features" className="btn-ghost">All features</Link></div>
        <dl className="mt-8 grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(([t, d]) => <div key={t}><dt className="font-display text-lg font-bold">{t}</dt><dd className="mt-2 text-sm text-slate">{d}</dd></div>)}
        </dl>
      </section>

      <section className="bg-navy text-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-6 px-6 py-14">
          <div>
            <h2 className="font-display text-2xl font-bold md:text-4xl">{trial ? `Try every feature free for ${trial.days} days.` : 'Start free. Upgrade when it works.'}</h2>
            <p className="mt-3 max-w-xl text-white/70">Then stay on Free or pick a plan{cheapest ? ` from ${rupees(cheapest.price)} a month` : ''}. Cancel anytime from your dashboard.</p>
          </div>
          <div className="flex gap-3"><Link href="/pricing" className="btn rounded-lg border border-white/30 px-5 py-2.5 font-semibold text-white hover:bg-white/10">See pricing</Link><Link href="/signup" className="btn-primary">Start free trial</Link></div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
