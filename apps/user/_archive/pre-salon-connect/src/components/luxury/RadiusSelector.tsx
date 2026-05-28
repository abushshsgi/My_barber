export function RadiusSelector({
  radiusKm,
  onChange,
}: {
  radiusKm: number;
  onChange: (km: number) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface p-1 shadow-soft">
      {([2, 5, 10, 25] as const).map((r) => (
        <button
          key={r}
          type="button"
          onClick={() => onChange(r)}
          className={[
            "min-w-[44px] rounded-full px-3 py-1.5 text-xs font-semibold transition",
            radiusKm === r
              ? "bg-primary text-primary-foreground shadow-soft"
              : "text-muted-foreground hover:text-foreground",
          ].join(" ")}
          aria-pressed={radiusKm === r}
        >
          {r} km
        </button>
      ))}
    </div>
  );
}
