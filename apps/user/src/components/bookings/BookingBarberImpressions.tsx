import { Sparkles } from "lucide-react";
import { resolveBookingImpressions } from "@/lib/client-impressions";
import { cn } from "@/lib/utils";

type Props = {
  barberName: string;
  kinds?: string[];
  className?: string;
};

/** Sartarosh yakunlagandan keyin belgilagan ijobiy ifodalar — faqat shu mijoz ko'radi. */
export function BookingBarberImpressions({ barberName, kinds, className }: Props) {
  const items = resolveBookingImpressions(kinds);
  if (!items.length) return null;

  return (
    <div className={cn("rounded-2xl bg-emerald-50/80 p-5", className)}>
      <div className="mb-3 flex items-start gap-2.5">
        <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0">
          <h2 className="text-base font-bold text-foreground">Sartarosh izohi</h2>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {barberName} siz haqingizda quyidagilarni belgiladi
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {items.map(({ kind, icon: Icon, customerLabel }) => (
          <span
            key={kind}
            className="inline-flex items-center gap-2 rounded-full bg-background/90 px-3 py-2 text-sm font-semibold text-foreground shadow-sm"
          >
            <Icon className="size-4 text-emerald-700" strokeWidth={1.75} />
            {customerLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
