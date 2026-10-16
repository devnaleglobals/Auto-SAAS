'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function AnnouncementForm({ initial }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState({ text: initial?.text || '', link: initial?.link || '', tone: initial?.tone || 'info', until: initial?.until || '' });
  const [busy, setBusy] = useState(false);
  const live = Boolean(initial?.active && initial?.text);

  async function save(active) {
    setBusy(true);
    const res = await fetch('/api/admin/announcement', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...v, active }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    toast(res.ok ? (active ? 'Announcement published' : 'Announcement removed') : data.error || 'Couldn’t save.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
  }

  return (
    <section className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg font-bold">Announcement to all clients</h2>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${live ? 'bg-ok/10 text-ok' : 'bg-slate/10 text-slate'}`}>{live ? 'Live' : 'Off'}</span>
      </div>
      <p className="mt-1 text-sm text-slate">Shown as a banner at the top of every client’s dashboard. Use it for maintenance windows or new features.</p>
      <div className="mt-4 space-y-4">
        <div><label className="label" htmlFor="an-text">Message</label>
          <textarea id="an-text" rows={2} maxLength={240} className="field" value={v.text} onChange={(e) => setV({ ...v, text: e.target.value })} placeholder="Instagram replies may be delayed on Sunday 2–3 am IST for scheduled maintenance." /></div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div><label className="label" htmlFor="an-link">Link (optional)</label><input id="an-link" className="field" value={v.link} onChange={(e) => setV({ ...v, link: e.target.value })} placeholder="https://" /></div>
          <div><label className="label" htmlFor="an-tone">Style</label>
            <select id="an-tone" className="field" value={v.tone} onChange={(e) => setV({ ...v, tone: e.target.value })}><option value="info">Information</option><option value="warn">Important</option></select></div>
          <div><label className="label" htmlFor="an-until">Hide after (optional)</label><input id="an-until" type="date" className="field" value={v.until ? String(v.until).slice(0, 10) : ''} onChange={(e) => setV({ ...v, until: e.target.value ? new Date(`${e.target.value}T23:59:59+05:30`).toISOString() : '' })} /></div>
        </div>
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <button disabled={busy || !v.text.trim()} onClick={() => save(true)} className="btn-primary">{busy && <Spinner />}{live ? 'Update announcement' : 'Publish announcement'}</button>
        {live && <button disabled={busy} onClick={() => save(false)} className="btn-ghost">Remove announcement</button>}
      </div>
    </section>
  );
}
