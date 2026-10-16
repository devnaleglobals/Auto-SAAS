// Shown instantly while a dashboard page loads its data.
export default function Loading() {
  return (
    <div aria-busy="true" aria-label="Loading">
      <div className="skeleton h-9 w-64" />
      <div className="skeleton mt-3 h-4 w-96 max-w-full" />
      <div className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white p-5"><div className="skeleton h-4 w-24" /><div className="skeleton mt-3 h-8 w-20" /></div>
        ))}
      </div>
      <div className="card mt-6 space-y-3 p-5">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton h-10 w-full" />)}
      </div>
    </div>
  );
}
