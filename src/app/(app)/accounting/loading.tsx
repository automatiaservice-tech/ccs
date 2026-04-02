export default function Loading() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="space-y-2">
        <div className="h-7 w-44 bg-slate-200 rounded-lg" />
        <div className="h-4 w-56 bg-slate-100 rounded" />
      </div>
      <div className="flex gap-3">
        <div className="h-10 w-36 bg-slate-100 rounded-lg" />
        <div className="h-10 w-24 bg-slate-100 rounded-lg" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-24 rounded-xl bg-slate-100" />
        ))}
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="h-64 rounded-xl bg-slate-100" />
        <div className="h-64 rounded-xl bg-slate-100" />
      </div>
    </div>
  )
}
