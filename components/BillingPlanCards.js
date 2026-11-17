'use client';
import { useState } from 'react';
import { UpgradeButton, PaygButton } from './BillingActions';

const rupees = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const num = (n) => Number(n || 0).toLocaleString('en-IN');

// Plan tiles on the Billing page. The highlight follows the tile the person clicks;
// it starts on their current plan. "Most popular" stays as a label.
export default function BillingPlanCards({ plans, current, canBuy, currentPrice, payg = {} }) {
  const [selected, setSelected] = useState(current || plans.find((p) => p.popular)?.key || plans[0]?.key);
  return (
    <div role="radiogroup" aria-label="Plans" className={`grid gap-4 md:grid-cols-2 ${plans.length >= 5 ? 'xl:grid-cols-5' : 'xl:grid-cols-4'}`}>
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
            <p className="mt-2"><span className="font-display text-3xl font-bold">{rupees(p.price)}</span>{(p.price > 0 || p.payg) && <span className="text-sm text-slate"> / month</span>}</p>
            {p.payg && payg.rate && <p className="text-sm font-semibold">+ from ₹{payg.rate} per 100 messages</p>}
            <p className="mt-2 text-sm text-slate">{p.blurb}</p>
            <ul className="mt-4 space-y-1.5 text-sm">
              {p.payg
                ? <li>{p.messages > 0 ? <><strong>{num(p.messages)}</strong> free messages a month, then </> : 'Pay '}{p.messages > 0 ? 'pay' : ''} only for what you send</li>
                : <li><strong>{num(p.messages)}</strong> messages a month</li>}
              <li><strong>{p.accounts}</strong> account{p.accounts > 1 ? 's' : ''}</li>
              <li><strong>{p.members}</strong> team member{p.members > 1 ? 's' : ''}</li>
            </ul>
            <div className="mt-auto pt-5" onClick={(e) => e.stopPropagation()}>
              {mine ? <p className="rounded-lg bg-canvas py-2.5 text-center text-sm font-semibold">Your plan</p>
                : p.payg && canBuy ? <PaygButton primary={on} label={`Switch to ${p.name}`} paidUntil={payg.paidUntil} credits={payg.credits} rate={payg.rate} />
                : p.key === 'FREE' && current === 'PAYG' && canBuy ? <PaygButton to="FREE" label="Move to Free" />
                : p.paid && canBuy ? <UpgradeButton plan={p.key} primary={on} label={!currentPrice ? `Choose ${p.name}` : currentPrice > p.price ? `Downgrade to ${p.name}` : `Upgrade to ${p.name}`} />
                : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
