'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import PlatformIcon from './PlatformIcon';
import ChatDemo from './ChatDemo';
import { Spinner } from './Feedback';

const loginErrors = {
  denied: 'Sign-in was cancelled. Try again and select Allow.',
  state: 'The sign-in link expired. Try again.',
  personal: 'This is a personal Instagram account. Switch it to Business or Creator in Instagram settings, then try again.',
  nopages: "No Facebook Pages were shared. Try again and select at least one Page.",
  taken: 'This account is already connected to another workspace.',
  error: 'Sign-in failed.',
};

export default function AuthForm({ mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const signup = mode === 'signup';
  const socialError = loginErrors[params.get('connect')];
  const nextParam = params.get('next');
  const q = nextParam ? `?next=${encodeURIComponent(nextParam)}` : '';

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    const body = Object.fromEntries(new FormData(e.currentTarget));
    const res = await fetch(`/api/auth/${mode}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    setBusy(false);
    if (!res.ok) return setError(data.error);
    router.push(params.get('next') || '/dashboard');
    router.refresh();
  }

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-sm">
        <Link href="/" className="font-display text-xl font-bold">ReplyRelay</Link>
        <h1 className="mt-8 font-display text-3xl font-bold">{signup ? 'Start automating your comments' : 'Welcome back'}</h1>
        <p className="mt-2 text-slate">{signup ? 'Sign up with the account you want to automate.' : 'Sign in the same way you signed up.'}</p>

        {socialError && <p role="alert" className="mt-6 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">{socialError} {params.get('reason') && <span className="opacity-80">({params.get('reason')})</span>}</p>}

        <div className="mt-8 space-y-3">
          <a href={`/api/instagram/connect${q}`} className="btn-dark w-full"><PlatformIcon platform="INSTAGRAM" className="h-5 w-5" /> Continue with Instagram</a>
          <a href={`/api/facebook/connect${q}`} className="btn-ghost w-full"><PlatformIcon platform="FACEBOOK" className="h-5 w-5" /> Continue with Facebook</a>
        </div>

        {!showEmail ? (
          <button type="button" onClick={() => setShowEmail(true)} className="mt-6 w-full rounded-lg py-2 text-sm font-semibold text-slate transition-colors hover:bg-white hover:text-ink">
            {signup ? 'Sign up with email instead' : 'Log in with email instead'}
          </button>
        ) : (
          <form onSubmit={submit} className="mt-8 animate-fade-in border-t border-line pt-6">
            <div className="space-y-4">
              {signup && (<div><label className="label" htmlFor="name">Your name</label><input id="name" name="name" required className="field" /></div>)}
              {signup && (<div><label className="label" htmlFor="company">Company or agency (optional)</label><input id="company" name="company" className="field" /></div>)}
              <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
              <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required className="field" />{signup ? <p className="hint">At least 8 characters.</p> : <p className="hint"><Link href="/forgot-password" className="underline">Forgot password?</Link></p>}</div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-medium text-bad">{error}</p>}
            <button disabled={busy} className="btn-dark mt-6 w-full">{busy && <Spinner />}{signup ? 'Create account' : 'Log in'}</button>
          </form>
        )}

        <p className="mt-8 text-sm text-slate">
          {signup ? <>Already have an account? <Link className="font-semibold text-ink underline" href={`/login${q}`}>Log in</Link></>
                  : <>New here? <Link className="font-semibold text-ink underline" href={`/signup${q}`}>Create an account</Link></>}
        </p>
        <p className="mt-6 text-xs text-slate">By continuing you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
      </div>
      <aside className="hidden flex-col items-center justify-center bg-ink px-10 py-12 lg:flex">
        <ChatDemo dark />
        <p className="mt-6 max-w-sm text-center text-sm text-white/70">A comment on your post becomes a private conversation, automatically.</p>
      </aside>
    </main>
  );
}
