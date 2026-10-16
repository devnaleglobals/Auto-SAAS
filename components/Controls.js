'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function Controls({ id, status, canEdit, type, name }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [note, setNote] = useState(null);

  async function run(key, fn) { setBusy(key); try { await fn(); } finally { setBusy(''); } }

  const setStatus = (s) => run('status', async () => {
    const res = await fetch(`/api/automations/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: s }) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return toast(data.error || 'Couldn’t change the status.', 'bad');
    toast(s === 'ACTIVE' ? 'Automation resumed' : 'Automation paused');
    router.refresh();
  });
  const check = () => run('check', async () => {
    const res = await fetch(`/api/automations/${id}/check`, { method: 'POST' });
    const data = await res.json().catch(() => ({}));
    setNote({ ok: res.ok, text: data.note || data.error || 'Check failed.' });
    router.refresh();
  });
  const duplicate = () => run('dup', async () => {
    const res = await fetch(`/api/automations/${id}/duplicate`, { method: 'POST' });
    const data = await res.json();
    if (!res.ok) return toast(data.error, 'bad');
    toast('Copy created. It starts paused.');
    router.push(`/dashboard/automations/${data.id}/edit`);
  });
  const remove = async () => {
    const ok = await confirm({ title: `Delete “${name}”?`, body: 'Its settings and full history will be removed. This can’t be undone.', confirmLabel: 'Delete automation', danger: true });
    if (!ok) return;
    run('del', async () => {
      await fetch(`/api/automations/${id}`, { method: 'DELETE' });
      toast('Automation deleted');
      router.push('/dashboard/automations'); router.refresh();
    });
  };

  if (!canEdit) return <p className="text-sm text-slate">You have view-only access.</p>;

  return (
    <div className="flex max-w-lg flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {status === 'ACTIVE' && <button disabled={!!busy} onClick={check} className="btn-primary">{busy === 'check' && <Spinner />}{type === 'DM_FLOW' ? 'Check for new messages' : 'Check for new comments'}</button>}
        {status === 'ACTIVE'
          ? <button disabled={!!busy} onClick={() => setStatus('PAUSED')} className="btn-ghost">{busy === 'status' && <Spinner />}Pause</button>
          : <button disabled={!!busy} onClick={() => setStatus('ACTIVE')} className="btn-primary">{busy === 'status' && <Spinner />}Resume</button>}
        <Link href={`/dashboard/automations/${id}/edit`} className="btn-ghost">Edit</Link>
        <button disabled={!!busy} onClick={duplicate} className="btn-ghost">{busy === 'dup' && <Spinner />}Duplicate</button>
        <button disabled={!!busy} onClick={remove} className="btn-ghost text-bad">Delete</button>
      </div>
      {note && <p className={`max-w-md animate-fade-in text-right text-sm ${note.ok ? 'text-ok' : 'text-bad'}`}>{note.text}</p>}
    </div>
  );
}
