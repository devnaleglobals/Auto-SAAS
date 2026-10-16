'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import PlatformIcon from './PlatformIcon';
import { useFeedback } from './Feedback';

export default function AccountCard({ c, canManage }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const { toast, confirm } = useFeedback();
  const reconnect = c.platform === 'FACEBOOK' ? '/api/facebook/connect' : '/api/instagram/connect';
  async function disconnect() {
    const ok = await confirm({ title: `Disconnect ${c.username}?`, body: 'Its automations and their history will be deleted. You can connect it again later.', confirmLabel: 'Disconnect', danger: true });
    if (!ok) return;
    setBusy(true);
    const res = await fetch(`/api/channels/${c.id}`, { method: 'DELETE' });
    setBusy(false);
    toast(res.ok ? `${c.username} disconnected` : 'Couldn’t disconnect. Try again.', res.ok ? 'ok' : 'bad');
    router.refresh();
  }
  return (
    <li className="card flex flex-wrap items-center gap-4 p-4">
      <span className="relative">
        {c.picture ? <img src={c.picture} alt="" className="h-12 w-12 rounded-full object-cover" /> : <span className="block h-12 w-12 rounded-full bg-canvas" />}
        <span className="absolute -bottom-0.5 -right-0.5 rounded-full bg-white p-0.5"><PlatformIcon platform={c.platform} className="h-4 w-4" /></span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{c.platform === 'INSTAGRAM' ? `@${c.username}` : c.username}</p>
        <p className="text-sm text-slate">
          {c.platform === 'FACEBOOK' ? 'Facebook Page' : 'Instagram'} · {c.followers?.toLocaleString('en-IN') ?? '–'} followers · {c.automations} automation{c.automations === 1 ? '' : 's'}
        </p>
        <p className={`mt-0.5 text-[13px] ${c.needsReconnect ? 'font-semibold text-bad' : 'text-ok'}`}>
          {c.needsReconnect ? 'Connection stopped working. Reconnect to resume.' : c.tokenExpiresAt ? 'Connected · access renews automatically' : 'Connected'}
        </p>
      </div>
      {canManage && (
        <div className="flex flex-wrap gap-2">
          <a href={`/dashboard/automations/new?account=${c.id}`} className="btn-primary btn-sm">New automation</a>
          <a href={`/dashboard/accounts/${c.id}/welcome`} className="btn-ghost btn-sm">Welcome menu{c.welcomeCount ? ` (${c.welcomeCount})` : ''}</a>
          <a href={reconnect} className={c.needsReconnect ? 'btn-dark btn-sm' : 'btn-ghost btn-sm'}>Reconnect</a>
          <button onClick={disconnect} disabled={busy} className="btn-ghost btn-sm text-bad">Disconnect</button>
        </div>
      )}
    </li>
  );
}
