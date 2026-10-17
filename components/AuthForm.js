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
        <Link href="/" className="inline-flex items-center gap-2 font-display text-xl font-bold"><img src="/icon.png" alt="" className="h-8 w-8 rounded-lg" />ReplyRelay</Link>
        <h1 className="mt-8 font-display text-3xl font-bold">{signup ? 'Start automating your comments' : 'Welcome back'}</h1>
        <p className="mt-2 text-slate">{signup ? 'Sign up with the account you want to automate.' : 'Sign in the same way you signed up.'}</p>

        {socialError && <p role="alert" className="mt-6 rounded-lg border border-bad/30 bg-bad/5 px-3 py-2 text-sm text-bad">{socialError} {params.get('reason') && <span className="opacity-80">({params.get('reason')})</span>}</p>}

        <div className="mt-8 space-y-3">
          <a href={`/api/instagram/connect${q}`} className="btn-dark w-full"><PlatformIcon platform="INSTAGRAM" className="h-5 w-5" /> Continue with Instagram</a>
          <a href={`/api/facebook/connect${q}`} className="btn w-full bg-[#1877F2] text-white hover:bg-[#166FE5]"><svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden><path fill="currentColor" d="M24 12a12 12 0 1 0-13.9 11.9v-8.4h-3V12h3V9.4c0-3 1.8-4.7 4.5-4.7 1.3 0 2.7.2 2.7.2v3h-1.5c-1.5 0-2 .9-2 1.9V12h3.4l-.5 3.5h-2.9v8.4A12 12 0 0 0 24 12Z" /></svg> Continue with Facebook</a>
        </div>

        <div className="my-6 flex items-center gap-3 text-xs text-slate" aria-hidden><span className="h-px flex-1 bg-line" />or use email<span className="h-px flex-1 bg-line" /></div>
          <form onSubmit={submit} className="">
            <div className="space-y-4">
              {signup && (<div><label className="label" htmlFor="name">Your name</label><input id="name" name="name" required className="field" /></div>)}
              {signup && (<div><label className="label" htmlFor="company">Company or agency (optional)</label><input id="company" name="company" className="field" /></div>)}
              <div><label className="label" htmlFor="email">Email</label><input id="email" name="email" type="email" required className="field" /></div>
              <div><label className="label" htmlFor="password">Password</label><input id="password" name="password" type="password" minLength={8} required className="field" />{signup ? <p className="hint">At least 8 characters.</p> : <p className="hint"><Link href="/forgot-password" className="underline">Forgot password?</Link></p>}</div>
            </div>
            {error && <p role="alert" className="mt-4 text-sm font-medium text-bad">{error}</p>}
            <button disabled={busy} className="btn-primary mt-6 w-full">{busy && <Spinner />}{signup ? 'Create account' : 'Log in'}</button>
          </form>

        <p className="mt-8 text-sm text-slate">
          {signup ? <>Already have an account? <Link className="font-semibold text-ink underline" href={`/login${q}`}>Log in</Link></>
                  : <>New here? <Link className="font-semibold text-ink underline" href={`/signup${q}`}>Create an account</Link></>}
        </p>
        <p className="mt-6 text-xs text-slate">By continuing you agree to our <Link href="/privacy" className="underline">Privacy Policy</Link>.</p>
      </div>
      </div>
      <aside className="relative hidden flex-col justify-center overflow-hidden bg-ink px-12 py-12 lg:flex">
        <div className="mx-auto w-full max-w-md">
          <h2 className="font-display text-4xl font-extrabold leading-[1.05] text-white">Every comment answered in seconds.</h2>
          <ul className="mt-6 space-y-2.5 text-sm text-white/75">
            {['Official Meta API. We never ask for your Instagram password.', 'Instagram and Facebook Pages in one place.', 'Start free. Upgrade or cancel anytime.'].map((t) => (
              <li key={t} className="flex gap-2.5"><span aria-hidden className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-marigold text-[10px] font-bold text-ink">✓</span>{t}</li>
            ))}
          </ul>
          <div className="mt-10"><ChatDemo dark /></div>
        </div>
      </aside>
    </main>
  );
}
