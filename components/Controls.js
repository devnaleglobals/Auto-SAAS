'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

export default function Controls({ id, status, canEdit, type, name }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [menu, setMenu] = useState(false);

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
    toast(data.note || data.error || 'Check failed.', res.ok ? 'ok' : 'bad');
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
    <div className="flex flex-wrap items-center gap-2">
      {status === 'ACTIVE' && <button disabled={!!busy} onClick={check} className="btn-primary">{busy === 'check' && <Spinner />}Check now</button>}
      {status === 'ACTIVE'
        ? <button disabled={!!busy} onClick={() => setStatus('PAUSED')} className="btn-ghost">{busy === 'status' && <Spinner />}Pause</button>
        : <button disabled={!!busy} onClick={() => setStatus('ACTIVE')} className="btn-primary">{busy === 'status' && <Spinner />}Resume</button>}
      <Link href={`/dashboard/automations/${id}/edit`} className="btn-ghost">Edit</Link>
      <div className="relative">
        <button type="button" disabled={!!busy} onClick={() => setMenu(!menu)} aria-expanded={menu} aria-haspopup="menu" className="btn-ghost px-3" aria-label="More actions">
          {busy === 'dup' || busy === 'del' ? <Spinner /> : <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden><circle cx="5" cy="12" r="1.8" fill="currentColor" /><circle cx="12" cy="12" r="1.8" fill="currentColor" /><circle cx="19" cy="12" r="1.8" fill="currentColor" /></svg>}
        </button>
        {menu && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} aria-hidden />
            <div role="menu" className="absolute right-0 z-20 mt-2 w-44 animate-dialog-in overflow-hidden rounded-xl border border-line bg-white py-1 shadow-pop">
              <button role="menuitem" onClick={() => { setMenu(false); duplicate(); }} className="block w-full px-4 py-2 text-left text-sm hover:bg-canvas">Duplicate</button>
              <button role="menuitem" onClick={() => { setMenu(false); remove(); }} className="block w-full px-4 py-2 text-left text-sm text-bad hover:bg-bad/5">Delete</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
