'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback, Spinner } from './Feedback';

// Emergency switch for all of a client's automations (e.g. spam, Meta warning, broken account).
export default function AdminClientAutomations({ workspaceId, running, pausedBySupport }) {
  const router = useRouter();
  const { toast, confirm } = useFeedback();
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState('');
  async function run(action) {
    if (action === 'pauseAll' && !(await confirm({ title: `Pause all ${running} running automations?`, body: 'Nothing will be sent for this client until they (or you) resume. The client is emailed with your reason.', confirmLabel: 'Pause all', danger: true }))) return;
    setBusy(action);
    const res = await fetch(`/api/admin/workspaces/${workspaceId}/automations`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action, reason }) });
    const d = await res.json().catch(() => ({}));
    setBusy('');
    if (!res.ok) return toast(d.error || 'That didn’t work.', 'bad');
    toast(`${action === 'pauseAll' ? 'Paused' : 'Resumed'} ${d.count} automation${d.count === 1 ? '' : 's'}. The client has been told.`);
    setReason(''); router.refresh();
  }
  if (!running && !pausedBySupport) return null;
  return (
    <div className="card mb-3 flex flex-wrap items-end gap-2 p-4">
      <div className="min-w-[220px] flex-1">
        <label className="label" htmlFor="ca-reason">Reason (the client sees this)</label>
        <input id="ca-reason" className="field" maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Meta flagged the account for spam" />
      </div>
      {running > 0 && <button className="btn-ghost text-bad" disabled={!!busy || reason.trim().length < 5} onClick={() => run('pauseAll')}>{busy === 'pauseAll' && <Spinner />}Pause all ({running})</button>}
      {pausedBySupport > 0 && <button className="btn-dark" disabled={!!busy || reason.trim().length < 5} onClick={() => run('resumeAll')}>{busy === 'resumeAll' && <Spinner />}Resume the {pausedBySupport} we paused</button>}
    </div>
  );
}
