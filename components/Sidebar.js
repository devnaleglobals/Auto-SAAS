'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState } from 'react';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: 'M3 12h4v8H3zM10 4h4v16h-4zM17 9h4v11h-4z' },
  { href: '/dashboard/automations', label: 'Automations', icon: 'M13 3 4 14h7l-1 7 9-11h-7z' },
  { href: '/dashboard/leads', label: 'Leads', icon: 'M4 5h16v14H4zM4 9h16M9 13h6' },
  { href: '/dashboard/accounts', label: 'Accounts', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM4 21a8 8 0 0 1 16 0' },
  { href: '/dashboard/team', label: 'Team', icon: 'M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2 20a7 7 0 0 1 14 0M16 4.5a3.5 3.5 0 0 1 0 6.5M18 13.5a7 7 0 0 1 4 6.5' },
  { href: '/dashboard/activity', label: 'Activity', icon: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z' },
  { href: '/dashboard/billing', label: 'Billing', icon: 'M3 7h18v10H3zM3 11h18M7 15h3' },
  { href: '/dashboard/settings', label: 'Settings', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z' },
];

function Icon({ d }) {
  return <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] shrink-0" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;
}

export default function Sidebar({ user, workspace, workspaces, role, isAdmin }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const active = (href) => (href === '/dashboard' ? path === href : path.startsWith(href));

  async function switchTo(id) {
    await fetch('/api/workspace/switch', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ workspaceId: id }) });
    router.push('/dashboard');
    router.refresh();
  }

  const body = (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-6">
        <Link href="/dashboard" className="font-display text-lg font-bold text-white">ReplyRelay</Link>
      </div>
      <div className="px-3">
        <label className="sr-only" htmlFor="ws">Workspace</label>
        {workspaces.length > 1 ? (
          <select id="ws" value={workspace.id} onChange={(e) => switchTo(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-inkSoft px-3 py-2 text-sm text-white outline-none">
            {workspaces.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        ) : (
          <p className="rounded-lg border border-white/10 bg-inkSoft px-3 py-2 text-sm text-white">{workspace.name}</p>
        )}
      </div>
      <div className="mt-3 px-3">
        <button type="button" onClick={() => window.dispatchEvent(new Event('open-command-palette'))}
          className="flex w-full items-center justify-between rounded-lg border border-white/10 px-3 py-2 text-sm text-white/60 transition-colors hover:border-white/25 hover:text-white">
          <span>Search or jump to…</span><kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[11px] font-semibold">Ctrl K</kbd>
        </button>
      </div>
      <nav className="mt-4 flex-1 space-y-0.5 px-3" aria-label="Main">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} onClick={() => setOpen(false)} aria-current={active(n.href) ? 'page' : undefined}
            className={`relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-150 ${active(n.href) ? 'bg-white/10 text-white before:absolute before:-left-3 before:top-1.5 before:h-[calc(100%-12px)] before:w-1 before:rounded-r-full before:bg-marigold' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}>
            <Icon d={n.icon} />{n.label}
          </Link>
        ))}
      </nav>
      {isAdmin && (
        <div className="px-3 pb-3">
          <Link href="/admin" className="flex items-center justify-between rounded-lg bg-marigold/15 px-3 py-2 text-sm font-semibold text-marigold transition-colors hover:bg-marigold/25">
            Platform admin <span aria-hidden>↗</span>
          </Link>
        </div>
      )}
      <div className="border-t border-white/10 px-5 py-4">
        <p className="truncate text-sm font-semibold text-white">{user.name}</p>
        <p className="truncate text-xs text-white/60">{user.email || 'Signed in with social account'} · {role.toLowerCase()}</p>
        <form action="/api/auth/logout" method="post" className="mt-3"><button className="text-xs font-semibold text-white/75 hover:text-white">Log out</button></form>
      </div>
    </div>
  );

  return (
    <>
      <div className="flex items-center justify-between bg-ink px-4 py-3 lg:hidden">
        <Link href="/dashboard" className="font-display font-bold text-white">ReplyRelay</Link>
        <button onClick={() => setOpen(!open)} aria-expanded={open} className="rounded-md px-2 py-1 text-sm font-semibold text-white">{open ? 'Close' : 'Menu'}</button>
      </div>
      {open && <div className="fixed inset-0 z-40 animate-fade-in bg-ink lg:hidden">{body}</div>}
      <aside className="fixed inset-y-0 left-0 hidden w-60 bg-ink lg:block">{body}</aside>
    </>
  );
}
