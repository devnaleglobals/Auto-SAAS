'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function SettingsNav({ items }) {
  const path = usePathname();
  return (
    <nav aria-label="Settings sections">
      <ul className="flex gap-1 overflow-x-auto text-sm lg:sticky lg:top-24 lg:flex-col">
        {items.map(([href, label]) => (
          <li key={href}><Link href={href} aria-current={path === href ? 'page' : undefined}
            className={`block whitespace-nowrap rounded-lg px-3 py-2 font-medium ${path === href ? 'bg-surface text-ink shadow-sm' : 'text-slate hover:bg-surface hover:text-ink'}`}>{label}</Link></li>
        ))}
      </ul>
    </nav>
  );
}
