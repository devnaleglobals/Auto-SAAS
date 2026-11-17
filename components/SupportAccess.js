'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

// Client setting: lets platform support edit or delete automations for a limited time.
export default function SupportAccess({ until, canEdit }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [days, setDays] = useState(7);
  const [busy, setBusy] = useState(false);
  const on = until && new Date(until) > new Date();
  const label = on ? new Date(until).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : null;
  async function save(d) {
    setBusy(true);
    const res = await fetch('/api/workspace/support-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ days: d }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return toast(data.error || 'That didn’t work.', 'bad');
    toast(d ? `Support can edit your automations for ${d} day${d > 1 ? 's' : ''}` : 'Support access removed');
    router.refresh();
  }
  return (
    <div className="space-y-4 text-sm">
      <ul className="list-disc space-y-1 pl-5 text-slate">
        <li>Our support team can always <strong className="text-ink">see</strong> your automation settings and whether messages are delivered, and can <strong className="text-ink">pause</strong> one if it’s failing or risks your account. You’re emailed every time.</li>
        <li>To <strong className="text-ink">edit or delete</strong> an automation for you, we need your permission here. It switches off by itself.</li>
        <li>Support never sees your account passwords or Meta tokens. Every change shows on your Activity page.</li>
      </ul>
      {on ? (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-ok/10 px-4 py-3">
          <span className="flex-1"><strong>Support access is on</strong> until {label}.</span>
          {canEdit && <button className="btn-ghost btn-sm" disabled={busy} onClick={() => save(0)}>{busy && <Spinner />}Turn off now</button>}
        </div>
      ) : canEdit ? (
        <div className="flex flex-wrap items-center gap-2">
          <select className="field w-auto" value={days} onChange={(e) => setDays(Number(e.target.value))} aria-label="How long">
            <option value={1}>For 1 day</option><option value={7}>For 7 days</option><option value={30}>For 30 days</option>
          </select>
          <button className="btn-dark" disabled={busy} onClick={() => save(days)}>{busy && <Spinner />}Allow support to edit</button>
        </div>
      ) : <p className="text-slate">Support access is off. Only the workspace owner can turn it on.</p>}
    </div>
  );
}
