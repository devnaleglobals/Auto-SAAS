import Link from 'next/link';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';
import { publicPricing } from '@/lib/publicData';
import PricingCards from '@/components/PricingCards';

export const revalidate = 60; // admin price changes show within a minute
export const metadata = { title: 'Pricing — ReplyRelay', description: 'Simple monthly plans in rupees. Free trial, no card needed.' };

export default async function Pricing() {
  const { plans, trial, features, credits } = await publicPricing();
  const FAQ = [
    ['How does the free trial work?', trial ? `New accounts get the ${trial.plan} plan free for ${trial.days} days, no card needed. After that you stay on Free unless you choose a plan.` : 'You can start on the Free plan without a card and upgrade anytime.'],
    ['What counts as a message?', 'Every private message, conversation message, reminder and public comment reply ReplyRelay sends. Hiding a spam comment doesn’t count.'],
    ['What happens if I reach my limit?', credits.length ? 'Automations pause until the 1st of next month, until you upgrade, or until you buy message credits. Nothing is lost.' : 'Automations pause until the 1st of next month, or until you upgrade. Nothing is lost.'],
    ...(plans.some((p) => p.payg) ? [['How does pay as you go work?', 'There’s no monthly fee. Buy a credit pack once; each message your automations send uses 1 credit. When credits run out, sending pauses until you top up, and we email you before that happens. You can move to a monthly plan any time.']] : []),
    ['Can I cancel anytime?', 'Yes. Cancel from the Billing page and keep your plan until the end of the month you paid for.'],
    ['How do I pay?', 'Through Razorpay with UPI autopay, debit or credit cards. You get a GST invoice each month.'],
    ['Is it safe for my account?', 'Yes. ReplyRelay uses Meta’s official, approved API and only replies to people who commented, replied or messaged you.'],
  ];
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <h1 className="max-w-2xl font-display text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">Simple plans, in rupees.</h1>
        <p className="mt-4 max-w-xl text-base text-slate">Every plan has every feature. Pay monthly for a set number of messages, or pay only for what you send.</p>
        {trial && <p className="mt-4 inline-flex rounded-full bg-marigold/20 px-4 py-1.5 text-sm font-semibold">{trial.days}-day free trial of {trial.plan} · no card needed</p>}
        <p className="mt-3 text-xs text-slate">All prices in Indian rupees (INR), billed monthly. Applicable GST is shown on your invoice. <Link href="/refunds" className="underline">Refund &amp; cancellation policy</Link>.</p>

        <PricingCards plans={plans} trial={trial} />

        {credits.length > 0 && (
          <section className="mt-12">
            <h2 className="font-display text-2xl font-bold">Message credits</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate">1 credit = 1 message. On the Pay as you go plan, credits are all you pay for. On any other plan, they top you up after your monthly messages run out. Credits never expire.</p>
            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {credits.map((p) => (
                <div key={p.id} className="card p-5">
                  <p className="font-display text-lg font-bold">{p.name}</p>
                  <p className="mt-1"><span className="font-display text-3xl font-bold">₹{Number(p.price).toLocaleString('en-IN')}</span><span className="text-sm text-slate"> one time</span></p>
                  <p className="mt-1 text-sm text-slate">₹{(Math.round((p.price / p.credits) * 10000) / 100).toLocaleString('en-IN')} per 100 messages</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <div className="card mt-10 p-6">
          <h2 className="font-display text-lg font-bold">Included in every plan</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">{features.map((f) => <li key={f} className="flex gap-2"><span aria-hidden className="text-ok">✓</span>{f}</li>)}</ul>
        </div>

        <h2 className="mt-16 font-display text-2xl font-bold">Questions</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">{FAQ.map(([q, a]) => <div key={q}><dt className="font-semibold">{q}</dt><dd className="mt-1 text-sm text-slate">{a}</dd></div>)}</dl>
      </section>
      <PublicFooter />
    </main>
  );
}
