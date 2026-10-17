// Small server-rendered bar chart with a one-time grow animation.
export default function Bars({ days, label = 'per day', color = 'rgb(var(--ink))' }) {
  const max = Math.max(1, ...days.map((d) => d.value));
  return (
    <figure>
      <div className="flex h-32 items-end gap-[3px]" role="img" aria-label={`${days.reduce((s, d) => s + d.value, 0)} ${label} over ${days.length} days`}>
        {days.map((d, i) => (
          <div key={d.key} title={`${d.label}: ${d.value}`} className="group relative flex-1">
            <div className="bar-grow w-full rounded-t-sm" style={{ height: `${Math.max(2, (d.value / max) * 100)}%`, minHeight: 2, background: d.value ? color : 'rgb(var(--line))', animationDelay: `${i * 12}ms` }} />
          </div>
        ))}
      </div>
      <figcaption className="mt-2 flex justify-between text-xs text-slate"><span>{days[0]?.label}</span><span>{days[days.length - 1]?.label}</span></figcaption>
    </figure>
  );
}
