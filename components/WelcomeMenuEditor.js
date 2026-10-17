'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function WelcomeMenuEditor({ channelId, initial, flows, isFb }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [items, setItems] = useState(initial.length ? initial : [{ question: '', automationId: '' }]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (i, patch) => setItems(items.map((it, j) => (j === i ? { ...it, ...patch } : it)));

  async function save(list) {
    setBusy(true); setError('');
    const res = await fetch(`/api/channels/${channelId}/welcome`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ items: list }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) { setError(data.error || 'Couldn’t save the menu.'); return; }
    toast(list.length ? 'Welcome menu saved' : 'Welcome menu removed');
    router.refresh();
  }

  if (!flows.length) {
    return (
      <div className="card border-dashed p-8">
        <p className="font-semibold">Create a conversation first</p>
        <p className="mt-1 text-sm text-slate">Each menu question starts one of your {isFb ? 'Messenger' : 'DM'} conversations. Create one, then come back.</p>
        <a href={`/dashboard/automations/new?type=DM_FLOW&account=${channelId}`} className="btn-primary mt-5">Create a conversation</a>
      </div>
    );
  }

  return (
    <div className="grid gap-8 xl:grid-cols-[1fr_320px]">
      <div className="card space-y-4 p-6">
        {items.map((it, i) => (
          <div key={i} className="grid gap-2 sm:grid-cols-[1fr_240px_auto]">
            <input value={it.question} maxLength={80} onChange={(e) => set(i, { question: e.target.value })} placeholder={['What are your prices?', 'How long is delivery?', 'Do you ship to my city?', 'Talk to a person'][i]} className="field" aria-label={`Question ${i + 1}`} />
            <select value={it.automationId} onChange={(e) => set(i, { automationId: e.target.value })} className="field" aria-label={`Conversation for question ${i + 1}`}>
              <option value="">Starts which conversation?</option>
              {flows.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
            <button type="button" onClick={() => setItems(items.filter((_, j) => j !== i))} className="btn-ghost" aria-label={`Remove question ${i + 1}`}>×</button>
          </div>
        ))}
        {items.length < 4 && <button type="button" onClick={() => setItems([...items, { question: '', automationId: '' }])} className="btn-ghost btn-sm">+ Add a question</button>}
        {error && <p role="alert" className="rounded-lg bg-bad/5 px-3 py-2 text-sm text-bad">{error}</p>}
        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button disabled={busy} onClick={() => save(items.filter((x) => x.question || x.automationId))} className="btn-primary">{busy && <Spinner />}Save menu</button>
          {initial.length > 0 && <button disabled={busy} onClick={() => save([])} className="btn-ghost text-bad">Remove menu</button>}
        </div>
        <p className="hint">Shown to people opening a chat with you for the first time. Instagram and Messenger may take a few minutes to show changes.</p>
      </div>
      <aside>
        <p className="mb-3 text-sm font-semibold text-slate">Preview</p>
        <div className="rounded-[28px] border-[6px] border-navy bg-canvas p-4">
          <p className="mb-3 text-center text-xs text-slate">New chat</p>
          <div className="space-y-2">
            {items.filter((x) => x.question).map((x, i) => (
              <div key={i} className="rounded-xl border border-line bg-white px-3 py-2 text-center text-sm font-semibold text-sky">{x.question}</div>
            ))}
            {!items.some((x) => x.question) && <p className="text-center text-sm text-slate">Your questions appear here</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
