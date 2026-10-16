import Link from 'next/link';
import { PublicFooter } from './PublicHeader';

export default function LegalPage({ title, updated, children }) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-14">
      <Link href="/" className="font-display text-lg font-bold">ReplyRelay</Link>
      <h1 className="mt-10 font-display text-4xl font-bold">{title}</h1>
      <p className="mt-2 text-sm text-slate">Last updated {updated}</p>
      <div className="mt-8 space-y-5 leading-relaxed [&_h2]:mt-10 [&_h2]:font-display [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">{children}</div>
      <div className="mt-16 border-t border-line"><PublicFooter /></div>
    </main>
  );
}
