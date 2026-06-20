import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";
import type { AccountHubMeta } from "@/lib/account-hubs";
import { resolveHubItems } from "@/lib/account-hubs";

type Props = {
  hub: AccountHubMeta;
  t: (key: string) => string;
};

export function ProfileDesktopHubCard({ hub, t }: Props) {
  const Icon = hub.icon;
  const subItems = resolveHubItems(hub, t).slice(0, 3);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-border bg-surface/30 p-5 transition-colors hover:bg-surface/50">
      <Link to={hub.to as never} className="group flex flex-1 flex-col">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-background">
            <Icon className="h-6 w-6" strokeWidth={1.8} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1">
              <p className="text-sm font-bold">{t(hub.titleKey)}</p>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </div>
            <p className="mt-1 text-xs leading-snug text-muted-foreground">{t(hub.descKey)}</p>
          </div>
        </div>
      </Link>

      {subItems.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-4">
          {subItems.map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to as never}
              className="rounded-full bg-background px-3 py-1.5 text-[11px] font-bold text-muted-foreground hover:bg-surface hover:text-foreground"
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  );
}
