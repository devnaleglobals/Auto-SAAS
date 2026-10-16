'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFeedback } from './Feedback';

export default function WorkspaceSettings({ name, canEdit }) {
  const router = useRouter();
  const [value, setValue] = useState(name);
  const { toast } = useFeedback();
  async function save(e) {
    e.preventDefault();
    const res = await fetch('/api/workspace', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: value }) });
    const data = await res.json();
    toast(res.ok ? 'Workspace renamed' : data.error, res.ok ? 'ok' : 'bad');
    router.refresh();
  }
  return (
    <form onSubmit={save} className="card p-6">
      <label className="label" htmlFor="wsname">Workspace name</label>
      <div className="flex flex-wrap gap-2">
        <input id="wsname" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit} className="field max-w-sm" />
        {canEdit && <button className="btn-dark">Rename workspace</button>}
      </div>
      {!canEdit && <p className="hint">Only the workspace owner can rename it.</p>}
    </form>
  );
}
