import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ACCOUNT_HUBS } from "@/lib/account-hubs";

/** Teng 2×2 hub grid — bento emas. */
export function ProfileHubEqualGrid() {
  const { t } = useTranslation();

  return (
    <section className="mt-8">
      <p className="mb-3 px-1 text-sm font-bold tracking-tight">{t("profile.variant9.hubs")}</p>
      <div className="grid grid-cols-2 gap-2.5">
        {ACCOUNT_HUBS.map((hub) => {
          const Icon = hub.icon;
          return (
            <Link
              key={hub.key}
              to={hub.to as never}
              className="flex min-h-[112px] flex-col justify-between rounded-2xl border border-border bg-surface/40 p-4 active:scale-[0.98] transition-transform"
            >
              <div className="flex items-start justify-between">
                <div className="grid h-10 w-10 place-items-center rounded-xl border border-border bg-background">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-bold leading-tight">{t(hub.titleKey)}</p>
                <p className="mt-1 text-[10px] font-medium text-muted-foreground">
                  {hub.items.length} {t("profile.variant8.items")}
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
