import { createFileRoute, Link } from "@tanstack/react-router";
import { Clock, Flame, Star } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { salons, shortPrice } from "@/lib/mock-data";

export const Route = createFileRoute("/today")({
  head: () => ({ meta: [{ title: "Bugungi bo'sh vaqtlar — mysaloon.uz" }] }),
  component: TodayDeals,
});

const SLOTS = ["13:30", "14:00", "15:15", "16:45", "18:00", "19:30"];

function TodayDeals() {
  return (
    <div className="pb-8">
      <PageHeader title="Bugungi bo'sh vaqtlar" subtitle="So'nggi soatlar uchun chegirma" />

      <div className="px-5">
        <div className="rounded-2xl bg-foreground p-4 text-background">
          <div className="flex items-center gap-2">
            <Flame className="h-4 w-4" />
            <span className="text-[10px] font-bold uppercase tracking-[0.18em]">Tezkor takliflar</span>
          </div>
          <p className="mt-2 text-lg font-bold leading-tight">
            Bugun bo'sh qolgan vaqtlarga 30% gacha chegirma
          </p>
          <p className="mt-1 text-xs font-medium text-background/70">
            Yaqin atrofdagi salonlardan tezkor bron qiling
          </p>
        </div>
      </div>

      <div className="mt-4 space-y-3 px-5">
        {salons.map((s, i) => {
          const discount = [15, 20, 25, 30][i % 4];
          const slot = SLOTS[i % SLOTS.length];
          return (
            <Link
              key={s.id}
              to="/salon/$id"
              params={{ id: s.id }}
              className="flex gap-3 rounded-2xl border border-border bg-background p-3 active:bg-surface"
            >
              <div
                className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl"
                style={{
                  background: `linear-gradient(135deg, oklch(0.85 0.04 ${(Number(s.id) * 80) % 360}), oklch(0.55 0.06 ${(Number(s.id) * 80 + 50) % 360}))`,
                }}
              >
                <span className="absolute left-1.5 top-1.5 rounded-md bg-foreground px-1.5 py-0.5 text-[10px] font-bold text-background">
                  -{discount}%
                </span>
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="truncate text-sm font-bold">{s.name}</h3>
                <p className="truncate text-[11px] font-medium text-muted-foreground">{s.address}</p>
                <div className="mt-1 flex items-center gap-2 text-[11px] font-bold">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                    {s.rating}
                  </span>
                  <span className="text-muted-foreground">·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {slot}
                  </span>
                </div>
                <div className="mt-1.5 flex items-baseline gap-2">
                  <span className="text-sm font-bold">
                    {shortPrice(Math.round((s.priceFrom * (100 - discount)) / 100))}
                  </span>
                  <span className="text-[10px] font-bold text-muted-foreground line-through">
                    {shortPrice(s.priceFrom)}
                  </span>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
