'use client';

export const newStepId = () => `m${Math.random().toString(36).slice(2, 8)}`;
export const blankStep = (text = '') => ({ id: newStepId(), name: '', text, image: '', buttons: [], next: null, ask: null });
const ASK_DEFAULT = { name: 'What’s your name?', phone: 'What’s your phone number? We’ll only use it for your order.', email: 'What’s your email address?', custom: '' };

const stepLabel = (steps, id) => {
  const i = steps.findIndex((s) => s.id === id);
  if (i < 0) return 'Choose a message';
  return `${i + 1}. ${steps[i].name || steps[i].text.slice(0, 28) || 'Untitled message'}`;
};

export default function FlowEditor({ steps, setSteps }) {
  const update = (id, patch) => setSteps(steps.map((s) => (s.id === id ? { ...s, ...patch } : s)));
  const remove = (id) => setSteps(steps.filter((s) => s.id !== id).map((s) => ({
    ...s,
    next: s.next === id ? null : s.next,
    buttons: s.buttons.map((b) => (b.action === 'step' && b.target === id ? { ...b, target: '' } : b)),
  })));
  const move = (i, d) => { const c = [...steps]; const [x] = c.splice(i, 1); c.splice(i + d, 0, x); setSteps(c); };
  const setButton = (s, bi, patch) => update(s.id, { buttons: s.buttons.map((b, j) => (j === bi ? { ...b, ...patch } : b)) });

  return (
    <div className="space-y-4">
      {steps.map((s, i) => {
        const others = steps.filter((o) => o.id !== s.id);
        return (
          <div key={s.id} className="rounded-xl border border-line bg-canvas/60 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-ink px-2 py-0.5 text-xs font-semibold text-white">{i === 0 ? 'First message' : `Message ${i + 1}`}</span>
              <input value={s.name} onChange={(e) => update(s.id, { name: e.target.value })} placeholder="Name (only you see this)" aria-label={`Name for message ${i + 1}`}
                className="min-w-0 flex-1 rounded-md border border-transparent bg-transparent px-2 py-1 text-sm font-semibold hover:border-line focus:border-ink focus:bg-white focus:outline-none" />
              <div className="flex gap-1">
                {i > 0 && <button type="button" onClick={() => move(i, -1)} className="btn-ghost btn-sm" aria-label="Move up">↑</button>}
                {i < steps.length - 1 && <button type="button" onClick={() => move(i, 1)} className="btn-ghost btn-sm" aria-label="Move down">↓</button>}
                {steps.length > 1 && <button type="button" onClick={() => remove(s.id)} className="btn-ghost btn-sm text-bad">Delete</button>}
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={`Kind of message ${i + 1}`}>
              {[['', 'Message'], ['name', 'Ask name'], ['phone', 'Ask phone'], ['email', 'Ask email'], ['custom', 'Ask a question']].map(([v, l]) => {
                const on = (s.ask?.field || '') === v;
                return (
                  <button key={v || 'msg'} type="button" role="radio" aria-checked={on}
                    onClick={() => update(s.id, v ? { ask: { field: v, label: s.ask?.label || '' }, buttons: [], text: s.text || ASK_DEFAULT[v] } : { ask: null })}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${on ? 'border-ink bg-ink text-white' : 'border-line bg-white hover:border-slate/60'}`}>{l}</button>
                );
              })}
            </div>

            <textarea rows={3} value={s.text} maxLength={640} onChange={(e) => update(s.id, { text: e.target.value })}
              placeholder={s.ask ? 'What should we ask?' : 'What should this message say?'} className="field mt-3" aria-label={`Text of message ${i + 1}`} />
            <p className="hint">{s.text.length}/640{s.ask && ' · The answer is saved to Leads, then the conversation moves to the next message.'}</p>
            {s.ask?.field === 'custom' && (
              <div className="mt-2"><label className="label" htmlFor={`ql-${s.id}`}>Column name in Leads</label>
                <input id={`ql-${s.id}`} value={s.ask.label || ''} maxLength={60} onChange={(e) => update(s.id, { ask: { ...s.ask, label: e.target.value } })} placeholder="Size, City, Budget…" className="field max-w-xs" /></div>
            )}

            <details className="mt-2" open={Boolean(s.image)}>
              <summary className="cursor-pointer text-sm font-semibold text-slate">Add an image</summary>
              <input value={s.image || ''} onChange={(e) => update(s.id, { image: e.target.value })} placeholder="https://… link to a JPG or PNG" className="field mt-2" aria-label="Image link" />
            </details>

            {!s.ask && <div className="mt-4">
              <p className="text-sm font-semibold">Buttons <span className="font-normal text-slate">(up to 3)</span></p>
              <div className="mt-2 space-y-2">
                {s.buttons.map((b, bi) => (
                  <div key={bi} className="grid gap-2 rounded-lg border border-line bg-white p-2 sm:grid-cols-[1fr_150px_1.3fr_auto]">
                    <input value={b.title} maxLength={20} onChange={(e) => setButton(s, bi, { title: e.target.value })} placeholder="Button label" className="field py-2" aria-label="Button label" />
                    <select value={b.action} onChange={(e) => setButton(s, bi, { action: e.target.value, target: '' })} className="field py-2" aria-label="Button action">
                      <option value="step">Go to message</option>
                      <option value="url">Open link</option>
                    </select>
                    {b.action === 'url' ? (
                      <input value={b.target} onChange={(e) => setButton(s, bi, { target: e.target.value })} placeholder="https://" className="field py-2" aria-label="Link" />
                    ) : (
                      <select value={b.target} onChange={(e) => setButton(s, bi, { target: e.target.value })} className="field py-2" aria-label="Goes to">
                        <option value="">Choose a message…</option>
                        {others.map((o) => <option key={o.id} value={o.id}>{stepLabel(steps, o.id)}</option>)}
                      </select>
                    )}
                    <button type="button" onClick={() => update(s.id, { buttons: s.buttons.filter((_, j) => j !== bi) })} className="btn-ghost btn-sm" aria-label="Remove button">×</button>
                  </div>
                ))}
              </div>
              {s.buttons.length < 3 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  <button type="button" onClick={() => update(s.id, { buttons: [...s.buttons, { title: '', action: 'step', target: '' }] })} className="btn-ghost btn-sm">+ Button to another message</button>
                  <button type="button" onClick={() => update(s.id, { buttons: [...s.buttons, { title: '', action: 'url', target: '' }] })} className="btn-ghost btn-sm">+ Link button</button>
                </div>
              )}
            </div>}

            {others.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
                <label htmlFor={`next-${s.id}`} className="font-semibold">{s.ask ? 'After they answer, send' : 'Then automatically send'}</label>
                <select id={`next-${s.id}`} value={s.next || ''} onChange={(e) => update(s.id, { next: e.target.value || null })} className="field w-auto py-1.5">
                  <option value="">{s.ask ? 'Nothing (end the conversation)' : 'Nothing (wait for a tap)'}</option>
                  {others.map((o) => <option key={o.id} value={o.id}>{stepLabel(steps, o.id)}</option>)}
                </select>
              </div>
            )}
          </div>
        );
      })}
      <button type="button" onClick={() => setSteps([...steps, blankStep()])} className="btn-ghost w-full border-dashed">+ Add a message</button>
      <p className="hint">Messages without buttons or an automatic next message end the conversation. Button labels can be 20 characters at most.</p>
    </div>
  );
}

export function FollowSettings({ value, onChange, platform }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const supported = platform !== 'FACEBOOK';
  return (
    <div className="space-y-4">
      <label className={`flex items-start gap-3 rounded-lg border p-4 ${value.requireFollow ? 'border-ink bg-white' : 'border-line bg-canvas'} ${supported ? '' : 'opacity-60'}`}>
        <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" disabled={!supported} checked={value.requireFollow && supported} onChange={(e) => set({ requireFollow: e.target.checked })} />
        <span>
          <span className="block font-semibold">Ask people to follow before continuing</span>
          <span className="text-sm text-slate">
            {supported
              ? 'Checked every time they send a message or tap a button. If they don’t follow yet, they get your follow message and a button to try again.'
              : 'Facebook doesn’t share whether someone likes or follows a Page, so this works on Instagram only.'}
          </span>
        </span>
      </label>
      {value.requireFollow && supported && (
        <div className="grid gap-4 pl-1">
          <div><label className="label" htmlFor="fp">Follow message</label>
            <textarea id="fp" rows={2} className="field" value={value.followPrompt} onChange={(e) => set({ followPrompt: e.target.value })} maxLength={640} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label" htmlFor="fb">Button label</label>
              <input id="fb" className="field" value={value.followButton} maxLength={20} onChange={(e) => set({ followButton: e.target.value })} /></div>
            <div><label className="label" htmlFor="fr">If they still don’t follow</label>
              <input id="fr" className="field" value={value.followRetry} maxLength={640} onChange={(e) => set({ followRetry: e.target.value })} /></div>
          </div>
        </div>
      )}
    </div>
  );
}

export function FollowUpSettings({ value, onChange }) {
  const set = (patch) => onChange({ ...value, ...patch });
  const on = Boolean(value.followUpMins);
  return (
    <div className="space-y-4">
      <label className={`flex items-start gap-3 rounded-lg border p-4 ${on ? 'border-ink bg-white' : 'border-line bg-canvas'}`}>
        <input type="checkbox" className="mt-1 h-4 w-4 accent-ink" checked={on} onChange={(e) => set({ followUpMins: e.target.checked ? 180 : null })} />
        <span>
          <span className="block font-semibold">Send one reminder if they don’t tap a link</span>
          <span className="text-sm text-slate">Sent once, only within Meta’s 24-hour window after their last message. Uses the link buttons from your conversation.</span>
        </span>
      </label>
      {on && (
        <div className="grid gap-4 pl-1 sm:grid-cols-[200px_1fr]">
          <div><label className="label" htmlFor="fu-delay">Send after</label>
            <select id="fu-delay" className="field" value={value.followUpMins} onChange={(e) => set({ followUpMins: Number(e.target.value) })}>
              {[[30, '30 minutes'], [60, '1 hour'], [180, '3 hours'], [360, '6 hours'], [720, '12 hours'], [1200, '20 hours']].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select></div>
          <div><label className="label" htmlFor="fu-text">Reminder message</label>
            <input id="fu-text" className="field" maxLength={640} value={value.followUpText} onChange={(e) => set({ followUpText: e.target.value })} /></div>
        </div>
      )}
    </div>
  );
}
