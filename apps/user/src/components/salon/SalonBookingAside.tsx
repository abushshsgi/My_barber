import { Link } from "@tanstack/react-router";
import { Calendar, MapPin } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonSectionUi } from "@/components/desktop/pages/salon-layouts/section-styles";
import type { Salon } from "@/lib/mock-data";
import { SalonBookingCalendar } from "@/components/salon/SalonBookingCalendar";
import { resolveDefaultServiceIdsForBarber } from "@/lib/salon-services";
import { cn } from "@/lib/utils";

const ASIDE_STYLES: Record<
  SalonSectionUi["aside"],
  { shell: string; cta: string; label: string }
> = {
  classic: {
    shell: "rounded-2xl border border-border bg-background p-6 shadow-[0_8px_28px_rgba(0,0,0,0.08)]",
    cta: "rounded-xl bg-foreground text-background hover:opacity-90",
    label: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  },
  accent: {
    shell:
      "rounded-2xl border border-border bg-gradient-to-b from-muted/50 to-background p-6 shadow-[0_8px_28px_rgba(0,0,0,0.06)] ring-1 ring-foreground/5",
    cta: "rounded-xl bg-foreground text-background hover:opacity-90",
    label: "text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground",
  },
  dark: {
    shell: "rounded-2xl border border-foreground bg-foreground p-6 text-background shadow-xl",
    cta: "rounded-xl bg-background text-foreground hover:opacity-90",
    label: "text-xs font-semibold uppercase tracking-wide text-background/70",
  },
  glass: {
    shell:
      "rounded-2xl border border-white/20 bg-background/80 p-6 shadow-[0_8px_32px_rgba(0,0,0,0.12)] backdrop-blur-md",
    cta: "rounded-2xl bg-foreground text-background hover:opacity-90",
    label: "text-xs font-semibold uppercase tracking-wide text-muted-foreground",
  },
  minimal: {
    shell: "rounded-xl border border-dashed border-border bg-transparent p-4",
    cta: "rounded-lg border-2 border-foreground bg-transparent text-foreground hover:bg-muted/30",
    label: "text-[10px] font-bold uppercase tracking-widest text-muted-foreground",
  },
};

export function SalonBookingAside({
  salon,
  className,
  compact = false,
  asideVariant = "classic",
}: {
  salon: Salon;
  className?: string;
  compact?: boolean;
  asideVariant?: SalonSectionUi["aside"];
}) {
  const { t } = useTranslation();
  const styles = ASIDE_STYLES[asideVariant];
  const isDark = asideVariant === "dark";
  const calendarBarberId =
    salon.staff.find((s) => s.isBookable !== false)?.id ?? salon.staff[0]?.id;
  const calendarServiceIds = resolveDefaultServiceIdsForBarber(
    salon.services,
    calendarBarberId,
  );

  return (
    <aside className={cn(styles.shell, className)}>
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className={styles.label}>{t("salon.bookNow")}</p>
          <p className={cn("mt-1 text-sm", isDark ? "text-background/80" : "text-muted-foreground")}>
            {t("salon.bookingHint", { defaultValue: "Xizmat va vaqtni tanlang" })}
          </p>
        </div>
        {salon.rating > 0 ? (
          <span
            className={cn(
              "rounded-lg px-2.5 py-1 text-sm font-bold tabular-nums",
              isDark ? "bg-background/15 text-background" : "bg-muted",
            )}
          >
            ★ {salon.rating.toFixed(1)}
          </span>
        ) : null}
      </div>

      <p
        className={cn(
          "mt-4 flex items-start gap-2 text-sm",
          isDark ? "text-background/75" : "text-muted-foreground",
        )}
      >
        <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{salon.address}</span>
      </p>

      {!compact ? (
        <SalonBookingCalendar
          salonId={salon.id}
          barberId={calendarBarberId}
          serviceIds={calendarServiceIds.length ? calendarServiceIds : undefined}
          months={1}
          className={cn(
            "mt-5 !space-y-3 [&_h2]:text-base",
            isDark && "[&_*]:text-background [&_.text-muted-foreground]:text-background/60",
          )}
        />
      ) : (
        <div
          className={cn(
            "mt-4 flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm",
            isDark ? "border-background/20 bg-background/10" : "border-border bg-muted/20",
          )}
        >
          <Calendar className="h-4 w-4 shrink-0" />
          <span>{t("salon.bookingHint", { defaultValue: "Xizmat va vaqtni tanlang" })}</span>
        </div>
      )}

      <Link
        to="/booking/$salonId"
        params={{ salonId: salon.id }}
        className={cn(
          "mt-5 flex w-full items-center justify-center py-3.5 text-sm font-bold transition-opacity",
          styles.cta,
        )}
      >
        {t("salon.bookNow")}
      </Link>
    </aside>
  );
}
