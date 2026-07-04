import { Sparkles } from "lucide-react";
import { resolveBookingImpressions } from "@/lib/client-impressions";
import { cn } from "@/lib/utils";

type Props = {
  barberName: string;
  kinds?: string[];
  className?: string;
  plain?: boolean;
};

/** Sartarosh yakunlagandan keyin belgilagan ijobiy ifodalar — faqat shu mijoz ko'radi. */
export function BookingBarberImpressions({ barberName, kinds, className, plain }: Props) {
  const items = resolveBookingImpressions(kinds);
  if (!items.length) return null;

  return (
    <div className={cn(plain ? "p-0" : "rounded-2xl bg-emerald-50/80 p-5", className)}>
      <div className={cn("mb-3", plain ? "" : "flex items-start gap-2.5")}>
        {!plain ? (
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white">
            <Sparkles className="size-4" />
          </span>
        ) : null}
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
            className={cn(
              "inline-flex items-center gap-2 text-sm font-medium",
              plain
                ? "text-foreground"
                : "rounded-full bg-background/90 px-3 py-2 font-semibold shadow-sm",
            )}
          >
            <Icon
              className={cn("size-4", plain ? "text-muted-foreground" : "text-emerald-700")}
              strokeWidth={1.75}
            />
            {customerLabel}
          </span>
        ))}
      </div>
    </div>
  );
}
