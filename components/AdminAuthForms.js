'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Spinner } from './Feedback';

async function post(url, body) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  return [res.ok, await res.json().catch(() => ({}))];
}

function Shell({ title, sub, children }) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-navy px-5 py-12">
      <div className="w-full max-w-sm">
        <p className="flex items-center gap-2 font-display text-lg font-bold text-white">ReplyRelay <span className="rounded-md bg-marigold px-1.5 py-0.5 text-xs font-bold text-navy">Admin console</span></p>
        <div className="mt-6 rounded-2xl bg-surface p-7 shadow-lift">
          <h1 className="font-display text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-slate">{sub}</p>
          {children}
        </div>
        <p className="mt-6 text-center text-xs text-white/50">For platform staff only. Clients sign in at <a href="/login" className="underline">/login</a>.</p>
      </div>
    </main>
  );
}

export function AdminLoginForm() {
  const router = useRouter();
  const [step, setStep] = useState('password');
  const [ticket, setTicket] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    setBusy(true); setError('');
    const [ok, d] = step === 'password' ? await post('/api/admin/auth/login', f) : await post('/api/admin/auth/verify', { ticket, code: f.code });
    setBusy(false);
    if (!ok) return setError(d.error || 'Sign-in failed.');
    if (d.needs2fa) { setTicket(d.ticket); setStep('code'); return; }
    router.push('/admin'); router.refresh();
  }

  return (
    <Shell title={step === 'password' ? 'Admin sign in' : '2-step verification'} sub={step === 'password' ? 'Use your admin account, not a client account.' : 'Enter the 6-digit code from your authenticator app.'}>
      <form onSubmit={submit} className="mt-6 space-y-4">
        {step === 'password' ? (
          <>
            <div><label className="label" htmlFor="a-email">Email</label><input id="a-email" name="email" type="email" autoComplete="username" required className="field" /></div>
            <div><label className="label" htmlFor="a-pw">Password</label><input id="a-pw" name="password" type="password" autoComplete="current-password" required className="field" /></div>
          </>
        ) : (
          <div><label className="label" htmlFor="a-code">Code</label><input id="a-code" name="code" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]{6,7}" maxLength={7} required autoFocus className="field text-center font-mono text-xl tracking-[0.4em]" /></div>
        )}
        {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}
        <button disabled={busy} className="btn-dark w-full">{busy && <Spinner />}{step === 'password' ? 'Continue' : 'Verify and sign in'}</button>
        {step === 'code' && <button type="button" onClick={() => { setStep('password'); setError(''); }} className="btn-ghost w-full">Start again</button>}
      </form>
    </Shell>
  );
}

export function AdminSetupForm({ tokenConfigured }) {
  const router = useRouter();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.currentTarget));
    if (f.password !== f.confirm) return setError('The passwords don’t match.');
    setBusy(true); setError('');
    const [ok, d] = await post('/api/admin/auth/setup', f);
    setBusy(false);
    if (!ok) return setError(d.error || 'Setup failed.');
    router.push('/admin/settings/security'); router.refresh();
  }
  return (
    <Shell title="Create the first admin" sub="This works once. You become the Owner and can add other admins later.">
      {!tokenConfigured ? (
        <p className="mt-6 rounded-lg bg-marigold/10 p-4 text-sm">Add <code>ADMIN_SETUP_TOKEN</code> (a random value, at least 16 characters) in Vercel → Environment Variables, redeploy, then reload this page.</p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <div><label className="label" htmlFor="s-token">Setup token</label><input id="s-token" name="token" type="password" required className="field" autoComplete="off" /><p className="hint">The ADMIN_SETUP_TOKEN value from Vercel.</p></div>
          <div><label className="label" htmlFor="s-name">Your name</label><input id="s-name" name="name" required className="field" /></div>
          <div><label className="label" htmlFor="s-email">Admin email</label><input id="s-email" name="email" type="email" required className="field" autoComplete="username" /></div>
          <div><label className="label" htmlFor="s-pw">Password</label><input id="s-pw" name="password" type="password" minLength={10} required className="field" autoComplete="new-password" /><p className="hint">At least 10 characters with upper and lower case letters and a number.</p></div>
          <div><label className="label" htmlFor="s-pw2">Confirm password</label><input id="s-pw2" name="confirm" type="password" minLength={10} required className="field" autoComplete="new-password" /></div>
          {error && <p role="alert" className="text-sm font-medium text-bad">{error}</p>}
          <button disabled={busy} className="btn-dark w-full">{busy && <Spinner />}Create owner account</button>
        </form>
      )}
    </Shell>
  );
}
