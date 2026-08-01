import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useMemo, useEffect, type ReactNode } from "react";
import { Check, Plus, X, Star, MapPin, ArrowRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { DesktopPageSplit } from "@/components/desktop/DesktopPageSplit";
import { MobileListPage } from "@/components/mobile/MobileListPage";
import { useSalonsList } from "@/hooks/use-salons";
import { shortPrice, type Salon } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compare")({
  head: () => ({ meta: [{ title: "Salon taqqoslash — mysaloon.uz" }] }),
  component: ComparePage,
});

const MAX = 3;

function CompareContent({ variant }: { variant: "mobile" | "desktop" }) {
  const { t } = useTranslation();
  const { data: salons = [], isLoading } = useSalonsList();
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    if (selected.length === 0 && salons.length >= 2) {
      setSelected([salons[0]!.id, salons[1]!.id]);
    }
  }, [salons, selected.length]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= MAX) return prev;
      return [...prev, id];
    });
  };

  const chosen = useMemo(
    () => selected.map((id) => salons.find((s) => s.id === id)).filter(Boolean) as Salon[],
    [selected, salons],
  );

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

  const body = (
    <>
      {isLoading ? (
        <p className="py-8 text-center text-sm text-muted-foreground">Yuklanmoqda…</p>
      ) : salons.length < 2 ? (
        <div className="neo-panel p-8 text-center">
          <p className="text-sm font-bold">Taqqoslash uchun kamida 2 ta salon kerak</p>
        </div>
      ) : (
        <>
          <section>
            <p className="label-eyebrow">Salonlarni tanlang</p>
            <div className="scrollbar-none mt-3 flex gap-3 overflow-x-auto pb-1">
              {salons.map((s) => {
                const on = selected.includes(s.id);
                const disabled = !on && selected.length >= MAX;
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    disabled={disabled}
                    className={cn(
                      "neo-panel relative w-[140px] shrink-0 p-3 text-left transition-all",
                      on && "border-primary bg-primary text-primary-foreground",
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
                    <p
                      className={cn(
                        "mt-0.5 text-[10px] font-bold uppercase tracking-wide",
                        on ? "text-primary-foreground/70" : "text-muted-foreground",
                      )}
                    >
                      {s.category}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>

          {chosen.length < 2 ? (
            <div className="neo-panel mt-6 p-8 text-center">
              <p className="text-sm font-bold">Kamida 2 ta salon tanlang</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Narx, reyting va xizmatlarni yonma-yon ko&apos;ring
              </p>
            </div>
          ) : (
            <>
              <section className="mt-6 space-y-3">
                {chosen.map((s) => (
                  <div key={s.id} className="neo-panel p-3">
                    <div className="flex items-start justify-between gap-1">
                      <p className="line-clamp-2 text-[13px] font-bold leading-tight">{s.name}</p>
                      <button
                        onClick={() => toggle(s.id)}
                        className="neo-pill grid h-7 w-7 shrink-0 place-items-center"
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
              </section>

              <section className="mt-5">
                <MetricRow
                  label="Reyting"
                  salons={chosen}
                  bestId={best.rating}
                  vertical={variant === "mobile"}
                  render={(s) => (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3.5 w-3.5 fill-current" /> {s.rating}
                    </span>
                  )}
                />
                <MetricRow label="Sharhlar" salons={chosen} vertical={variant === "mobile"} render={(s) => `${s.reviewCount}`} />
                <MetricRow
                  label="Narx (dan)"
                  salons={chosen}
                  bestId={best.price}
                  vertical={variant === "mobile"}
                  render={(s) => shortPrice(s.priceFrom)}
                />
                <MetricRow label="Narx (gacha)" salons={chosen} vertical={variant === "mobile"} render={(s) => shortPrice(s.priceTo)} />
                <MetricRow
                  label="Masofa"
                  salons={chosen}
                  bestId={best.distance}
                  vertical={variant === "mobile"}
                  render={(s) => (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {s.distanceKm} km
                    </span>
                  )}
                />
                <MetricRow label="Ustalar" salons={chosen} vertical={variant === "mobile"} render={(s) => `${s.staff.length}`} />
              </section>

              {allServices.length > 0 ? (
                <section className="mt-8">
                  <p className="label-eyebrow mb-3">Xizmatlar</p>
                  <div className="neo-panel overflow-hidden p-0">
                    {allServices.map((svcName, i) => (
                      <div
                        key={svcName}
                        className={cn(
                          "grid items-center gap-2 px-3 py-3 text-[12px]",
                          i !== 0 && "border-t-2 border-border",
                          variant === "mobile" && "grid-cols-1",
                        )}
                        style={
                          variant === "desktop"
                            ? { gridTemplateColumns: `1.4fr repeat(${chosen.length}, minmax(0, 1fr))` }
                            : undefined
                        }
                      >
                        <span className="font-bold leading-tight">{svcName}</span>
                        {variant === "mobile" ? (
                          <div className="space-y-1">
                            {chosen.map((s) => {
                              const svc = s.services.find((x) => x.name === svcName);
                              return (
                                <div key={s.id} className="flex justify-between text-[11px]">
                                  <span className="text-muted-foreground">{s.name}</span>
                                  <span className="font-bold tabular-nums">
                                    {svc ? shortPrice(svc.price) : "—"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          chosen.map((s) => {
                            const svc = s.services.find((x) => x.name === svcName);
                            return (
                              <span key={s.id} className="text-right font-bold tabular-nums">
                                {svc ? shortPrice(svc.price) : <span className="text-muted-foreground">—</span>}
                              </span>
                            );
                          })
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              ) : null}

              <section
                className={cn("mt-6 gap-2", variant === "mobile" ? "flex flex-col" : "grid")}
                style={
                  variant === "desktop"
                    ? { gridTemplateColumns: `repeat(${chosen.length}, minmax(0, 1fr))` }
                    : undefined
                }
              >
                {chosen.map((s) => (
                  <Link
                    key={s.id}
                    to="/salon/$id"
                    params={{ id: s.id }}
                    className="neo-cta flex items-center justify-center gap-1 bg-primary py-3 text-[12px] font-bold text-primary-foreground"
                  >
                    Tanlash <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ))}
              </section>
            </>
          )}
        </>
      )}
    </>
  );

  const title = t("home.quick.compare");
  const subtitle = t("comparePage.selected", { count: chosen.length, max: MAX });

  if (variant === "mobile") {
    return (
      <MobileListPage title={title} subtitle={subtitle}>
        {body}
      </MobileListPage>
    );
  }

  return (
    <div className="mx-auto max-w-4xl px-6 py-10">
      <h1 className="text-3xl font-bold">{title}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
      <div className="mt-8">{body}</div>
    </div>
  );
}

function ComparePage() {
  return <DesktopPageSplit mobile={<CompareContent variant="mobile" />} desktop={<CompareContent variant="desktop" />} />;
}

function MetricRow({
  label,
  salons: list,
  render,
  bestId,
  vertical = false,
}: {
  label: string;
  salons: Salon[];
  render: (s: Salon) => ReactNode;
  bestId?: string;
  vertical?: boolean;
}) {
  if (vertical) {
    return (
      <div className="border-b-2 border-border py-3">
        <p className="label-eyebrow mb-2">{label}</p>
        <div className="space-y-2">
          {list.map((s) => (
            <div key={s.id} className="flex items-center justify-between text-[12px]">
              <span className="truncate pr-2 font-semibold text-muted-foreground">{s.name}</span>
              <span
                className={cn(
                  "font-bold tabular-nums",
                  bestId === s.id && "neo-pill bg-primary px-2 py-0.5 text-primary-foreground",
                )}
              >
                {render(s)}
              </span>
            </div>
          ))}
        </div>
      </div>
    );
  }

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
