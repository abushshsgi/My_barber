import { cn } from "@/lib/utils";

export type MapDiscoveryTab = "salons" | "barbers";

type Props = {
  value: MapDiscoveryTab;
  onChange: (tab: MapDiscoveryTab) => void;
  className?: string;
};

export function MapDiscoveryTabs({ value, onChange, className }: Props) {
  return (
    <div
      className={cn(
        "inline-flex rounded-full border border-border bg-background p-1 text-xs font-bold",
        className,
      )}
      role="tablist"
    >
      <button
        type="button"
        role="tab"
        aria-selected={value === "salons"}
        onClick={() => onChange("salons")}
        className={cn(
          "rounded-full px-4 py-2 transition-colors",
          value === "salons" ? "bg-foreground text-background" : "text-muted-foreground",
        )}
      >
        Salonlar
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "barbers"}
        onClick={() => onChange("barbers")}
        className={cn(
          "rounded-full px-4 py-2 transition-colors",
          value === "barbers" ? "bg-foreground text-background" : "text-muted-foreground",
        )}
      >
        Ustalar
      </button>
    </div>
  );
}
