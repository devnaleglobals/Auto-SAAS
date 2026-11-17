'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

// Per-user admin menu: edit, send reset link, sign out, disable/enable, delete.
export default function AdminUserActions({ user, canDelete }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [open, setOpen] = useState(false);
  const [edit, setEdit] = useState(null);
  const [busy, setBusy] = useState('');
  async function call(action, body = {}, okMsg, method = 'PATCH') {
    setBusy(action);
    const res = await fetch(`/api/admin/users/${user.id}`, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(method === 'PATCH' ? { action, ...body } : body) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    toast(res.ok ? okMsg : d.error || 'That didn’t work.', res.ok ? 'ok' : 'bad');
    if (res.ok) { setOpen(false); setEdit(null); router.refresh(); }
  }
  if (edit) return (
    <form className="flex min-w-[260px] flex-col gap-2" onSubmit={(e) => { e.preventDefault(); call('edit', edit, 'User updated'); }}>
      <input className="field py-1.5" value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} aria-label="Name" />
      {user.email && <input className="field py-1.5" type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} aria-label="Email" />}
      <span className="flex gap-2"><button className="btn-dark btn-sm" disabled={!!busy}>{busy === 'edit' && <Spinner />}Save</button><button type="button" className="btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancel</button></span>
    </form>
  );
  return (
    <div className="relative flex justify-end">
      <button className="btn-ghost btn-sm" onClick={() => setOpen(!open)} aria-expanded={open}>Manage</button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-56 rounded-xl border border-line bg-surface py-1 text-sm shadow-pop" role="menu">
          <button role="menuitem" className="block w-full px-4 py-2 text-left hover:bg-canvas" onClick={() => setEdit({ name: user.name, email: user.email || '' })}>Edit name / email</button>
          {user.hasPassword && <button role="menuitem" className="block w-full px-4 py-2 text-left hover:bg-canvas" onClick={() => call('sendReset', {}, 'Password reset email sent')}>Send password reset email</button>}
          <button role="menuitem" className="block w-full px-4 py-2 text-left hover:bg-canvas" onClick={() => call('signout', {}, 'Signed out of all devices')}>Sign out of all devices</button>
          {user.disabled
            ? <button role="menuitem" className="block w-full px-4 py-2 text-left hover:bg-canvas" onClick={() => call('enable', {}, 'User enabled')}>Enable account</button>
            : <button role="menuitem" className="block w-full px-4 py-2 text-left text-bad hover:bg-canvas" onClick={async () => { if (await confirm({ title: `Disable ${user.name}?`, body: 'They are signed out and can’t sign in until you enable them again. Their workspaces keep running.', confirmLabel: 'Disable', danger: true })) call('disable', {}, 'User disabled'); }}>Disable account</button>}
          {canDelete && <button role="menuitem" className="block w-full px-4 py-2 text-left text-bad hover:bg-canvas" onClick={async () => { if (await confirm({ title: `Delete ${user.name} permanently?`, body: 'Deletes the user and every workspace they own, and cancels those subscriptions. This can’t be undone.', confirmLabel: 'Delete user', danger: true })) call('delete', { confirm: 'DELETE' }, 'User deleted', 'DELETE'); }}>Delete user</button>}
        </div>
      )}
    </div>
  );
}
