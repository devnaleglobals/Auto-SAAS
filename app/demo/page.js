import Link from 'next/link';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';
import DemoSimulator from '@/components/DemoSimulator';

export const metadata = { title: 'Live demo — ReplyRelay', description: 'Try a comment-to-DM automation right in your browser.' };

export default function Demo() {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <h1 className="max-w-3xl font-display text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">Try it before you sign up.</h1>
        <p className="mt-4 max-w-2xl text-slate">Set a keyword, then comment as a follower. You’ll see the public reply, the private message, the follow check and lead capture exactly as your customers would.</p>
        <div className="mt-10"><DemoSimulator /></div>
        <div className="mt-12 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-navy p-6 text-white">
          <p className="font-display text-xl font-bold">Ready to run it on your real account?</p>
          <div className="flex gap-3"><Link href="/pricing" className="rounded-lg border border-white/30 px-5 py-2.5 font-semibold hover:bg-white/10">Pricing</Link><Link href="/signup" className="btn-primary">Start free trial</Link></div>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
