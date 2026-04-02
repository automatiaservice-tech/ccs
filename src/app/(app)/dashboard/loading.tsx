export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-36 bg-slate-200 rounded-lg" />
        <div className="h-4 w-52 bg-slate-100 rounded" />
      </div>
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100" />
        ))}
      </div>
      {/* Chart */}
      <div className="h-64 rounded-xl bg-slate-100" />
      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="h-36 rounded-xl bg-slate-100" />
        <div className="h-36 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
