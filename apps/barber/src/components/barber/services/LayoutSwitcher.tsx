import { useNavigate } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import type { ServicesLayoutId } from "./types";

const LABELS: Record<ServicesLayoutId, string> = {
  1: "Classic",
  2: "Studio",
  3: "Compact",
  4: "Cards",
  5: "Split",
  6: "Stacked",
  7: "Sidebar",
  8: "Minimal",
};

export function LayoutSwitcher({ current }: { current: ServicesLayoutId }) {
  const navigate = useNavigate();

  return (
    <div className="rounded-xl border border-dashed border-primary/30 bg-primary/5 p-3">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Dizayn variantlari — yoqqanini tanlang
      </p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(LABELS) as unknown as ServicesLayoutId[]).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() =>
              void navigate({
                to: "/barber/services",
                search: { layout: id },
                replace: true,
              })
            }
            className={cn(
              "rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors",
              current === id
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-foreground hover:border-foreground/50",
            )}
          >
            {id}. {LABELS[id]}
          </button>
        ))}
      </div>
    </div>
  );
}
