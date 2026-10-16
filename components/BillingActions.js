'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export function UpgradeButton({ plan, label, primary }) {
  const [busy, setBusy] = useState(false);
  const { toast } = useFeedback();
  async function go() {
    setBusy(true);
    const res = await fetch('/api/billing/subscribe', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ plan }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setBusy(false); return toast(data.error || 'Couldn’t start checkout.', 'bad'); }
    window.location.href = data.url; // Razorpay's secure payment page
  }
  return <button onClick={go} disabled={busy} className={`${primary ? 'btn-primary' : 'btn-dark'} w-full`}>{busy && <Spinner />}{label}</button>;
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
