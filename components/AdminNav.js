'use client';
import Link from 'next/link';
import { ThemeToggle } from './Theme';
import { usePathname } from 'next/navigation';

const TABS = [
  ['/admin', 'Overview'],
  ['/admin/workspaces', 'Clients'],
  ['/admin/users', 'Users'],
  ['/admin/payments', 'Payments'],
  ['/admin/system', 'System'],
];

export default function AdminNav({ email }) {
  const path = usePathname();
  const active = (href) => (href === '/admin' ? path === href : path.startsWith(href));
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-navy text-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-8 gap-y-2 px-5 py-3 lg:px-8">
        <Link href="/admin" className="flex items-center gap-2 font-display text-lg font-bold">
          ReplyRelay <span className="rounded-md bg-marigold px-1.5 py-0.5 text-xs font-bold text-navy">Platform admin</span>
        </Link>
        <nav className="flex flex-1 flex-wrap gap-1" aria-label="Admin">
          {TABS.map(([href, label]) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={`rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors ${active(href) ? 'bg-white text-ink' : 'text-white/70 hover:bg-white/10 hover:text-white'}`}>
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4 text-xs text-white/60">
          <span className="hidden sm:inline">{email}</span>
          <ThemeToggle />
          <Link href="/dashboard" className="font-semibold text-white/80 hover:text-white">Back to my workspace</Link>
        </div>
      </div>
    </header>
  );
}
