'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AcceptInvite({ token, workspace, role }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function accept() {
    setBusy(true);
    const res = await fetch(`/api/invites/${token}/accept`, { method: 'POST' });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push('/dashboard'); router.refresh();
  }
  return (
    <>
      <button onClick={accept} disabled={busy} className="btn-primary mt-8 w-full">{busy ? 'Joining…' : `Join ${workspace} as ${role}`}</button>
      {error && <p role="alert" className="mt-3 text-sm text-bad">{error}</p>}
    </>
  );
}
