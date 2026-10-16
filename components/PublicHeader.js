import Link from 'next/link';
import { COMPANY } from '@/lib/company';

export default function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
      <Link href="/" className="font-display text-xl font-bold">ReplyRelay</Link>
      <nav className="flex items-center gap-2" aria-label="Main">
        <Link href="/pricing" className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate hover:text-ink sm:block">Pricing</Link>
        <Link href="/login" className="btn-ghost">Log in</Link>
        <Link href="/signup" className="btn-primary">Start free</Link>
      </nav>
    </header>
  );
}

export function PublicFooter() {
  return (
    <footer className="mx-auto flex max-w-6xl flex-wrap justify-between gap-3 px-6 py-8 text-xs text-slate">
      <span>© {new Date().getFullYear()} {COMPANY.name}, {COMPANY.address}{COMPANY.phone && ` · ${COMPANY.phone}`}</span>
      <span className="flex flex-wrap gap-5">
        <Link href="/pricing" className="hover:text-ink">Pricing</Link>
        <Link href="/contact" className="hover:text-ink">Contact</Link>
        <Link href="/terms" className="hover:text-ink">Terms</Link>
        <Link href="/privacy" className="hover:text-ink">Privacy</Link>
        <Link href="/data-deletion" className="hover:text-ink">Delete your data</Link>
      </span>
    </footer>
  );
}
