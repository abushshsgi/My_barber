export function MasterCardSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <div className="aspect-[3/4] animate-pulse rounded-2xl bg-neutral-100" />
        <div className="flex gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-9 w-16 animate-pulse rounded-xl bg-neutral-100" />
          ))}
        </div>
      </div>
      <div className="space-y-3 rounded-2xl border border-border bg-neutral-50 p-4">
        <div className="h-5 w-40 animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-full animate-pulse rounded bg-neutral-200" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-neutral-200" />
        <div className="mt-4 grid gap-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-200/80" />
          ))}
        </div>
      </div>
    </div>
  );
}
