'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

const Ctx = createContext(null);

export function FeedbackProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [dialog, setDialog] = useState(null);
  const idRef = useRef(0);

  const toast = useCallback((message, tone = 'ok') => {
    const id = ++idRef.current;
    setToasts((t) => [...t.slice(-2), { id, message, tone }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3800);
  }, []);

  const confirm = useCallback((opts) => new Promise((resolve) => setDialog({ ...opts, resolve })), []);
  const close = (result) => { dialog?.resolve(result); setDialog(null); };

  return (
    <Ctx.Provider value={{ toast, confirm }}>
      {children}
      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex w-[min(92vw,420px)] -translate-x-1/2 flex-col gap-2 lg:left-auto lg:right-6 lg:translate-x-0" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`pointer-events-auto flex animate-toast-in items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-pop ${t.tone === 'bad' ? 'bg-bad text-white' : 'bg-navy text-white'}`}>
            <span aria-hidden className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] ${t.tone === 'bad' ? 'bg-white/20' : 'bg-ok'}`}>{t.tone === 'bad' ? '!' : '✓'}</span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
      {dialog && <ConfirmDialog {...dialog} onClose={close} />}
    </Ctx.Provider>
  );
}

function ConfirmDialog({ title, body, confirmLabel = 'Confirm', danger, onClose }) {
  const btn = useRef(null);
  useEffect(() => {
    btn.current?.focus();
    const onKey = (e) => { if (e.key === 'Escape') onClose(false); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-end justify-center bg-ink/40 p-4 backdrop-blur-[2px] sm:items-center" onMouseDown={(e) => e.target === e.currentTarget && onClose(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="dlg-title" className="w-full max-w-md animate-dialog-in rounded-2xl bg-white p-6 shadow-pop">
        <h2 id="dlg-title" className="font-display text-lg font-bold">{title}</h2>
        {body && <p className="mt-2 text-sm text-slate">{body}</p>}
        <div className="mt-6 flex justify-end gap-2">
          <button className="btn-ghost" onClick={() => onClose(false)}>Cancel</button>
          <button ref={btn} className={danger ? 'btn-danger' : 'btn-dark'} onClick={() => onClose(true)}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function useFeedback() {
  const ctx = useContext(Ctx);
  return ctx || { toast: () => {}, confirm: async ({ title }) => window.confirm(title) };
}

export function Spinner({ className = 'h-4 w-4' }) {
  return <svg className={`${className} animate-[spin_.7s_linear_infinite]`} viewBox="0 0 24 24" fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
}
