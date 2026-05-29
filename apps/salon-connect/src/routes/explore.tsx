import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/PageHeader";
import { trendingStyles } from "@/lib/mock-data";
import { AudienceSwitch } from "@/components/AudienceSwitch";
import { useAudience } from "@/hooks/use-audience";

export const Route = createFileRoute("/explore")({
  head: () => ({ meta: [{ title: "Trend uslublar — mysaloon.uz" }] }),
  component: ExplorePage,
});

function ExplorePage() {
  const { audience } = useAudience();
  const list = trendingStyles.filter(
    (x) => audience === "all" || x.audience === "unisex" || x.audience === audience,
  );

  return (
    <div className="pb-8">
      <PageHeader showBack title="Trend uslublar" />
      <div className="px-5">
        <AudienceSwitch />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 px-5">
        {list.map((s) => (
          <div key={s.id} className="overflow-hidden">
            <div
              className="aspect-[3/4] rounded-2xl"
              style={{
                background: `linear-gradient(135deg, oklch(0.82 0.03 ${(s.id.charCodeAt(1) * 30) % 360}), oklch(0.35 0.02 ${(s.id.charCodeAt(1) * 30 + 80) % 360}))`,
              }}
            />
            <p className="mt-2 text-sm font-bold leading-tight">{s.title}</p>
            <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
              {s.audience === "men" ? "Erkaklar" : s.audience === "women" ? "Ayollar" : "Universal"} · {s.category}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
