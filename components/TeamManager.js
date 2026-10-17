'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import StatusBadge from './StatusBadge';
import { useFeedback, Spinner } from './Feedback';

const ROLES = [
  ['OWNER', 'Owner', 'Everything, including billing and deleting the workspace.'],
  ['ADMIN', 'Admin', 'Connects accounts, manages the team and all automations.'],
  ['MEMBER', 'Member', 'Creates and edits automations, sees leads.'],
  ['VIEWER', 'Viewer', 'Sees results and downloads reports. Can’t change anything.'],
];

function Avatar({ name }) {
  return <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-marigold/20 font-display text-sm font-bold text-ink">{(name || '?').trim().charAt(0).toUpperCase()}</span>;
}

export default function TeamManager({ members, invites, myRole, meId, seatsLeft }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [role, setRole] = useState('MEMBER');
  const [email, setEmail] = useState('');
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const isOwner = myRole === 'OWNER';

  async function api(url, method, body) {
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) { toast(data.error || 'Something went wrong.', 'bad'); return null; }
    router.refresh();
    return data;
  }
  async function invite(e) {
    e.preventDefault();
    setBusy(true);
    const data = await api('/api/team/invites', 'POST', { role, email });
    setBusy(false);
    if (!data) return;
    setLink(data.url);
    toast(data.emailed ? `Invite sent to ${email}` : 'Invite link created. Copy it and send it to them.');
    setEmail('');
  }
  const copy = async (url) => { await navigator.clipboard.writeText(url); toast('Invite link copied'); };

  return (
    <div className="space-y-8">
      <section>
        <h2 className="mb-3 font-display text-lg font-bold">Members</h2>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead className="border-b border-line"><tr><th className="th">Person</th><th className="th">Role</th><th className="th">Joined</th><th className="th">Last active</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {members.map((m) => {
                const editable = m.role !== 'OWNER' && m.userId !== meId && (isOwner || m.role !== 'ADMIN');
                return (
                  <tr key={m.id} className="border-b border-line last:border-0">
                    <td className="td">
                      <span className="flex items-center gap-3"><Avatar name={m.name} />
                        <span><span className="font-semibold">{m.name}</span>{m.userId === meId && <span className="text-slate"> (you)</span>}<span className="block text-xs text-slate">{m.email || 'Instagram or Facebook sign-in'}</span></span>
                      </span>
                    </td>
                    <td className="td">
                      {editable ? (
                        <select defaultValue={m.role} onChange={async (e) => { if (await api(`/api/team/members/${m.id}`, 'PATCH', { role: e.target.value })) toast(`${m.name} is now ${e.target.value.toLowerCase()}`); }} className="field w-32 py-1.5" aria-label={`Role for ${m.name}`}>
                          {isOwner && <option value="ADMIN">Admin</option>}<option value="MEMBER">Member</option><option value="VIEWER">Viewer</option>
                        </select>
                      ) : <StatusBadge s={m.role} />}
                    </td>
                    <td className="td whitespace-nowrap text-slate">{m.joined}</td>
                    <td className="td whitespace-nowrap text-slate">{m.lastActive || 'Not yet'}</td>
                    <td className="td text-right">{editable && <button onClick={async () => { if (await confirm({ title: `Remove ${m.name}?`, body: 'They lose access to this workspace right away.', confirmLabel: 'Remove', danger: true }) && await api(`/api/team/members/${m.id}`, 'DELETE')) toast(`${m.name} removed`); }} className="btn-ghost btn-sm text-bad">Remove</button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="font-display text-lg font-bold">Invite a teammate</h2>
        <p className="mt-1 text-sm text-slate">{seatsLeft > 0 ? `We email them a link to join. It works for 7 days. ${seatsLeft} seat${seatsLeft === 1 ? '' : 's'} left on your plan.` : 'All seats on your plan are used. Upgrade on the Billing page to add more people.'}</p>
        <form onSubmit={invite} className="mt-4 grid gap-3 sm:grid-cols-[1fr_160px_auto]">
          <div><label className="label" htmlFor="inv-email">Email</label><input id="inv-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@company.com" className="field" disabled={seatsLeft === 0} /></div>
          <div><label className="label" htmlFor="inv-role">Role</label>
            <select id="inv-role" value={role} onChange={(e) => setRole(e.target.value)} className="field" disabled={seatsLeft === 0}>
              {isOwner && <option value="ADMIN">Admin</option>}<option value="MEMBER">Member</option><option value="VIEWER">Viewer</option>
            </select></div>
          <div className="flex items-end"><button disabled={busy || seatsLeft === 0} className="btn-dark w-full">{busy && <Spinner />}{email ? 'Send invite' : 'Create invite link'}</button></div>
        </form>
        {link && (
          <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-canvas p-3">
            <code className="min-w-0 flex-1 break-all text-sm">{link}</code>
            <button onClick={() => copy(link)} className="btn-ghost btn-sm">Copy link</button>
          </div>
        )}
      </section>

      {invites.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-lg font-bold">Pending invites</h2>
          <div className="card overflow-x-auto">
            <table className="w-full min-w-[600px] text-sm">
              <thead className="border-b border-line"><tr><th className="th">Invited</th><th className="th">Role</th><th className="th">Expires</th><th className="th"><span className="sr-only">Actions</span></th></tr></thead>
              <tbody>
                {invites.map((i) => (
                  <tr key={i.id} className="border-b border-line last:border-0">
                    <td className="td font-semibold">{i.label || 'Invite link'}</td>
                    <td className="td"><StatusBadge s={i.role} /></td>
                    <td className="td text-slate">{i.expires}</td>
                    <td className="td"><span className="flex justify-end gap-2">
                      <button onClick={() => copy(i.url)} className="btn-ghost btn-sm">Copy link</button>
                      <button onClick={async () => { if (await api(`/api/team/invites/${i.id}`, 'DELETE')) toast('Invite cancelled'); }} className="btn-ghost btn-sm text-bad">Cancel</button>
                    </span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 font-display text-lg font-bold">What each role can do</h2>
        <dl className="card divide-y divide-line">
          {ROLES.map(([k, name, what]) => (
            <div key={k} className="grid gap-1 px-5 py-3 text-sm sm:grid-cols-[140px_1fr]"><dt><StatusBadge s={k} /></dt><dd className="text-slate">{what}</dd></div>
          ))}
        </dl>
      </section>
    </div>
  );
}
