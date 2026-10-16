import Link from 'next/link';
import PublicHeader, { PublicFooter } from '@/components/PublicHeader';
import { PLANS, FEATURES_ALL, rupees } from '@/lib/plans';

export const metadata = { title: 'Pricing — ReplyRelay', description: 'Simple monthly plans in rupees. Start free.' };

const FAQ = [
  ['What counts as a message?', 'Every private message, conversation message, reminder and public comment reply ReplyRelay sends. Hiding a spam comment doesn’t count.'],
  ['What happens if I reach my limit?', 'Automations pause until the 1st of next month, or until you upgrade. Nothing is lost, and we show a warning before you get there.'],
  ['Can I cancel anytime?', 'Yes. Cancel from the Billing page and keep your plan until the end of the month you paid for. No questions asked.'],
  ['How do I pay?', 'Through Razorpay with UPI autopay, debit or credit cards. Renewals are automatic and you get an invoice each month.'],
  ['Is it safe for my Instagram account?', 'Yes. ReplyRelay uses Meta’s official API, the same one used by the biggest tools, and only replies to people who commented, replied or messaged you. We never ask for your Instagram password.'],
  ['Which accounts work?', 'Instagram Business and Creator accounts, and Facebook Pages. Personal Instagram accounts can switch to Creator for free in settings.'],
];

export default function Pricing() {
  return (
    <main>
      <PublicHeader />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-6">
        <h1 className="max-w-2xl font-display text-4xl font-extrabold tracking-[-0.02em] md:text-5xl">Simple plans, in rupees.</h1>
        <p className="mt-4 max-w-xl text-base text-slate">Every plan has every feature. You only choose how many messages, accounts and team members you need. Start free, no card required.</p>

        <div className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Object.entries(PLANS).map(([key, p]) => (
            <div key={key} className={`card flex flex-col p-6 ${p.popular ? 'border-ink shadow-lift ring-1 ring-ink' : ''}`}>
              <div className="flex items-center justify-between"><h2 className="font-display text-xl font-bold">{p.name}</h2>{p.popular && <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-xs font-semibold">Most popular</span>}</div>
              <p className="mt-3"><span className="font-display text-4xl font-bold">{rupees(p.price)}</span><span className="text-sm text-slate">{p.price ? ' / month' : ' forever'}</span></p>
              <p className="mt-2 text-sm text-slate">{p.blurb}</p>
              <ul className="mt-5 space-y-2 text-sm">
                <li><strong>{p.messages.toLocaleString('en-IN')}</strong> messages a month</li>
                <li><strong>{p.accounts}</strong> Instagram or Facebook account{p.accounts > 1 ? 's' : ''}</li>
                <li><strong>{p.members}</strong> team member{p.members > 1 ? 's' : ''}</li>
              </ul>
              <Link href="/signup" className={`${p.popular ? 'btn-primary' : 'btn-ghost'} mt-auto w-full`} style={{ marginTop: '1.5rem' }}>{p.price ? `Start with ${p.name}` : 'Start free'}</Link>
            </div>
          ))}
        </div>

        <div className="mt-10 rounded-xl bg-white p-6">
          <h2 className="font-display text-lg font-bold">Included in every plan</h2>
          <ul className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES_ALL.map((f) => <li key={f} className="flex gap-2"><span aria-hidden className="text-ok">✓</span>{f}</li>)}
          </ul>
        </div>

        <h2 className="mt-16 font-display text-2xl font-bold">Questions</h2>
        <dl className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
          {FAQ.map(([q, a]) => <div key={q}><dt className="font-semibold">{q}</dt><dd className="mt-1 text-sm text-slate">{a}</dd></div>)}
        </dl>
      </section>
      <PublicFooter />
    </main>
  );
}
