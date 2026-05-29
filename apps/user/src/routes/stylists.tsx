import { createFileRoute, Link } from "@tanstack/react-router";
import { Star, TrendingUp, Award } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { salons } from "@/lib/mock-data";

export const Route = createFileRoute("/stylists")({
  head: () => ({ meta: [{ title: "Top ustalar — mysaloon.uz" }] }),
  component: Stylists,
});

function initials(name: string) {
  return name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
}

function Stylists() {
  const all = salons.flatMap((s) => s.staff.map((b) => ({ ...b, salonName: s.name })));
  const sorted = [...all].sort((a, b) => b.rating - a.rating);

  return (
    <div className="pb-8">
      <PageHeader title="Top ustalar" subtitle="Eng yuqori reytingli ustalar" />

      {/* Podium top 3 */}
      <div className="px-5">
        <div className="flex items-end justify-between gap-2 rounded-2xl bg-surface p-4">
          {[1, 0, 2].map((rank, idx) => {
            const b = sorted[rank];
            if (!b) return <div key={idx} className="flex-1" />;
            const heights = [80, 110, 70];
            const medals = ["🥈", "🥇", "🥉"];
            return (
              <div key={b.id} className="flex flex-1 flex-col items-center">
                <div className="text-2xl">{medals[idx]}</div>
                <div
                  className="my-2 grid h-12 w-12 place-items-center rounded-full text-xs font-bold text-background"
                  style={{
                    background: `linear-gradient(135deg, oklch(0.55 0.05 ${(b.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(b.id.charCodeAt(0) * 30 + 60) % 360}))`,
                  }}
                >
                  {initials(b.name)}
                </div>
                <p className="text-center text-[11px] font-bold leading-tight">{b.name}</p>
                <div className="mt-1 flex items-center gap-0.5 text-[10px] font-bold">
                  <Star className="h-2.5 w-2.5 fill-foreground" strokeWidth={0} />
                  {b.rating}
                </div>
                <div
                  className="mt-2 w-full rounded-t-lg bg-foreground"
                  style={{ height: heights[idx] }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Full leaderboard */}
      <div className="mt-6 px-5">
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            To'liq reyting
          </h2>
        </div>
        <div className="space-y-2">
          {sorted.map((b, i) => (
            <div
              key={b.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-background p-3"
            >
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface text-[11px] font-bold">
                {i + 1}
              </span>
              <div
                className="grid h-11 w-11 shrink-0 place-items-center rounded-full text-xs font-bold text-background"
                style={{
                  background: `linear-gradient(135deg, oklch(0.55 0.05 ${(b.id.charCodeAt(0) * 30) % 360}), oklch(0.25 0.02 ${(b.id.charCodeAt(0) * 30 + 60) % 360}))`,
                }}
              >
                {initials(b.name)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{b.name}</p>
                <p className="truncate text-[11px] font-medium text-muted-foreground">
                  {b.role} · {b.salonName}
                </p>
              </div>
              <div className="flex flex-col items-end gap-0.5">
                <span className="flex items-center gap-1 text-xs font-bold">
                  <Star className="h-3 w-3 fill-foreground" strokeWidth={0} />
                  {b.rating}
                </span>
                {i < 3 && <Award className="h-3 w-3 text-foreground" />}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
