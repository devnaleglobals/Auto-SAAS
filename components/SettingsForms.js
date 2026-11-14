'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

async function send(url, method, body) {
  const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  return [res.ok, data];
}

export function Section({ id, title, description, children, tone }) {
  return (
    <section id={id} className={`card scroll-mt-8 p-6 ${tone === 'danger' ? 'border-bad/30' : ''}`}>
      <h2 className={`font-display text-lg font-bold ${tone === 'danger' ? 'text-bad' : ''}`}>{title}</h2>
      {description && <p className="mt-1 text-sm text-slate">{description}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function ProfileForm({ name, email, role }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState(name);
  const [busy, setBusy] = useState(false);
  async function save(e) {
    e.preventDefault(); setBusy(true);
    const [ok, d] = await send('/api/profile', 'PATCH', { name: v });
    setBusy(false); toast(ok ? 'Profile saved' : d.error, ok ? 'ok' : 'bad'); if (ok) router.refresh();
  }
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
      <div><label className="label" htmlFor="pf-name">Your name</label><input id="pf-name" className="field" value={v} onChange={(e) => setV(e.target.value)} maxLength={60} required /></div>
      <div><label className="label" htmlFor="pf-email">Sign-in</label><input id="pf-email" className="field" value={email || 'Instagram or Facebook'} disabled /></div>
      <div><p className="label">Role in this workspace</p><p className="text-sm capitalize">{role}</p></div>
      <div className="flex items-end sm:justify-end"><button disabled={busy || v.trim() === name} className="btn-dark">{busy && <Spinner />}Save profile</button></div>
    </form>
  );
}

export function PasswordForm({ hasPassword }) {
  const { toast } = useFeedback();
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  if (!hasPassword) return <p className="text-sm text-slate">You sign in with Instagram or Facebook, so your password is managed there.</p>;
  async function save(e) {
    e.preventDefault();
    if (v.next !== v.confirm) return toast('The new passwords don’t match.', 'bad');
    setBusy(true);
    const [ok, d] = await send('/api/profile/password', 'POST', { current: v.current, next: v.next });
    setBusy(false); toast(ok ? 'Password changed' : d.error, ok ? 'ok' : 'bad');
    if (ok) setV({ current: '', next: '', confirm: '' });
  }
  return (
    <form onSubmit={save} className="grid gap-4 sm:grid-cols-3">
      <div><label className="label" htmlFor="pw-cur">Current password</label><input id="pw-cur" type="password" autoComplete="current-password" className="field" value={v.current} onChange={(e) => setV({ ...v, current: e.target.value })} required /></div>
      <div><label className="label" htmlFor="pw-new">New password</label><input id="pw-new" type="password" autoComplete="new-password" minLength={8} className="field" value={v.next} onChange={(e) => setV({ ...v, next: e.target.value })} required /></div>
      <div><label className="label" htmlFor="pw-conf">Confirm new password</label><input id="pw-conf" type="password" autoComplete="new-password" minLength={8} className="field" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} required /></div>
      <div className="sm:col-span-3 flex justify-end"><button disabled={busy} className="btn-dark">{busy && <Spinner />}Change password</button></div>
    </form>
  );
}

function Toggle({ id, checked, onChange, label, hint }) {
  return (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-3">
      <span><span className="block text-sm font-semibold">{label}</span><span className="text-sm text-slate">{hint}</span></span>
      <span className="relative mt-0.5 inline-flex shrink-0">
        <input id={id} type="checkbox" className="peer sr-only" checked={checked} onChange={(e) => onChange(e.target.checked)} />
        <span className="h-6 w-11 rounded-full bg-line transition-colors peer-checked:bg-ok peer-focus-visible:ring-2 peer-focus-visible:ring-marigold" />
        <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
      </span>
    </label>
  );
}

export function NotificationsForm({ initial, hasEmail }) {
  const { toast } = useFeedback();
  const [v, setV] = useState(initial);
  async function update(next) {
    setV(next);
    const [ok, d] = await send('/api/profile/notifications', 'PATCH', next);
    toast(ok ? 'Notification settings saved' : d.error, ok ? 'ok' : 'bad');
  }
  if (!hasEmail) return <p className="text-sm text-slate">Email notifications need an email sign-in. Your account uses Instagram or Facebook.</p>;
  return (
    <div className="divide-y divide-line">
      <Toggle id="n-rec" checked={v.notifyReconnect} onChange={(c) => update({ ...v, notifyReconnect: c })} label="Connection problems" hint="When an Instagram account or Facebook Page stops working and needs reconnecting." />
      <Toggle id="n-bill" checked={v.notifyBilling} onChange={(c) => update({ ...v, notifyBilling: c })} label="Billing" hint="Failed payments and plan cancellations." />
    </div>
  );
}

export function DeleteWorkspace({ name }) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [v, setV] = useState('');
  const [busy, setBusy] = useState(false);
  async function del(e) {
    e.preventDefault(); setBusy(true);
    const [ok, d] = await send('/api/workspace', 'DELETE', { confirmName: v });
    setBusy(false);
    if (!ok) return toast(d.error, 'bad');
    toast('Workspace deleted');
    router.push('/dashboard'); router.refresh();
  }
  return (
    <form onSubmit={del} className="space-y-3">
      <p className="text-sm">This permanently deletes <strong>{name}</strong> with its connected accounts, automations, conversations, leads and history. It can’t be undone.</p>
      <label className="label" htmlFor="del-ws">Type <strong>{name}</strong> to confirm</label>
      <div className="flex flex-wrap gap-2">
        <input id="del-ws" className="field max-w-sm" value={v} onChange={(e) => setV(e.target.value)} autoComplete="off" />
        <button disabled={busy || v.trim() !== name} className="btn-danger">{busy && <Spinner />}Delete workspace</button>
      </div>
    </form>
  );
}

