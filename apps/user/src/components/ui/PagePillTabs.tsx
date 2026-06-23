import { cn } from "@/lib/utils";

export type PillTab<T extends string> = { id: T; label: string; count?: number };

type Props<T extends string> = {
  tabs: PillTab<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
};

export function PagePillTabs<T extends string>({ tabs, value, onChange, className }: Props<T>) {
  return (
    <div className={cn("flex gap-2 overflow-x-auto pb-0.5 no-scrollbar", className)}>
      {tabs.map((tab) => {
        const active = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            className={cn(
              "inline-flex shrink-0 items-center gap-2 rounded-full px-4 py-2.5 text-sm font-bold transition-all active:scale-[0.98]",
              active
                ? "bg-foreground text-background shadow-sm"
                : "border border-border bg-background text-muted-foreground hover:text-foreground",
            )}
          >
            {tab.label}
            {tab.count != null ? (
              <span
                className={cn(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums",
                  active ? "bg-background/20 text-background" : "bg-surface text-muted-foreground",
                )}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
