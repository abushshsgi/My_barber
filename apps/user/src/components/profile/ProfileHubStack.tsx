import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";

/** Vertikal keng kartalar — watermark icon bilan. */
export function ProfileHubStack() {
  const { t } = useTranslation();

  return (
    <section className="mt-8 space-y-2.5">
      <p className="px-1 text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t("profile.variant10.hubs")}
      </p>
      {ACCOUNT_HUBS.map((hub) => {
        const Icon = hub.icon;
        return (
          <Link
            key={hub.key}
            to={hub.to as never}
            className="relative flex items-center gap-4 overflow-hidden rounded-2xl border border-border bg-background px-4 py-4 active:bg-surface/60 transition-colors"
          >
            <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface">
              <Icon className="h-5 w-5" strokeWidth={2.2} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold">{t(hub.titleKey)}</p>
              <p className="mt-0.5 line-clamp-1 text-[11px] font-medium text-muted-foreground">
                {t(hub.descKey)}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Icon
              className="pointer-events-none absolute -right-2 -bottom-3 h-20 w-20 text-foreground/[0.04]"
              strokeWidth={1.5}
              aria-hidden
            />
          </Link>
        );
      })}
    </section>
  );
}
