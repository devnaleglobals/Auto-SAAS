'use client';
import { useState } from 'react';
import Link from 'next/link';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

// Pricing tiles: the highlighted tile follows the visitor's click (or keyboard focus).
// "Most popular" stays as a label; it only decides which tile starts highlighted.
export default function PricingCards({ plans, trial }) {
  const [selected, setSelected] = useState(plans.find((p) => p.popular)?.key || plans[0]?.key);
  return (
    <div role="radiogroup" aria-label="Choose a plan" className={`mt-10 grid gap-4 md:grid-cols-2 ${plans.length >= 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3'}`}>
      {plans.map((p) => {
        const on = selected === p.key;
        return (
          <div
            key={p.key}
            role="radio"
            aria-checked={on}
            tabIndex={0}
            onClick={() => setSelected(p.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p.key); } }}
            className={`card flex cursor-pointer flex-col p-6 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-marigold/40 ${on ? 'border-ink shadow-lift ring-1 ring-ink' : 'hover:border-slate/40'}`}
          >
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-display text-xl font-bold">{p.name}</h2>
              {p.popular && <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-xs font-semibold">Most popular</span>}
            </div>
            <p className="mt-3"><span className="font-display text-4xl font-bold">{rupees(p.price)}</span><span className="text-sm text-slate">{p.price ? ' / month' : ' forever'}</span></p>
            <p className="mt-2 text-sm text-slate">{p.blurb}</p>
            <ul className="mt-5 space-y-2 text-sm">
              <li><strong>{Number(p.messages).toLocaleString('en-IN')}</strong> messages a month</li>
              <li><strong>{p.accounts}</strong> Instagram or Facebook account{p.accounts > 1 ? 's' : ''}</li>
              <li><strong>{p.members}</strong> team member{p.members > 1 ? 's' : ''}</li>
            </ul>
            <Link
              href={`/signup?plan=${p.key}`}
              onClick={(e) => e.stopPropagation()}
              className={`${on ? 'btn-primary' : 'btn-ghost'} mt-auto w-full`}
              style={{ marginTop: '1.5rem' }}
            >
              {p.price ? (trial ? 'Start free trial' : `Start with ${p.name}`) : 'Start free'}
            </Link>
          </div>
        );
      })}
    </div>
  );
}
