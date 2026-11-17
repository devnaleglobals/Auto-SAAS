'use client';
import { useState, useRef, useEffect } from 'react';

// A safe, local simulation of what ReplyRelay does. Nothing is sent to Instagram.
const PRESETS = {
  catalogue: { label: 'Shop: send catalogue', keyword: 'link', reply: 'Sent it to your DMs 📩', dm: 'Hi {name}! Here’s our festive catalogue 👇', button: 'Open catalogue', follow: false, ask: false },
  lead: { label: 'Coach: collect leads', keyword: 'guide', reply: 'Check your inbox 🙌', dm: 'Hey {name}, happy to send the free guide! What’s your email?', button: '', follow: false, ask: true },
  follow: { label: 'Creator: follow first', keyword: 'recipe', reply: 'Recipe sent! ❤️', dm: 'Here’s the full recipe, {name} 🍲', button: 'Get the recipe', follow: true, ask: false },
};

export default function DemoSimulator() {
  const [preset, setPreset] = useState('catalogue');
  const [cfg, setCfg] = useState(PRESETS.catalogue);
  const [name, setName] = useState('meera_k');
  const [comment, setComment] = useState('');
  const [feed, setFeed] = useState([]);
  const [busy, setBusy] = useState(false);
  const end = useRef(null);
  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, [feed]);

  const push = (items) => new Promise((resolve) => {
    let i = 0;
    const tick = () => { if (i >= items.length) return resolve(); setFeed((f) => [...f, items[i++]]); setTimeout(tick, 650); };
    tick();
  });

  async function send(e) {
    e.preventDefault();
    if (!comment.trim() || busy) return;
    setBusy(true);
    const text = comment.trim();
    setComment('');
    const matched = text.toLowerCase().split(/[^\p{L}\p{N}]+/u).includes(cfg.keyword.toLowerCase());
    const first = name.split(/[._]/)[0].replace(/^\w/, (c) => c.toUpperCase());
    const steps = [{ kind: 'comment', who: name, text }];
    if (!matched) steps.push({ kind: 'note', text: `No reply: the comment doesn’t contain “${cfg.keyword}”. Try typing it.` });
    else {
      steps.push({ kind: 'reply', who: 'your_brand', text: cfg.reply });
      steps.push({ kind: 'note', text: 'Private message sent within seconds' });
      steps.push({ kind: 'dm', text: cfg.dm.replace('{name}', first), button: cfg.follow ? 'Send it to me' : cfg.button });
      if (cfg.follow) {
        steps.push({ kind: 'tap', text: 'Send it to me' });
        steps.push({ kind: 'dm', text: 'Please follow us first, then tap below 🙏', button: 'I’ve followed ✅' });
        steps.push({ kind: 'tap', text: 'I’ve followed ✅' });
        steps.push({ kind: 'note', text: 'Follow checked with Instagram ✔' });
        steps.push({ kind: 'dm', text: cfg.dm.replace('{name}', first), button: cfg.button });
      }
      if (cfg.ask) {
        steps.push({ kind: 'user', text: `${first.toLowerCase()}@example.com` });
        steps.push({ kind: 'dm', text: 'Thanks! The guide is on its way to your inbox 📘' });
        steps.push({ kind: 'note', text: `Lead saved: ${first}, ${first.toLowerCase()}@example.com` });
      }
    }
    await push(steps);
    setBusy(false);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[360px_1fr]">
      <div className="card h-fit space-y-4 p-5">
        <h2 className="font-display text-lg font-bold">1. Set up an automation</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(PRESETS).map(([k, p]) => <button key={k} type="button" onClick={() => { setPreset(k); setCfg(p); setFeed([]); }} className={`rounded-full px-3 py-1 text-xs font-semibold ${preset === k ? 'bg-navy text-white' : 'bg-canvas'}`}>{p.label}</button>)}
        </div>
        <div><label className="label" htmlFor="d-kw">Keyword</label><input id="d-kw" className="field" value={cfg.keyword} onChange={(e) => setCfg({ ...cfg, keyword: e.target.value.trim() })} /></div>
        <div><label className="label" htmlFor="d-rep">Public reply</label><input id="d-rep" className="field" value={cfg.reply} onChange={(e) => setCfg({ ...cfg, reply: e.target.value })} /></div>
        <div><label className="label" htmlFor="d-dm">Private message</label><textarea id="d-dm" rows={3} className="field" value={cfg.dm} onChange={(e) => setCfg({ ...cfg, dm: e.target.value })} /><p className="hint">{'{name}'} becomes the person’s first name.</p></div>
        {!cfg.ask && <div><label className="label" htmlFor="d-btn">Button</label><input id="d-btn" className="field" maxLength={20} value={cfg.button} onChange={(e) => setCfg({ ...cfg, button: e.target.value })} /></div>}
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={cfg.follow} onChange={(e) => setCfg({ ...cfg, follow: e.target.checked })} /> Ask people to follow first</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4" checked={cfg.ask} onChange={(e) => setCfg({ ...cfg, ask: e.target.checked })} /> Ask for their email (lead capture)</label>
      </div>

      <div>
        <h2 className="font-display text-lg font-bold">2. Comment like a follower would</h2>
        <div className="mx-auto mt-4 w-full max-w-[420px] overflow-hidden rounded-[28px] border-[6px] border-ink bg-white shadow-pop">
          <div className="flex items-center gap-2.5 border-b border-line px-4 py-3"><span className="flex h-8 w-8 items-center justify-center rounded-full bg-navy text-[11px] font-bold text-marigold">YB</span><span className="text-sm font-semibold text-ink">your_brand</span></div>
          <div className="flex aspect-[5/2] flex-col justify-end bg-navy p-5"><p className="font-display text-2xl font-extrabold text-white">New drop is live</p><p className="mt-1 text-xs font-semibold text-marigold">Comment “{cfg.keyword || '…'}” to get it</p></div>
          <div className="h-[360px] space-y-2 overflow-y-auto bg-canvas px-4 py-4 text-sm text-ink" aria-live="polite">
            {feed.length === 0 && <p className="pt-24 text-center text-xs text-slate">Type a comment below to see what happens.</p>}
            {feed.map((m, i) => {
              if (m.kind === 'comment') return <p key={i} className="animate-fade-in rounded-xl bg-white px-3 py-2"><strong>{m.who}</strong> {m.text}</p>;
              if (m.kind === 'reply') return <p key={i} className="ml-6 animate-fade-in rounded-xl bg-white px-3 py-2"><strong>{m.who}</strong> <span className="text-slate">{m.text}</span></p>;
              if (m.kind === 'note') return <p key={i} className="animate-fade-in text-center text-[11px] text-slate">{m.text}</p>;
              if (m.kind === 'tap' || m.kind === 'user') return <p key={i} className="ml-auto max-w-[75%] animate-fade-in rounded-2xl rounded-br-sm bg-sky px-3.5 py-2 text-white">{m.kind === 'tap' ? `Tapped: ${m.text}` : m.text}</p>;
              return (
                <div key={i} className="max-w-[85%] animate-fade-in">
                  <p className="rounded-2xl rounded-bl-sm bg-white px-3.5 py-2">{m.text}</p>
                  {m.button && <p className="mt-1 rounded-xl border border-line bg-white py-1.5 text-center text-sm font-semibold text-sky">{m.button}</p>}
                </div>
              );
            })}
            <div ref={end} />
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-line p-3">
            <input className="field min-w-0 flex-1 py-2" value={name} onChange={(e) => setName(e.target.value.replace(/\s/g, '').slice(0, 20))} aria-label="Commenter username" style={{ maxWidth: 110 }} />
            <input className="field min-w-0 flex-1 py-2" value={comment} onChange={(e) => setComment(e.target.value)} placeholder={`e.g. ${cfg.keyword} please`} aria-label="Comment" maxLength={150} />
            <button disabled={busy} className="btn-dark px-4">Post</button>
          </form>
        </div>
        <p className="mt-3 text-center text-xs text-slate">This is a simulation on this page. Nothing is posted to Instagram.</p>
      </div>
    </div>
  );
}
