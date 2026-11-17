const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export default function Meter({ label, used, limit }) {
  const pct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 100;
  const tone = pct >= 100 ? 'bg-bad' : pct >= 80 ? 'bg-marigold' : 'bg-ok';
  return (
    <div>
      <div className="flex justify-between text-sm"><span className="font-semibold">{label}</span><span className="tabular-nums text-slate">{fmt(used)} of {fmt(limit)}</span></div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
        <div className={`h-full rounded-full ${tone} transition-[width] duration-500`} style={{ width: `${used > 0 ? Math.max(pct, 2) : 0}%` }} />
      </div>
    </div>
  );
}
