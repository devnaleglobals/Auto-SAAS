'use client';
import { useState } from 'react';
import { Spinner } from './Feedback';

export default function ContactForm() {
  const [v, setV] = useState({ name: '', email: '', subject: '', category: 'general', message: '', website: '' });
  const [state, setState] = useState({ busy: false, error: '', done: null });
  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    setState({ busy: true, error: '', done: null });
    const res = await fetch('/api/contact', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(v) });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setState({ busy: false, error: d.error || 'Couldn’t send. Try again.', done: null });
    setState({ busy: false, error: '', done: d.number || true });
  }
  if (state.done) return <p role="status" className="rounded-xl border border-ok/30 bg-ok/5 p-4 text-sm">Thanks! Your message was received{typeof state.done === 'number' ? ` (ticket #${state.done})` : ''}. We’ll reply by email.</p>;
  return (
    <form onSubmit={submit} className="not-prose space-y-4 rounded-2xl border border-line bg-surface p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div><label className="label" htmlFor="c-name">Your name</label><input id="c-name" className="field" value={v.name} onChange={set('name')} required maxLength={80} /></div>
        <div><label className="label" htmlFor="c-email">Email</label><input id="c-email" type="email" className="field" value={v.email} onChange={set('email')} required /></div>
        <div><label className="label" htmlFor="c-sub">Subject</label><input id="c-sub" className="field" value={v.subject} onChange={set('subject')} required maxLength={150} /></div>
        <div><label className="label" htmlFor="c-cat">Topic</label><select id="c-cat" className="field" value={v.category} onChange={set('category')}><option value="general">General question</option><option value="billing">Pricing and billing</option><option value="technical">Technical problem</option><option value="account">Account and access</option><option value="feature">Feature request</option></select></div>
      </div>
      <div><label className="label" htmlFor="c-msg">Message</label><textarea id="c-msg" rows={5} className="field" value={v.message} onChange={set('message')} required maxLength={5000} /></div>
      {/* Hidden from people; bots fill it in */}
      <div aria-hidden className="absolute -left-[9999px]"><label htmlFor="c-web">Website</label><input id="c-web" tabIndex={-1} autoComplete="off" value={v.website} onChange={set('website')} /></div>
      {state.error && <p role="alert" className="text-sm font-medium text-bad">{state.error}</p>}
      <button disabled={state.busy} className="btn-dark">{state.busy && <Spinner />}Send message</button>
    </form>
  );
}
