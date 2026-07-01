export function EarningsPageSkeleton() {
  return (
    <div className="mx-auto max-w-[1400px] animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      <div className="space-y-2">
        <div className="h-8 w-40 rounded-lg bg-muted" />
        <div className="h-4 w-full max-w-xl rounded bg-muted" />
      </div>

      <div className="h-36 rounded-2xl bg-muted" />

      <div className="inline-flex gap-1 rounded-lg bg-muted p-1">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-8 w-16 rounded-md bg-muted-foreground/10" />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-28 rounded-xl border border-border bg-card" />
        ))}
      </div>

      <div className="h-64 rounded-xl border border-border bg-card" />
      <div className="h-72 rounded-xl border border-border bg-card" />
    </div>
  );
}
