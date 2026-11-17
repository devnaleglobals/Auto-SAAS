'use client';
import { useState } from 'react';
import { UpgradeButton } from './BillingActions';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');

// Plan tiles on the Billing page. The highlight follows the tile the person clicks;
// it starts on their current plan. "Most popular" stays as a label.
export default function BillingPlanCards({ plans, current, canBuy, currentPrice }) {
  const [selected, setSelected] = useState(current);
  return (
    <div role="radiogroup" aria-label="Plans" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => {
        const on = selected === p.key;
        const mine = p.key === current;
        return (
          <div key={p.key} role="radio" aria-checked={on} tabIndex={0}
            onClick={() => setSelected(p.key)}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelected(p.key); } }}
            className={`card flex cursor-pointer flex-col p-5 outline-none transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lift focus-visible:ring-4 focus-visible:ring-marigold/40 ${on ? 'border-ink shadow-lift ring-1 ring-ink' : 'hover:border-slate/40'}`}>
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-display text-lg font-bold">{p.name}</h3>
              {mine ? <span className="rounded-full bg-ok/10 px-2 py-0.5 text-xs font-semibold text-ok">Current</span>
                : p.popular && <span className="rounded-full bg-marigold/25 px-2 py-0.5 text-xs font-semibold">Most popular</span>}
            </div>
            <p className="mt-2"><span className="font-display text-3xl font-bold">{rupees(p.price)}</span>{p.price > 0 && <span className="text-sm text-slate"> / month</span>}</p>
            <p className="mt-2 text-sm text-slate">{p.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              <li><strong>{num(p.messages)}</strong> messages a month</li>
              <li><strong>{p.accounts}</strong> account{p.accounts > 1 ? 's' : ''}</li>
              <li><strong>{p.members}</strong> team member{p.members > 1 ? 's' : ''}</li>
            </ul>
            <div className="mt-auto pt-5" onClick={(e) => e.stopPropagation()}>
              {mine ? <p className="rounded-lg bg-canvas py-2.5 text-center text-sm font-semibold">Your plan</p>
                : p.paid && canBuy ? <UpgradeButton plan={p.key} primary={on} label={currentPrice > p.price ? `Switch to ${p.name}` : `Upgrade to ${p.name}`} />
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
