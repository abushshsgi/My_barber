import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import { useIsLgUp } from "@/hooks/use-mobile";
import {
  getHubByKey,
  resolveHubItems,
  type AccountHubKey,
} from "@/lib/account-hubs";

type Props = {
  hubKey: AccountHubKey;
};

/** Desktopda `/account/*` hub index kerak emas — sidebar barcha linklarni beradi. */
export function AccountHubPage({ hubKey }: Props) {
  const isLgUp = useIsLgUp();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const hub = getHubByKey(hubKey);
  const items = resolveHubItems(hub, t);

  useEffect(() => {
    if (isLgUp) {
      void navigate({ to: "/profile", replace: true });
    }
  }, [isLgUp, navigate]);

  if (isLgUp) return null;

  return (
    <ProfileSubpageLayout
      title={t(hub.pageTitleKey)}
      subtitle={t(hub.descKey)}
      backTo="/profile"
      strictBack
      flush
    >
      <ul className="divide-y divide-border/70">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to + item.label + JSON.stringify(item.search ?? {})}>
              <Link
                to={item.to as never}
                params={item.params as never}
                search={item.search as never}
                className="flex items-center gap-4 px-4 py-4 transition-colors active:bg-surface/60"
              >
                <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-surface">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </div>
                <div className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">{item.label}</span>
                  {item.hint ? (
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {item.hint}
                    </span>
                  ) : null}
                </div>
                {item.badge ? (
                  <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                    {item.badge}
                  </span>
                ) : (
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </ProfileSubpageLayout>
  );
}
