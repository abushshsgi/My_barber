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
  const subItems = resolveHubItems(hub, t).slice(0, 4);

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-background transition-shadow hover:shadow-md">
      <Link to={hub.to as never} className="group flex items-start gap-4 p-5 hover:bg-surface/30">
        <div className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-surface">
          <Icon className="h-5 w-5" strokeWidth={1.9} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold">{t(hub.titleKey)}</h3>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
          </div>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{t(hub.descKey)}</p>
        </div>
      </Link>

      {subItems.length > 0 ? (
        <ul className="divide-y divide-border border-t border-border">
          {subItems.map((item) => {
            const SubIcon = item.icon;
            return (
              <li key={item.to + item.label}>
                <Link
                  to={item.to as never}
                  className="flex items-center gap-3 px-5 py-3 text-sm transition-colors hover:bg-surface/40"
                >
                  <SubIcon className="h-4 w-4 shrink-0 text-muted-foreground" strokeWidth={1.9} />
                  <span className="min-w-0 flex-1 font-semibold">{item.label}</span>
                  <ChevronRight className="h-3.5 w-3.5 shrink-0 text-muted-foreground/60" />
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </article>
  );
}
