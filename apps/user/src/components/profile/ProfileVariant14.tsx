import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Bell, Settings, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import {
  ACCOUNT_HUBS,
  resolveHubItems,
  type AccountHubKey,
} from "@/lib/account-hubs";
import { useProfileScreen } from "@/components/profile/useProfileScreen";
import { formatPrice, userProfile, walletSummary } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

const HUB_KEYS: AccountHubKey[] = ["activity", "payments", "household", "preferences"];

/** Variant 14 — Tab Hub: tab + plitka grid (C layout). */
export function ProfileVariant14() {
  const { t } = useTranslation();
  const { audience } = useProfileScreen();
  const [activeHub, setActiveHub] = useState<AccountHubKey>("activity");
  const audienceLabel = t(`audience.${audience}`);
  const initials = userProfile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2);

  const hub = ACCOUNT_HUBS.find((h) => h.key === activeHub)!;
  const tiles = resolveHubItems(hub, t);

  return (
    <div className="min-h-[70vh] bg-background pb-6 pt-[calc(env(safe-area-inset-top)+10px)]">
      <div className="flex items-start justify-between gap-3 px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-surface text-sm font-bold">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-bold">{userProfile.name}</p>
            <p className="text-[12px] font-medium text-muted-foreground">{audienceLabel}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link
            to="/wallet"
            className="inline-flex items-center gap-1 rounded-full bg-foreground px-2.5 py-1.5 text-[11px] font-bold text-background active:opacity-90"
          >
            {formatPrice(walletSummary.balance)}
            <Wallet className="h-3 w-3" strokeWidth={2.5} />
          </Link>
          <Link
            to="/notifications"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface active:opacity-80"
            aria-label={t("notifications.title")}
          >
            <Bell className="h-4 w-4" strokeWidth={2} />
          </Link>
          <Link
            to="/settings"
            className="grid h-9 w-9 place-items-center rounded-full bg-surface active:opacity-80"
            aria-label={t("profile.settings")}
          >
            <Settings className="h-4 w-4" strokeWidth={2} />
          </Link>
        </div>
      </div>

      <div className="no-scrollbar mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        {HUB_KEYS.map((key) => {
          const meta = ACCOUNT_HUBS.find((h) => h.key === key)!;
          const active = activeHub === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setActiveHub(key)}
              className={cn(
                "shrink-0 rounded-full px-4 py-2 text-[12px] font-bold transition-colors",
                active
                  ? "bg-foreground text-background"
                  : "border border-border bg-card text-muted-foreground",
              )}
            >
              {t(meta.titleKey).split(" ")[0]}
            </button>
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5 px-5">
        {tiles.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.to + item.label}
              to={item.to as never}
              params={item.params as never}
              search={item.search as never}
              className="relative flex min-h-[100px] flex-col justify-between rounded-2xl border border-border bg-card p-4 shadow-sm active:scale-[0.98] transition-transform"
            >
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-surface">
                <Icon className="h-5 w-5" strokeWidth={2.2} />
              </div>
              <span className="text-[13px] font-bold leading-snug">{item.label}</span>
              {item.badge && (
                <span className="absolute right-3 top-3 rounded-full bg-foreground px-1.5 py-0.5 text-[9px] font-bold text-background">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>

      <p className="mt-6 px-5 text-center text-[11px] font-medium text-muted-foreground">
        {t(hub.descKey)}
      </p>
    </div>
  );
}
