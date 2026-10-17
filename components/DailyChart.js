// Server-rendered bar chart: messages sent (bars) and link clicks (dots) per day.
export default function DailyChart({ days }) {
  const W = 720, H = 200, padL = 32, padB = 26, padT = 10;
  const max = Math.max(4, ...days.map((d) => Math.max(d.sent, d.clicks)));
  const step = (W - padL) / days.length;
  const bw = Math.max(4, step * 0.6);
  const y = (v) => padT + (H - padT - padB) * (1 - v / max);
  const ticks = [0, Math.round(max / 2), max];
  return (
    <figure>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Messages sent and link clicks per day for the last 30 days">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={W} y1={y(t)} y2={y(t)} className="stroke-line" strokeDasharray={t ? '3 3' : ''} />
            <text x={padL - 6} y={y(t) + 4} textAnchor="end" fontSize="11" className="fill-slate">{t}</text>
          </g>
        ))}
        {days.map((d, i) => {
          const x = padL + i * step + (step - bw) / 2;
          return (
            <g key={d.key}>
              <title>{`${d.label}: ${d.sent} sent, ${d.clicks} clicks`}</title>
              <rect x={x} y={y(d.sent)} width={bw} height={Math.max(0, y(0) - y(d.sent))} rx="2" className="bar-grow fill-ink" style={{ transformBox: 'fill-box', animationDelay: `${i * 14}ms` }} />
              {d.clicks > 0 && <circle cx={x + bw / 2} cy={y(d.clicks)} r="3.5" className="fill-marigold stroke-surface" strokeWidth="1.5" />}
              {(i % 5 === 0 || i === days.length - 1) && <text x={x + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" className="fill-slate">{d.label}</text>}
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-2 flex gap-5 text-[13px] text-slate">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-ink" />Messages sent</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-marigold" />Link clicks</span>
      </figcaption>
    </figure>
  );
}
