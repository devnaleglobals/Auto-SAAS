'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

function useUserAction(userId) {
  const router = useRouter();
  const { toast } = useFeedback();
  const [busy, setBusy] = useState('');
  async function run(key, body, okMsg, method = 'PATCH') {
    setBusy(key);
    const res = await fetch(`/api/admin/users/${userId}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    toast(res.ok ? okMsg : d.error || 'That didn’t work.', res.ok ? 'ok' : 'bad');
    if (res.ok) router.refresh();
    return res.ok;
  }
  return { busy, run };
}

const Card = ({ title, tone, children }) => <section className={`card p-5 ${tone === 'bad' ? 'border-bad/30' : ''}`}><h2 className={`font-display text-lg font-bold ${tone === 'bad' ? 'text-bad' : ''}`}>{title}</h2><div className="mt-4">{children}</div></section>;

// Right column of the admin user page: details, password and sign-in, account status, delete.
export default function AdminUserManager({ user, canDelete }) {
  const router = useRouter();
  const { confirm } = useFeedback();
  const { busy, run } = useUserAction(user.id);
  const [d, setD] = useState({ name: user.name, email: user.email });
  const [pw, setPw] = useState('');
  return (
    <div className="space-y-5">
      <Card title="User details">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); run('edit', { action: 'edit', ...d }, 'User details saved'); }}>
          <div><label className="label" htmlFor="ud-name">Name</label><input id="ud-name" className="field" value={d.name} onChange={(e) => setD({ ...d, name: e.target.value })} required /></div>
          <div><label className="label" htmlFor="ud-email">Email (sign-in and notifications)</label><input id="ud-email" type="email" className="field" value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} placeholder="Add an email" /><p className="hint">Changing it changes the address they sign in with.</p></div>
          <button className="btn-dark" disabled={!!busy}>{busy === 'edit' && <Spinner />}Save details</button>
        </form>
      </Card>

      <Card title="Password and sign-in">
        <div className="space-y-4">
          {user.email && <div>
            <p className="text-sm text-slate">Email the user a link to choose a new password (works for one hour). Safest option.</p>
            <button className="btn-ghost mt-2" disabled={!!busy} onClick={() => run('reset', { action: 'sendReset' }, `Reset link sent to ${user.email}`)}>{busy === 'reset' && <Spinner />}Send password reset email</button>
          </div>}
          {user.email && <form className="border-t border-line pt-4" onSubmit={async (e) => { e.preventDefault(); if (await confirm({ title: 'Set a new password?', body: 'The user is signed out everywhere and must use this password. Share it with them privately (phone or in person), never by email.', confirmLabel: 'Set password' })) { if (await run('pw', { action: 'setPassword', password: pw }, 'Password set. User signed out everywhere.')) setPw(''); } }}>
            <label className="label" htmlFor="ud-pw">Set a temporary password</label>
            <div className="flex gap-2"><input id="ud-pw" className="field font-mono" autoComplete="off" minLength={8} value={pw} onChange={(e) => setPw(e.target.value)} placeholder="At least 8 characters" required /><button className="btn-dark shrink-0" disabled={!!busy}>{busy === 'pw' && <Spinner />}Set</button></div>
            <p className="hint">{user.hasPassword ? 'Replaces their current password.' : 'Gives this Instagram/Facebook user an email + password sign-in too.'}</p>
          </form>}
          <div className="border-t border-line pt-4">
            <p className="text-sm text-slate">Signs the user out on every phone and browser.</p>
            <button className="btn-ghost mt-2" disabled={!!busy} onClick={() => run('signout', { action: 'signout' }, 'Signed out of all devices')}>{busy === 'signout' && <Spinner />}Sign out of all devices</button>
          </div>
        </div>
      </Card>

      <Card title={user.disabled ? 'Account disabled' : 'Account status'}>
        <p className="text-sm text-slate">{user.disabled ? 'The user can’t sign in. Their workspaces keep running.' : 'Disabling blocks sign-in immediately; their workspaces keep running.'}</p>
        {user.disabled
          ? <button className="btn-primary mt-3" disabled={!!busy} onClick={() => run('enable', { action: 'enable' }, 'Account enabled')}>Enable account</button>
          : <button className="btn-danger mt-3" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Disable ${user.name}?`, body: 'They are signed out and can’t sign in until you enable them again.', confirmLabel: 'Disable', danger: true })) run('disable', { action: 'disable' }, 'Account disabled'); }}>Disable account</button>}
      </Card>

      {canDelete && <Card title="Delete user" tone="bad">
        <p className="text-sm text-slate">Deletes this user and every workspace they own (with its accounts, automations and leads) and cancels those subscriptions. Can’t be undone.</p>
        <button className="btn-danger mt-3" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Delete ${user.name} permanently?`, body: 'This can’t be undone.', confirmLabel: 'Delete user', danger: true })) { if (await run('delete', { confirm: 'DELETE' }, 'User deleted', 'DELETE')) router.push('/admin/users'); } }}>Delete user</button>
      </Card>}
    </div>
  );
}

// The user's workspaces: change role, make owner, remove, or add them to another client.
export function UserMemberships({ userId, memberships, otherWorkspaces, canEdit }) {
  const { confirm } = useFeedback();
  const { busy, run } = useUserAction(userId);
  const [add, setAdd] = useState({ workspaceId: '', role: 'MEMBER', force: false });
  return (
    <div className="space-y-3">
      {memberships.length === 0 ? <p className="card border-dashed p-5 text-sm text-slate">Not a member of any client.</p> : (
        <ul className="card divide-y divide-line text-sm">
          {memberships.map((m) => (
            <li key={m.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
              <span><Link href={`/admin/workspaces/${m.workspaceId}`} className="font-semibold hover:underline">{m.name}</Link><span className="block text-xs text-slate">{m.plan}{m.suspended ? ' · suspended' : ''}</span></span>
              {canEdit ? (
                <span className="flex flex-wrap items-center gap-2">
                  {m.role === 'OWNER' ? <span className="rounded-full bg-navy px-2.5 py-0.5 text-xs font-semibold text-white">Owner</span> : (
                    <>
                      <select className="field w-auto py-1.5 text-sm" value={m.role} disabled={!!busy} onChange={(e) => run(`r${m.id}`, { action: 'role', workspaceId: m.workspaceId, role: e.target.value }, 'Role changed')} aria-label="Role">
                        <option value="ADMIN">Admin</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option>
                      </select>
                      <button className="btn-ghost btn-sm" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Make owner of ${m.name}?`, body: 'The current owner becomes an admin. The owner controls billing and can delete the workspace.', confirmLabel: 'Make owner' })) run(`o${m.id}`, { action: 'makeOwner', workspaceId: m.workspaceId }, 'Ownership transferred'); }}>Make owner</button>
                    </>
                  )}
                  <button className="btn-ghost btn-sm text-bad" disabled={!!busy} onClick={async () => { if (await confirm({ title: `Remove from ${m.name}?`, body: 'They lose access to this client. Their account stays.', confirmLabel: 'Remove', danger: true })) run(`x${m.id}`, { action: 'removeFromWorkspace', workspaceId: m.workspaceId }, 'Removed from client'); }}>Remove</button>
                </span>
              ) : <span className="text-xs font-semibold">{m.role.toLowerCase()}</span>}
            </li>
          ))}
        </ul>
      )}
      {canEdit && otherWorkspaces.length > 0 && (
        <form className="card flex flex-wrap items-end gap-2 p-4" onSubmit={(e) => { e.preventDefault(); run('add', { action: 'addToWorkspace', ...add }, 'Added to client'); }}>
          <div className="min-w-[200px] flex-1"><label className="label" htmlFor="am-ws">Add to another client</label><select id="am-ws" className="field" value={add.workspaceId} onChange={(e) => setAdd({ ...add, workspaceId: e.target.value })} required><option value="">Choose a client…</option>{otherWorkspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div><label className="label" htmlFor="am-role">Role</label><select id="am-role" className="field" value={add.role} onChange={(e) => setAdd({ ...add, role: e.target.value })}><option value="ADMIN">Admin</option><option value="MEMBER">Member</option><option value="VIEWER">Viewer</option></select></div>
          <label className="flex items-center gap-1.5 pb-2.5 text-xs text-slate"><input type="checkbox" checked={add.force} onChange={(e) => setAdd({ ...add, force: e.target.checked })} /> ignore team limit</label>
          <button className="btn-dark" disabled={!!busy}>{busy === 'add' && <Spinner />}Add</button>
        </form>
      )}
    </div>
  );
}
