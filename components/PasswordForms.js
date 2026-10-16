'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Spinner } from './Feedback';

function Shell({ title, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl font-bold">ReplyRelay</Link>
        <h1 className="mt-8 font-display text-3xl font-bold">{title}</h1>
        {children}
      </div>
    </main>
  );
}

export function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault(); setBusy(true);
    await fetch('/api/auth/forgot', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: new FormData(e.currentTarget).get('email') }) });
    setBusy(false); setSent(true);
  }
  return (
    <Shell title="Reset your password">
      {sent ? (
        <p className="mt-4 animate-fade-in text-slate">If that email has a ReplyRelay password, a reset link is on its way. Check your inbox and spam folder. The link works for one hour.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <p className="text-slate">Enter the email you signed up with. Accounts that sign in with Instagram or Facebook don’t have a password.</p>
          <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
          <button disabled={busy} className="btn-dark w-full">{busy && <Spinner />}Send reset link</button>
        </form>
      )}
      <p className="mt-8 text-sm"><Link href="/login" className="font-semibold underline">Back to log in</Link></p>
    </Shell>
  );
}

export function ResetForm({ token }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setBusy(true); setError('');
    const res = await fetch('/api/auth/reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ token, password: new FormData(e.currentTarget).get('password') }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok) return setError(data.error || 'Something went wrong.');
    router.push('/dashboard'); router.refresh();
  }
  return (
    <Shell title="Choose a new password">
      <form onSubmit={submit} className="mt-6 space-y-4">
        <div><label className="label" htmlFor="password">New password</label><input id="password" name="password" type="password" minLength={8} required className="field" /><p className="hint">At least 8 characters.</p></div>
        {error && <p role="alert" className="text-sm text-bad">{error} {error.includes('expired') && <Link href="/forgot-password" className="underline">Get a new link</Link>}</p>}
        <button disabled={busy} className="btn-dark w-full">{busy && <Spinner />}Save and log in</button>
      </form>
    </Shell>
  );
}
