'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

const fmt = (d) => (d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : 'never');

// Team of one client, managed by a platform admin. With a single user it shows that person as the account holder.
export default function AdminClientTeam({ workspaceId, members, canEdit }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [busy, setBusy] = useState('');
  const [add, setAdd] = useState({ email: '', role: 'MEMBER' });
  async function call(key, url, body, okMsg) {
    setBusy(key);
    const res = await fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    toast(res.ok ? okMsg : d.error || 'That didn’t work.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
    return res.ok;
  }
  const userAct = (m, body, okMsg) => call(`${m.userId}${body.action}`, `/api/admin/users/${m.userId}`, { workspaceId, ...body }, okMsg);
  const single = members.length === 1 ? members[0] : null;

  return (
    <div className="space-y-3">
      {single && (
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate">Account holder</p>
          <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-lg font-semibold">{single.name}{single.disabled && <span className="ml-2 rounded bg-bad/10 px-1.5 text-xs text-bad">Disabled</span>}</p>
              <p className="text-sm text-slate">{single.email || 'No email (Instagram/Facebook sign-in)'}</p>
              <p className="mt-1 text-xs text-slate">Signs in with {single.signIn} · last login {fmt(single.lastLoginAt)}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              {canEdit && single.email && single.hasPassword && <button className="btn-ghost btn-sm" disabled={!!busy} onClick={() => userAct(single, { action: 'sendReset' }, `Reset link sent to ${single.email}`)}>{busy === `${single.userId}sendReset` && <Spinner />}Send password reset</button>}
              <Link href={`/admin/users/${single.userId}`} className="btn-dark btn-sm">Manage user</Link>
            </div>
          </div>
        </div>
      )}
      {!single && (
        <ul className="card divide-y divide-line text-sm">
          {members.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span className="min-w-0">
                <Link href={`/admin/users/${m.userId}`} className="font-semibold hover:underline">{m.name}</Link>{m.disabled && <span className="ml-2 rounded bg-bad/10 px-1.5 text-xs text-bad">Disabled</span>}
                <span className="block text-xs text-slate">{m.email || 'Social sign-in'} · last login {fmt(m.lastLoginAt)}</span>
              </span>
              <span className="flex flex-wrap items-center gap-2">
                {m.role === 'OWNER' ? <span className="rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-white">Owner</span> : canEdit ? (
                  <>
                    <select className="field w-auto py-1.5 text-sm" value={m.role} disabled={!!busy} aria-label={`Role of ${m.name}`} onChange={(e) => userAct(m, { action: 'role', role: e.target.value }, 'Role changed')}>
                      <option value="ADMIN">Admin</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option>
                    </select>
                    <button className="btn-ghost btn-sm" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Make ${m.name} the owner?`, body: 'The current owner becomes an admin. The owner controls billing.', confirmLabel: 'Make owner' })) userAct(m, { action: 'makeOwner' }, 'Ownership transferred'); }}>Make owner</button>
                    <button className="btn-ghost btn-sm text-bad" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Remove ${m.name} from this client?`, body: 'Their account stays; they lose access to this workspace.', confirmLabel: 'Remove', danger: true })) userAct(m, { action: 'removeFromWorkspace' }, 'Removed'); }}>Remove</button>
                  </>
                ) : <span className="text-xs">{m.role.toLowerCase()}</span>}
              </span>
            </li>
          ))}
        </ul>
      )}
      {canEdit && (
        <form className="card flex flex-wrap items-end gap-2 p-4" onSubmit={async (e) => { e.preventDefault(); if (await call('add', `/api/admin/workspaces/${workspaceId}`, { action: 'addMember', ...add }, 'Member added')) setAdd({ email: '', role: 'MEMBER' }); }}>
          <div className="min-w-[220px] flex-1"><label className="label" htmlFor="ct-email">Add an existing user by email</label><input id="ct-email" type="email" className="field" value={add.email} onChange={(e) => setAdd({ ...add, email: e.target.value })} required /></div>
          <div><label className="label" htmlFor="ct-role">Role</label><select id="ct-role" className="field" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option><option value="OWNER">Owner (transfer)</option></select></div>
          <button className="btn-dark" disabled={!!busy}>{busy === 'add' && <Spinner />}Add</button>
        </form>
      )}
    </div>
  );
}
