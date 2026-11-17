import Link from 'next/link';
import { getCompany } from '@/lib/company';

const NAV = [['/features', 'Features'], ['/demo', 'Live demo'], ['/pricing', 'Pricing'], ['/contact', 'Contact']];

export default function PublicHeader() {
  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6">
      <Link href="/" className="flex items-center gap-2 font-display text-xl font-bold"><img src="/icon.png" alt="" className="h-8 w-8 rounded-lg" />ReplyRelay</Link>
      <nav className="flex flex-wrap items-center gap-1" aria-label="Main">
        {NAV.map(([href, label]) => <Link key={href} href={href} className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-slate hover:text-ink md:block">{label}</Link>)}
        <Link href="/login" className="btn-ghost">Log in</Link>
        <Link href="/signup" className="btn-primary">Start free trial</Link>
      </nav>
    </header>
  );
}

export async function PublicFooter() {
  const COMPANY = await getCompany();
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-10 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg font-bold">ReplyRelay</p>
          <p className="mt-2 text-xs text-slate">Instagram and Facebook comment and DM automation on Meta’s official API.</p>
        </div>
        <div><p className="font-semibold">Product</p><ul className="mt-2 space-y-1.5 text-slate">{NAV.map(([h, l]) => <li key={h}><Link href={h} className="hover:text-ink">{l}</Link></li>)}<li><Link href="/signup" className="hover:text-ink">Start free trial</Link></li></ul></div>
        <div><p className="font-semibold">Legal</p><ul className="mt-2 space-y-1.5 text-slate">
          <li><Link href="/terms" className="hover:text-ink">Terms</Link></li><li><Link href="/privacy" className="hover:text-ink">Privacy</Link></li>
          <li><Link href="/refunds" className="hover:text-ink">Refunds &amp; cancellation</Link></li><li><Link href="/delivery" className="hover:text-ink">Service delivery</Link></li>
          <li><Link href="/data-deletion" className="hover:text-ink">Delete your data</Link></li></ul></div>
        <div><p className="font-semibold">Company</p><p className="mt-2 text-xs leading-relaxed text-slate">{COMPANY.name}<br />{COMPANY.address}{COMPANY.phone && <><br />{COMPANY.phone}</>}<br /><a href={`mailto:${COMPANY.email}`} className="hover:text-ink">{COMPANY.email}</a>{COMPANY.gstin && <><br />GSTIN {COMPANY.gstin}</>}</p></div>
      </div>
      <p className="mx-auto max-w-6xl px-6 pb-8 text-xs text-slate">© {new Date().getFullYear()} {COMPANY.name}. Instagram and Facebook are trademarks of Meta Platforms, Inc.</p>
    </footer>
  );
}
