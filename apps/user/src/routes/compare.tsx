import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo } from "react";
import { Check, Plus, X, Star, MapPin, ArrowRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { salons, shortPrice } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Salon taqqoslash — mysaloon.uz" }] }),
  component: ComparePage,
});

const MAX = 3;

function ComparePage() {
  const [selected, setSelected] = useState<string[]>([salons[0].id, salons[1].id]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  };

  const chosen = useMemo(
    () => selected.map((id) => salons.find((s) => s.id === id)!).filter(Boolean),
    [selected],
  );

  // Collect all unique services across chosen salons (by name)
  const allServices = useMemo(() => {
    const map = new Map<string, true>();
    chosen.forEach((s) => s.services.forEach((sv) => map.set(sv.name, true)));
    return Array.from(map.keys());
  }, [chosen]);

  const best = useMemo(() => {
    if (chosen.length === 0) return { rating: "", price: "", distance: "" };
    const maxRating = Math.max(...chosen.map((s) => s.rating));
    const minPrice = Math.min(...chosen.map((s) => s.priceFrom));
    const minDist = Math.min(...chosen.map((s) => s.distanceKm));
    return {
      rating: chosen.find((s) => s.rating === maxRating)?.id ?? "",
      price: chosen.find((s) => s.priceFrom === minPrice)?.id ?? "",
      distance: chosen.find((s) => s.distanceKm === minDist)?.id ?? "",
    };
  }, [chosen]);

  return (
    <div className="pb-12">
      <PageHeader title="Taqqoslash" subtitle={`Tanlangan ${chosen.length}/${MAX}`} />

      {/* Picker */}
      <section className="px-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Salonlarni tanlang
        </p>
        <div className="mt-3 no-scrollbar -mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
          {salons.map((s) => {
            const on = selected.includes(s.id);
            const disabled = !on && selected.length >= MAX;
            return (
              <button
                key={s.id}
                onClick={() => toggle(s.id)}
                disabled={disabled}
                className={cn(
                  "relative w-[140px] shrink-0 rounded-2xl border p-3 text-left transition-all",
                  on
                    ? "border-foreground bg-foreground text-background"
                    : "border-border bg-background",
                  disabled && "opacity-40",
                )}
              >
                <div className="absolute right-2 top-2 grid h-6 w-6 place-items-center rounded-full bg-background/15">
                  {on ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </div>
                <div
                  className="mb-2 h-16 rounded-xl"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.78 0.03 ${(s.id.charCodeAt(0) * 30) % 360}), oklch(0.42 0.02 ${(s.id.charCodeAt(0) * 30 + 80) % 360}))`,
                  }}
                />
                <p className="line-clamp-1 text-[12px] font-bold leading-tight">{s.name}</p>
                <p className={cn("mt-0.5 text-[10px] font-bold uppercase tracking-wide", on ? "text-background/70" : "text-muted-foreground")}>
                  {s.category}
                </p>
              </button>
            );
          })}
        </div>
      </section>

      {chosen.length < 2 ? (
        <div className="mx-5 mt-8 rounded-2xl bg-surface p-8 text-center">
          <p className="text-sm font-bold">Kamida 2 ta salon tanlang</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Narx, reyting va xizmatlarni yonma-yon ko'ring
          </p>
        </div>
      ) : (
        <>
          {/* Top comparison cards */}
          <section className="mt-6 px-5">
            <div
              className="grid gap-3"
              style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }}
            >
              {chosen.map((s) => (
                <div key={s.id} className="rounded-2xl border border-border p-3">
                  <div className="flex items-start justify-between gap-1">
                    <p className="line-clamp-2 text-[13px] font-bold leading-tight">{s.name}</p>
                    <button
                      onClick={() => toggle(s.id)}
                      className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface"
                      aria-label="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                    {s.category} · {s.audience}
                  </p>
                </div>
              ))}
            </div>
          </section>

          {/* Metrics table */}
          <section className="mt-5 px-5">
            <MetricRow label="Reyting" salons={chosen} bestId={best.rating} render={(s) => (
              <span className="inline-flex items-center gap-1">
                <Star className="h-3.5 w-3.5 fill-current" /> {s.rating}
              </span>
            )} />
            <MetricRow label="Sharhlar" salons={chosen} render={(s) => `${s.reviewCount}`} />
            <MetricRow label="Narx (dan)" salons={chosen} bestId={best.price} render={(s) => shortPrice(s.priceFrom)} />
            <MetricRow label="Narx (gacha)" salons={chosen} render={(s) => shortPrice(s.priceTo)} />
            <MetricRow label="Masofa" salons={chosen} bestId={best.distance} render={(s) => (
              <span className="inline-flex items-center gap-1">
                <MapPin className="h-3.5 w-3.5" /> {s.distanceKm} km
              </span>
            )} />
            <MetricRow label="Ustalar" salons={chosen} render={(s) => `${s.staff.length}`} />
          </section>

          {/* Services matrix */}
          <section className="mt-8 px-5">
            <p className="mb-3 text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Xizmatlar
            </p>
            <div className="overflow-hidden rounded-2xl border border-border">
              {allServices.map((svcName, i) => (
                <div
                  key={svcName}
                  className={cn(
                    "grid items-center gap-2 px-3 py-3 text-[12px]",
                    i !== 0 && "border-t border-border",
                  )}
                  style={{ gridTemplateColumns: `1.4fr repeat(${chosen.length}, minmax(0, 1fr))` }}
                >
                  <span className="font-bold leading-tight">{svcName}</span>
                  {chosen.map((s) => {
                    const svc = s.services.find((x) => x.name === svcName);
                    return (
                      <span key={s.id} className="text-right font-bold tabular-nums">
                        {svc ? shortPrice(svc.price) : <span className="text-muted-foreground">—</span>}
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          </section>

          {/* CTAs */}
          <section className="mt-6 grid gap-2 px-5" style={{ gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }}>
            {chosen.map((s) => (
              <Link
                key={s.id}
                to="/salon/$id"
                params={{ id: s.id }}
                className="flex items-center justify-center gap-1 rounded-2xl bg-foreground py-3 text-[12px] font-bold text-background active:scale-[0.98]"
              >
                Tanlash <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ))}
          </section>
        </>
      )}
    </div>
  );
}

function MetricRow({
  label,
  salons: list,
  render,
  bestId,
}: {
  label: string;
  salons: { id: string }[];
  render: (s: any) => React.ReactNode;
  bestId?: string;
}) {
  return (
    <div
      className="grid items-center gap-2 border-b border-border py-3 text-[12px]"
      style={{ gridTemplateColumns: `1.1fr repeat(${list.length}, minmax(0, 1fr))` }}
    >
      <span className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      {list.map((s) => (
        <span
          key={s.id}
          className={cn(
            "text-right font-bold tabular-nums",
            bestId === s.id && "rounded-full bg-foreground px-2 py-0.5 text-background",
          )}
        >
          {render(s)}
        </span>
      ))}
    </div>
  );
}
