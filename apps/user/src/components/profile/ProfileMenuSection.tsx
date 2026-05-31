import { Link } from "@tanstack/react-router";
import { ChevronRight, type LucideIcon } from "lucide-react";

export type ProfileMenuItem = {
  icon: LucideIcon;
  label: string;
  to: string;
  hint?: string;
  search?: Record<string, string>;
  params?: Record<string, string>;
  badge?: string;
};

type Props = {
  title: string;
  items: ProfileMenuItem[];
  inset?: boolean;
};

export function ProfileMenuSection({ title, items, inset }: Props) {
  return (
    <section className={inset ? "mt-0" : "mt-6 px-5"}>
      {title ? (
        <h2 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          {title}
        </h2>
      ) : null}
      <div className="overflow-hidden rounded-2xl border border-border">
        {items.map((item, i) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              to={item.to as never}
              params={item.params as never}
              search={item.search as never}
              className={
                "flex items-center gap-3 px-4 py-3.5 transition-colors active:bg-surface" +
                (i < items.length - 1 ? " border-b border-border" : "")
              }
            >
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface">
                <Icon className="h-4 w-4" strokeWidth={2} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-sm font-bold">{item.label}</span>
                {item.hint && (
                  <p className="mt-0.5 truncate text-[11px] font-medium text-muted-foreground">
                    {item.hint}
                  </p>
                )}
              </div>
              {item.badge && (
                <span className="shrink-0 rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
                  {item.badge}
                </span>
              )}
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
            </Link>
          );
        })}
      </div>
    </section>
  );
}
