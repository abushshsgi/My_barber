import { createFileRoute, Link } from "@tanstack/react-router";
import { Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { EmptyState } from "@/components/EmptyState";
import { offers } from "@/lib/mock-data";
import { useAudience, matchAudience } from "@/hooks/use-audience";
import { AudienceSwitch } from "@/components/AudienceSwitch";

export const Route = createFileRoute("/offers")({
  head: () => ({ meta: [{ title: "Aksiyalar — mysaloon.uz" }] }),
  component: OffersPage,
});

function OffersPage() {
  const { audience } = useAudience();
  const list = offers.filter((o) => matchAudience(o.audience, audience));

  return (
    <div className="pb-8">
      <PageHeader showBack title="Aksiyalar" />
      <div className="px-5">
        <AudienceSwitch />
      </div>

      {list.length === 0 ? (
        <EmptyState icon={<Tag className="h-7 w-7" />} title="Aksiya topilmadi" />
      ) : (
        <div className="mt-5 space-y-3 px-5">
          {list.map((o) => (
            <Link
              key={o.id}
              to="/salon/$id"
              params={{ id: o.salonId }}
              className="flex items-center gap-4 rounded-2xl border border-border bg-surface/40 p-4 active:scale-[0.98] transition-transform"
            >
              <div className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-foreground text-background">
                <span className="text-lg font-bold">−{o.discountPct}%</span>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
                  {o.salonName}
                </p>
                <h3 className="mt-0.5 truncate text-sm font-bold">{o.title}</h3>
                <p className="mt-1 text-[11px] font-bold text-muted-foreground">
                  {o.validUntil} gacha amal qiladi
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