// Download a copy of your data, sign out other devices, or delete your account.
export function PrivacyData({ hasPassword, ownsWorkspaces }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [v, setV] = useState({ confirm: '', password: '' });

  async function logoutAll() {
    const ok = await confirm({ title: 'Log out of all other devices?', body: 'Everyone signed in to your account on another browser or phone is signed out. You stay signed in here.', confirmLabel: 'Log out others' });
    if (!ok) return;
    setBusy('sessions');
    const [res, d] = await send('/api/profile/sessions', 'POST', {});
    setBusy('');
    toast(res ? 'Other devices are signed out' : d.error, res ? 'ok' : 'bad');
  }

  async function del(e) {
    e.preventDefault();
    setBusy('delete');
    const [ok, d] = await send('/api/profile', 'DELETE', v);
    setBusy('');
    if (!ok) return toast(d.error, 'bad');
    router.push('/'); router.refresh();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm font-semibold">Download your data</p><p className="text-sm text-slate">Your profile, workspaces you own, automations and payments, as a JSON file.</p></div>
        <a href="/api/profile/export" className="btn-ghost">Download</a>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-6">
        <div><p className="text-sm font-semibold">Signed-in devices</p><p className="text-sm text-slate">Sign out everywhere else, for example after using a shared computer.</p></div>
        <button onClick={logoutAll} disabled={busy === 'sessions'} className="btn-ghost">{busy === 'sessions' && <Spinner />}Log out other devices</button>
      </div>
      <form onSubmit={del} className="space-y-3 border-t border-line pt-6">
        <p className="text-sm font-semibold text-bad">Delete your account</p>
        <p className="text-sm">
          This permanently deletes your ReplyRelay account{ownsWorkspaces ? ', every workspace you own (with its connected accounts, automations, conversations, leads and history), and cancels paid plans on those workspaces right away' : ''}. Workspaces you were invited to stay with their owners. It can’t be undone.
        </p>
        <div className="flex flex-wrap gap-2">
          <input aria-label="Type DELETE to confirm" placeholder="Type DELETE" className="field max-w-[160px]" value={v.confirm} onChange={(e) => setV({ ...v, confirm: e.target.value })} autoComplete="off" />
          {hasPassword && <input aria-label="Your password" type="password" placeholder="Your password" autoComplete="current-password" className="field max-w-[200px]" value={v.password} onChange={(e) => setV({ ...v, password: e.target.value })} />}
          <button disabled={busy === 'delete' || v.confirm.trim().toUpperCase() !== 'DELETE' || (hasPassword && !v.password)} className="btn-danger">{busy === 'delete' && <Spinner />}Delete my account</button>
        </div>
      </form>
    </div>
  );
}
