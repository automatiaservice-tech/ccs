export function PageSkeleton({
  rows = 5,
  cards = 0,
  hasHeader = true,
}: {
  rows?: number
  cards?: number
  hasHeader?: boolean
}) {
  return (
    <div className="animate-pulse space-y-6">
      {hasHeader && (
        <div className="space-y-2">
          <div className="h-7 w-40 bg-slate-200 rounded-lg" />
          <div className="h-4 w-64 bg-slate-100 rounded" />
        </div>
      )}

      {/* Stat cards */}
      {cards > 0 && (
        <div className={`grid grid-cols-2 lg:grid-cols-${Math.min(cards, 4)} gap-3`}>
          {Array.from({ length: cards }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl bg-slate-100" />
          ))}
        </div>
      )}

      {/* Row skeletons */}
      <div className="rounded-xl border border-slate-100 overflow-hidden">
        <div className="h-10 bg-slate-100" />
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-4 px-4 py-3 border-t border-slate-100"
          >
            <div className="h-4 flex-1 bg-slate-100 rounded" />
            <div className="h-4 w-20 bg-slate-100 rounded" />
            <div className="h-4 w-16 bg-slate-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  )
}
