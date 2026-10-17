'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

// Ctrl/⌘ + K: jump to any page or start a common action.
export default function CommandPalette({ isAdmin, canEdit }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState('');
  const [i, setI] = useState(0);
  const input = useRef(null);

  const items = useMemo(() => [
    ['Overview', '/dashboard', 'Go to'],
    ['Automations', '/dashboard/automations', 'Go to'],
    ...(canEdit ? [['New Instagram automation', '/dashboard/automations/new?platform=INSTAGRAM', 'Create'], ['New Facebook automation', '/dashboard/automations/new?platform=FACEBOOK', 'Create']] : []),
    ['Leads', '/dashboard/leads', 'Go to'],
    ['Download leads (CSV)', '/api/leads/export', 'Download', true],
    ['Accounts', '/dashboard/accounts', 'Go to'],
    ['Connect Instagram', '/api/instagram/connect', 'Connect', true],
    ['Connect Facebook Page', '/api/facebook/connect', 'Connect', true],
    ['Team', '/dashboard/team', 'Go to'],
    ['Activity log', '/dashboard/activity', 'Go to'],
    ['Billing and plans', '/dashboard/billing', 'Go to'],
    ['Settings', '/dashboard/settings', 'Go to'],
    ...(isAdmin ? [['Platform admin', '/admin', 'Admin'], ['All clients', '/admin/workspaces', 'Admin'], ['Payments', '/admin/payments', 'Admin']] : []),
  ], [isAdmin, canEdit]);
  const list = items.filter(([label]) => label.toLowerCase().includes(q.trim().toLowerCase()));

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === 'Escape') setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener('open-command-palette', onOpen);
    return () => { window.removeEventListener('keydown', onKey); window.removeEventListener('open-command-palette', onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(''); setI(0); setTimeout(() => input.current?.focus(), 0); } }, [open]);

  function go(item) {
    if (!item) return;
    setOpen(false);
    if (item[3]) window.location.href = item[1]; else router.push(item[1]);
  }

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center bg-ink/40 p-4 pt-[12vh] backdrop-blur-[2px]" onMouseDown={(e) => e.target === e.currentTarget && setOpen(false)}>
      <div role="dialog" aria-modal="true" aria-label="Jump to" className="w-full max-w-lg animate-dialog-in overflow-hidden rounded-2xl bg-white shadow-pop">
        <input ref={input} value={q} onChange={(e) => { setQ(e.target.value); setI(0); }}
          onKeyDown={(e) => {
            if (e.key === 'ArrowDown') { e.preventDefault(); setI((x) => Math.min(x + 1, list.length - 1)); }
            if (e.key === 'ArrowUp') { e.preventDefault(); setI((x) => Math.max(x - 1, 0)); }
            if (e.key === 'Enter') go(list[i]);
          }}
          placeholder="Where do you want to go?" className="w-full border-b border-line px-5 py-4 text-base outline-none" aria-label="Search pages and actions" />
        <ul className="max-h-[50vh] overflow-y-auto p-2" role="listbox">
          {list.map((item, k) => (
            <li key={item[0]} role="option" aria-selected={k === i}>
              <button onMouseEnter={() => setI(k)} onClick={() => go(item)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left text-sm ${k === i ? 'bg-navy text-white' : 'hover:bg-canvas'}`}>
                <span className="font-semibold">{item[0]}</span><span className={`text-xs ${k === i ? 'text-white/70' : 'text-slate'}`}>{item[2]}</span>
              </button>
            </li>
          ))}
          {list.length === 0 && <li className="px-3 py-6 text-center text-sm text-slate">Nothing matches “{q}”.</li>}
        </ul>
        <p className="border-t border-line px-5 py-2.5 text-xs text-slate">↑ ↓ to move, Enter to open, Esc to close</p>
      </div>
    </div>
  );
}
