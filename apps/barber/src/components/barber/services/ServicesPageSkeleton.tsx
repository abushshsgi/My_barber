export function ServicesPageSkeleton() {
  return (
    <div className="grid animate-pulse gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-4 rounded-xl border border-border bg-card p-6">
        <div className="h-6 w-32 rounded bg-muted" />
        <div className="h-4 w-2/3 rounded bg-muted" />
        <div className="space-y-3 pt-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 rounded-xl bg-muted/60" />
          ))}
        </div>
      </div>
      <div className="space-y-4">
        <div className="h-48 rounded-xl border border-border bg-card" />
        <div className="h-32 rounded-xl border border-border bg-card" />
      </div>
    </div>
  );
}
