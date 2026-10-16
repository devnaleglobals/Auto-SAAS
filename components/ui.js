import Link from 'next/link';

export function PageHeader({ title, description, actions }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-[-0.01em]">{title}</h1>
        {description && <p className="mt-1.5 max-w-2xl text-slate">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Notice({ tone = 'ok', children, action }) {
  const cls = tone === 'ok' ? 'border-ok/30 bg-ok/5 text-ok' : tone === 'warn' ? 'border-marigold/50 bg-marigold/10 text-ink' : 'border-bad/30 bg-bad/5 text-bad';
  return (
    <div role={tone === 'bad' ? 'alert' : 'status'} className={`mb-6 flex animate-fade-in flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 text-sm font-medium ${cls}`}>
      <div>{children}</div>
      {action}
    </div>
  );
}

export function Stat({ label, value, sub, tone }) {
  const color = tone === 'ok' ? 'text-ok' : tone === 'bad' ? 'text-bad' : 'text-ink';
  return (
    <div className="bg-white p-5">
      <dt className="text-sm text-slate">{label}</dt>
      <dd className={`mt-1 font-display text-3xl font-bold tabular-nums ${color}`}>{value}</dd>
      {sub && <dd className="mt-0.5 text-[13px] text-slate">{sub}</dd>}
    </div>
  );
}

export function StatGrid({ children }) {
  return <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">{children}</dl>;
}

export function Empty({ title, children, href, cta }) {
  return (
    <div className="card border-dashed p-10 text-center">
      <p className="font-semibold">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md text-sm text-slate">{children}</p>}
      {href && <Link href={href} className="btn-primary mt-5">{cta}</Link>}
    </div>
  );
}

export const fmtDate = (d) => d ? new Date(d).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' }) : '';
export const fmtNum = (n) => (n ?? 0).toLocaleString('en-IN');
export const pct = (a, b) => (b ? `${Math.round((a / b) * 1000) / 10}%` : '–');
