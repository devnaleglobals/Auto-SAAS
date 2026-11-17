'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

function loadCheckout() {
  if (typeof window === 'undefined') return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const el = document.createElement('script');
    el.src = 'https://checkout.razorpay.com/v1/checkout.js';
    el.onload = () => resolve(true);
    el.onerror = () => resolve(false);
    document.body.appendChild(el);
  });
}

// Opens Razorpay Checkout as a popup over the Billing page. Falls back to Razorpay's hosted page.
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

export function UpgradeButton({ plan, label, primary }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  async function go() {
    // 1. Show exactly what happens before any payment.
    setBusy(true);
    const pv = await fetch(`/api/billing/preview?plan=${plan}`).then((r) => r.json()).catch(() => ({}));
    setBusy(false);
    if (pv.kind === 'same') return toast(`You’re already on ${pv.plan}.`);
    if (pv.kind === 'pending') return toast('A plan change is already scheduled. Contact support to change it.', 'bad');
    const body = pv.kind === 'downgrade'
      ? `You keep ${pv.current} until ${pv.startsAtLabel}. ${pv.plan} starts on that date and ${inr(pv.chargeLater)} is charged then. You’ll confirm your payment method now; nothing is charged today.`
      : pv.kind === 'upgrade'
        ? `${pv.plan} starts now and ${inr(pv.chargeNow)} is charged today, then every month.${pv.refund > 0 ? ` The unused days of ${pv.current} (${inr(pv.refund)}) are refunded to your original payment method in 5–7 working days.` : ''} Your messages used this month count towards the new, higher limit.`
        : `${pv.plan} starts now and ${inr(pv.chargeNow)} is charged today, then every month until you cancel.`;
    const ok = await confirm({ title: pv.kind === 'downgrade' ? `Switch to ${pv.plan} on ${pv.startsAtLabel}?` : `Change to ${pv.plan}?`, body, confirmLabel: pv.kind === 'downgrade' ? 'Schedule the change' : `Pay ${inr(pv.chargeNow)}` });
    if (!ok) return;
    setBusy(true);
    const res = await fetch('/api/billing/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      toast(data.error || `Couldn’t start checkout (error ${res.status}). Check Vercel logs for “Razorpay”.`, 'bad');
      if (data.needsDetails) document.getElementById('billing-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!(await loadCheckout())) { window.location.href = data.url; return; }
    const rz = new window.Razorpay({
      key: data.key,
      subscription_id: data.subscriptionId,
      name: 'ReplyRelay',
      description: data.change?.kind === 'downgrade' ? `${data.plan} plan, starts ${new Date(data.change.startsAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}` : `${data.plan} plan, billed monthly`,
      prefill: data.prefill,
      theme: { color: '#141B2E' },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (resp) => {
        const v = await fetch('/api/billing/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
        const out = await v.json().catch(() => ({}));
        setBusy(false);
        if (v.ok) {
          toast(out.scheduled ? `Done. ${out.plan} starts on ${out.startsAt}.` : `You’re on ${out.plan}. Thank you!${out.refunded ? ` ₹${out.refunded} for unused days is being refunded.` : ''}`);
          router.push('/dashboard/billing'); router.refresh();
        }
        else toast(out.error || 'Payment received; your plan will update shortly.', 'bad');
      },
    });
    rz.on('payment.failed', (r) => { toast(r?.error?.description || 'The payment didn’t go through. Try another method.', 'bad'); });
    rz.open();
  }
  return <button onClick={go} disabled={busy} className={`${primary ? 'btn-primary' : 'btn-dark'} w-full`}>{busy && <Spinner />}{label}</button>;
}

export function BillingDetails({ initial, canEdit }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState(initial);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  async function save(e) {
    e.preventDefault();
    setBusy(true);
    const res = await fetch('/api/billing/details', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    toast(res.ok ? 'Billing details saved' : data.error || 'Couldn’t save.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
  }
  return (
    <form id="billing-details" onSubmit={save} className="card scroll-mt-24 p-6">
      <h2 className="font-display text-lg font-bold">Billing details</h2>
      <p className="mt-1 text-sm text-slate">Printed on your Razorpay invoices. Add your GSTIN to claim input tax credit.</p>
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="bn">Business name</label><input id="bn" className="field" value={v.billingName} onChange={set('billingName')} disabled={!canEdit} required /></div>
        <div><label className="label" htmlFor="bg">GSTIN <span className="font-normal text-slate">(optional)</span></label><input id="bg" className="field uppercase" maxLength={15} value={v.billingGstin} onChange={set('billingGstin')} disabled={!canEdit} placeholder="15-character GSTIN" /></div>
        <div><label className="label" htmlFor="be">Billing email</label><input id="be" type="email" className="field" value={v.billingEmail} onChange={set('billingEmail')} disabled={!canEdit} /></div>
        <div><label className="label" htmlFor="bp">Phone</label><input id="bp" className="field" value={v.billingPhone} onChange={set('billingPhone')} disabled={!canEdit} placeholder="+91 98765 43210" /></div>
        <div className="sm:col-span-2"><label className="label" htmlFor="ba">Address</label><textarea id="ba" rows={2} className="field" value={v.billingAddress} onChange={set('billingAddress')} disabled={!canEdit} /></div>
      </div>
      {canEdit && <button disabled={busy} className="btn-dark mt-5">{busy && <Spinner />}Save billing details</button>}
      {!canEdit && <p className="hint mt-4">Only the workspace owner can change billing details.</p>}
    </form>
  );
}

export function CancelButton({ until }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  async function go() {
    const ok = await confirm({ title: 'Cancel your plan?', body: `You keep your current plan until ${until}. After that the workspace moves to Free.`, confirmLabel: 'Cancel plan', danger: true });
    if (!ok) return;
    setBusy(true);
    const res = await fetch('/api/billing/cancel', { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    toast(res.ok ? `Plan cancelled. Active until ${until}.` : data.error || 'Couldn’t cancel.', res.ok ? 'ok' : 'bad');
    router.refresh();
  }
  return <button onClick={go} disabled={busy} className="btn-ghost text-bad">{busy && <Spinner />}Cancel plan</button>;
}

// Pay-as-you-go: buy a message credit pack with a one-time Razorpay payment.
export function BuyCreditsButton({ packId, label, primary }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useFeedback();
  async function go() {
    setBusy(true);
    const res = await fetch('/api/billing/credits', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ packId }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      toast(data.error || 'Couldn’t start the payment.', 'bad');
      if (data.needsDetails) document.getElementById('billing-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!(await loadCheckout())) { setBusy(false); return toast('Couldn’t open the payment window. Check your connection and try again.', 'bad'); }
    const rz = new window.Razorpay({
      key: data.key, order_id: data.orderId, amount: data.amount, currency: 'INR',
      name: 'ReplyRelay', description: data.description, prefill: data.prefill, theme: { color: '#141B2E' },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (resp) => {
        const v = await fetch('/api/billing/credits/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
        const out = await v.json().catch(() => ({}));
        setBusy(false);
        if (v.ok) { toast(`${Number(out.credits).toLocaleString('en-IN')} message credits added. Thank you!`); router.refresh(); }
        else toast(out.error || 'Payment received; credits will appear shortly.', 'bad');
      },
    });
    rz.on('payment.failed', (r) => { toast(r?.error?.description || 'The payment didn’t go through. Try another method.', 'bad'); });
    rz.open();
  }
  return <button onClick={go} disabled={busy} className={`${primary ? 'btn-primary' : 'btn-dark'} w-full`}>{busy && <Spinner />}{label}</button>;
}

// Switch to the Pay as you go plan (no payment now), or from it back to Free.
// `paidUntil` is set when the client is on a paid subscription: the switch then happens when that period ends.
export function PaygButton({ to = 'PAYG', label, primary, paidUntil, credits = 0, rate }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  async function go() {
    const body = to === 'FREE'
      ? 'You move to the Free plan now. Your unused credits stay in your account and are used after Free’s monthly messages.'
      : paidUntil
        ? `You keep your current plan until ${paidUntil}, with no further monthly charges. From then on you pay only for messages you send${rate ? ` (from ₹${rate} per 100)` : ''}, using message credits.`
        : `No monthly fee. Each message your automations send uses 1 credit${rate ? ` (from ₹${rate} per 100 messages)` : ''}. ${credits > 0 ? `You have ${credits.toLocaleString('en-IN')} credits.` : 'Buy credits after switching; automations stop sending when credits run out.'}`;
    const ok = await confirm({ title: to === 'FREE' ? 'Move to Free?' : paidUntil ? `Switch to pay as you go on ${paidUntil}?` : 'Switch to pay as you go?', body, confirmLabel: to === 'FREE' ? 'Move to Free' : paidUntil ? 'Schedule the switch' : 'Switch now' });
    if (!ok) return;
    setBusy(true);
    const res = await fetch('/api/billing/payg', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ to }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(data.error || 'That didn’t work.', 'bad');
    toast(data.scheduled ? `Done. Pay as you go starts on ${data.startsAt}.` : `You’re now on ${data.plan}.`);
    router.push(to === 'PAYG' && !data.scheduled && credits <= 0 ? '/dashboard/billing/plans#credits' : '/dashboard/billing');
    router.refresh();
  }
  return <button type="button" onClick={go} disabled={busy} className={`${primary ? 'btn-primary' : 'btn-ghost'} w-full`}>{busy && <Spinner />}{label}</button>;
}
