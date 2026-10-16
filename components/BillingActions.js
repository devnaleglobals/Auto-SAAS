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
export function UpgradeButton({ plan, label, primary }) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const { toast } = useFeedback();
  async function go() {
    setBusy(true);
    const res = await fetch('/api/billing/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setBusy(false);
      toast(data.error || 'Couldn’t start checkout.', 'bad');
      if (data.needsDetails) document.getElementById('billing-details')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (!(await loadCheckout())) { window.location.href = data.url; return; }
    const rz = new window.Razorpay({
      key: data.key,
      subscription_id: data.subscriptionId,
      name: 'ReplyRelay',
      description: `${data.plan} plan, billed monthly`,
      prefill: data.prefill,
      theme: { color: '#141B2E' },
      modal: { ondismiss: () => setBusy(false) },
      handler: async (resp) => {
        const v = await fetch('/api/billing/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(resp) });
        const out = await v.json().catch(() => ({}));
        setBusy(false);
        if (v.ok) { toast(`You’re on ${out.plan}. Thank you!`); router.refresh(); }
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
        <div><label className="label" htmlFor="bg">GSTIN <span className="font-normal text-slate">(optional)</span></label><input id="bg" className="field uppercase" maxLength={15} value={v.billingGstin} onChange={set('billingGstin')} disabled={!canEdit} placeholder="29ABCDE1234F1Z5" /></div>
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
