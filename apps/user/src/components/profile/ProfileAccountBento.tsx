import { Link } from "@tanstack/react-router";
import { useTranslation } from "react-i18next";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";
import { cn } from "@/lib/utils";

const BENTO_LAYOUT: Record<(typeof ACCOUNT_HUBS)[number]["key"], string> = {
  activity: "col-span-2 min-h-[88px] border-2 border-foreground bg-surface",
  payments: "col-span-1 min-h-[108px] bg-background",
  household: "col-span-1 min-h-[108px] bg-background",
  preferences: "col-span-2 min-h-[72px] bg-surface/60",
};

/** Asimmetrik bento — ro'yxat, karusel va accordion emas. */
export function ProfileAccountBento() {
  const { t } = useTranslation();

  return (
    <section className="mt-8">
      <div className="mb-3 flex items-end justify-between px-1">
        <p className="text-sm font-bold tracking-tight text-foreground">
          {t("profile.variant8.account")}
        </p>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
          {ACCOUNT_HUBS.length} {t("profile.variant8.sections")}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {ACCOUNT_HUBS.map((hub) => {
          const Icon = hub.icon;
          const count = hub.items.length;
          const isWide = hub.key === "activity" || hub.key === "preferences";

          return (
            <Link
              key={hub.key}
              to={hub.to as never}
              className={cn(
                "group relative flex overflow-hidden rounded-2xl border border-border p-4 active:scale-[0.98] transition-transform",
                BENTO_LAYOUT[hub.key],
                isWide ? "items-center gap-4" : "flex-col justify-between",
              )}
            >
              <div
                className={cn(
                  "grid shrink-0 place-items-center rounded-xl bg-foreground text-background",
                  isWide ? "h-11 w-11" : "h-10 w-10",
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>

              <div className={cn("min-w-0", isWide ? "flex-1" : "mt-3")}>
                <p className="text-sm font-bold leading-tight">{t(hub.titleKey)}</p>
                {!isWide && (
                  <p className="mt-1 line-clamp-2 text-[10px] font-medium leading-snug text-muted-foreground">
                    {t(hub.descKey)}
                  </p>
                )}
              </div>

              <span
                className={cn(
                  "font-bold tabular-nums text-foreground",
                  isWide ? "text-2xl" : "absolute right-3 top-3 text-lg text-muted-foreground/40",
                )}
                aria-hidden
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
