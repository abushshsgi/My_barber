import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "react-i18next";
import { ProfileSubpageLayout } from "@/components/profile/ProfileSubpageLayout";
import {
  getHubByKey,
  resolveHubItems,
  type AccountHubKey,
} from "@/lib/account-hubs";

type Props = {
  hubKey: AccountHubKey;
};

export function AccountHubPage({ hubKey }: Props) {
  const { t } = useTranslation();
  const hub = getHubByKey(hubKey);
  const items = resolveHubItems(hub, t);

  return (
    <ProfileSubpageLayout title={t(hub.pageTitleKey)} subtitle={t(hub.descKey)}>
      <ul className="divide-y divide-border rounded-2xl border border-border bg-background overflow-hidden">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.to + item.label}>
              <Link
                to={item.to as never}
                params={item.params as never}
                search={item.search as never}
                className="flex items-center gap-4 px-4 py-4 active:bg-surface/80 transition-colors"
              >
                <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-surface">
                  <Icon className="h-[18px] w-[18px]" strokeWidth={2.2} />
                </div>
                <span className="min-w-0 flex-1 text-sm font-bold">{item.label}</span>
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
