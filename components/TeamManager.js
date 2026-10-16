'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import { useFeedback } from './Feedback';

export default function TeamManager({ members, invites, myRole, meId }) {
  const router = useRouter();
  const [role, setRole] = useState('MEMBER');
  const [label, setLabel] = useState('');
  const [link, setLink] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const isOwner = myRole === 'OWNER';
  const { toast, confirm } = useFeedback();

  async function api(url, method, body) {
    setError('');
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { setError(data.error || 'Something went wrong.'); toast(data.error || 'Something went wrong.', 'bad'); return null; }
    router.refresh();
    return data;
  }
  async function createInvite(e) {
    e.preventDefault();
    const data = await api('/api/team/invites', 'POST', { role, label });
    if (data) { setLink(data.url); setLabel(''); setCopied(false); }
  }
  async function copy() { await navigator.clipboard.writeText(link); setCopied(true); toast('Invite link copied'); }

  return (
    <div className="space-y-8">
      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">Invite someone</h2>
        <p className="mt-1 text-sm text-slate">Creates a link valid for 7 days. Send it to them on WhatsApp or email. They sign in, open the link, and join this workspace.</p>
        <form onSubmit={createInvite} className="mt-4 flex flex-wrap gap-2">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Name or email (for your reference)" className="field w-72" aria-label="Who it's for" />
          <select value={role} onChange={(e) => setRole(e.target.value)} className="field w-44" aria-label="Role">
            {isOwner && <option value="ADMIN">Admin</option>}
            <option value="MEMBER">Member</option>
            <option value="VIEWER">Viewer</option>
          </select>
          <button className="btn-dark">Create invite link</button>
        </form>
        {link && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-canvas p-3">
            <code className="min-w-0 flex-1 break-all text-sm">{link}</code>
            <button onClick={copy} className="btn-ghost btn-sm">{copied ? 'Copied' : 'Copy link'}</button>
          </div>
        )}
        <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-3">
          <div><dt className="font-semibold">Admin</dt><dd className="text-slate">Connects accounts, manages the team and automations.</dd></div>
          <div><dt className="font-semibold">Member</dt><dd className="text-slate">Creates and edits automations.</dd></div>
          <div><dt className="font-semibold">Viewer</dt><dd className="text-slate">Sees results and downloads reports.</dd></div>
        </dl>
      </section>

      {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Members</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Name</th><th className="th">Role</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {members.map((m) => {
                const editable = m.role !== 'OWNER' && m.userId !== meId && (isOwner || m.role !== 'ADMIN');
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="td"><span className="font-semibold">{m.name}</span>{m.userId === meId && <span className="text-slate"> (you)</span>}<span className="block text-xs text-slate">{m.email || 'Social sign-in'}</span></td>
                    <td className="td">
                      {editable ? (
                        <select defaultValue={m.role} onChange={async (e) => { if (await api(`/api/team/members/${m.id}`, 'PATCH', { role: e.target.value })) toast(`${m.name} is now ${e.target.value.toLowerCase()}`); }} className="field w-36 py-1.5" aria-label={`Role for ${m.name}`}>
                          {isOwner && <option value="ADMIN">Admin</option>}<option value="MEMBER">Member</option><option value="VIEWER">Viewer</option>
                        </select>
                      ) : <StatusBadge s={m.role} />}
                    </td>
                    <td className="td text-right">{editable && <button onClick={async () => { if (await confirm({ title: `Remove ${m.name}?`, body: 'They lose access to this workspace right away.', confirmLabel: 'Remove', danger: true }) && await api(`/api/team/members/${m.id}`, 'DELETE')) toast(`${m.name} removed`); }} className="btn-ghost btn-sm text-bad">Remove</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Pending invites</h2>
          <ul className="card divide-y divide-line">
            {invites.map((i) => (
              <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-sm">
                <span><span className="font-semibold">{i.label || 'Unnamed invite'}</span> · <StatusBadge s={i.role} /> <span className="text-slate">· expires {i.expires}</span></span>
                <button onClick={async () => { if (await api(`/api/team/invites/${i.id}`, 'DELETE')) toast('Invite revoked'); }} className="btn-ghost btn-sm">Revoke</button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
