export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-32 bg-slate-200 rounded-lg" />
        <div className="h-4 w-48 bg-slate-100 rounded" />
      </div>
      <div className="grid grid-cols-7 gap-2 min-w-0">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <div className="h-8 bg-slate-100 rounded" />
            {Array.from({ length: i % 3 === 0 ? 2 : i % 3 === 1 ? 1 : 3 }).map((_, j) => (
              <div key={j} className="h-20 bg-slate-100 rounded-lg" />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
