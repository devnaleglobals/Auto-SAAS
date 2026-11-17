'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle } from './Theme';

const TABS = [
  ['/admin', 'Overview', null],
  ['/admin/workspaces', 'Clients', 'clients.view'],
  ['/admin/users', 'Users', 'clients.view'],
  ['/admin/automations', 'Automations', 'automations'],
  ['/admin/tickets', 'Tickets', 'tickets'],
  ['/admin/payments', 'Payments', 'billing'],
  ['/admin/emails', 'Emails', 'emails'],
  ['/admin/settings', 'Settings', null],
  ['/admin/system', 'System', 'settings'],
  ['/admin/audit', 'Audit', 'settings'],
];

export default function AdminNav({ admin, perms, openTickets }) {
  const path = usePathname();
  const active = (href) => (href === '/admin' ? path === href : path.startsWith(href));
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-5 py-3 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold">
          ReplyRelay <span className="rounded-md bg-marigold px-1.5 py-0.5 text-xs font-bold text-navy">Admin</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-0.5" aria-label="Admin">
          {TABS.filter(([, , p]) => !p || perms.includes(p)).map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={`rounded-lg px-2 py-1.5 text-sm font-semibold transition-colors ${active(href) ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              {label}{label === 'Tickets' && openTickets > 0 && <span className="ml-1.5 rounded-full bg-marigold px-1.5 text-xs text-navy">{openTickets}</span>}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3 text-xs text-white/70">
          <span className="hidden text-right sm:block"><span className="block font-semibold text-white">{admin.name}</span>{admin.role}{admin.totp ? ' · 2-step on' : ''}</span>
          <ThemeToggle />
          <form action="/api/admin/auth/logout" method="post"><button className="rounded-lg px-2 py-1 font-semibold text-white/80 hover:bg-white/10 hover:text-white">Log out</button></form>
        </div>
      </div>
    </header>
  );
}
