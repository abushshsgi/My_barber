import { Link } from "@tanstack/react-router";
import { LayoutGrid } from "lucide-react";
import {
  HOME_GI_LAYOUTS,
  homeGiLayoutMeta,
  persistHomeGiLayout,
  type HomeGiLayoutId,
} from "@/lib/home-gi-layouts";
import { cn } from "@/lib/utils";

type Props = {
  active: HomeGiLayoutId;
  /** fixed — bosh sahifa pastidagi panel; inline — sahifa ichida */
  variant?: "fixed" | "inline" | "compact";
  className?: string;
  linkTo?: "/" | "/home/layout-variants";
};

export function HomeGiLayoutPicker({
  active,
  variant = "inline",
  className,
  linkTo = "/",
}: Props) {
  const activeMeta = homeGiLayoutMeta(active);

  const chips = (
    <div
      className={cn(
        "flex flex-wrap items-center gap-1.5",
        variant === "fixed" && "max-w-full overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      )}
      role="tablist"
      aria-label="Home layout tanlash"
    >
      {HOME_GI_LAYOUTS.map((layout) => {
        const isActive = layout.id === active;
        return (
          <Link
            key={layout.id}
            to={linkTo}
            search={{ gi: layout.id }}
            replace={linkTo === "/"}
            onClick={() => persistHomeGiLayout(layout.id)}
            role="tab"
            aria-selected={isActive}
            title={layout.title}
            className={cn(
              "shrink-0 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors",
              isActive
                ? "border-foreground bg-foreground text-background shadow-sm"
                : "border-border bg-background text-foreground hover:bg-surface",
              variant === "compact" && "min-w-[2rem] text-center",
            )}
          >
            {layout.id}
          </Link>
        );
      })}
    </div>
  );

  if (variant === "fixed") {
    return (
      <div
        className={cn(
          "fixed bottom-4 left-1/2 z-50 w-[min(96vw,920px)] -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-3 shadow-xl backdrop-blur",
          className,
        )}
      >
        <div className="mb-2 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <LayoutGrid className="h-4 w-4 shrink-0 text-muted-foreground" />
            <p className="truncate text-xs font-bold">{activeMeta.title}</p>
          </div>
          <Link
            to="/home/layout-variants"
            search={{ gi: active }}
            className="shrink-0 text-[11px] font-semibold text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Taqqoslash
          </Link>
        </div>
        {chips}
      </div>
    );
  }

  if (variant === "compact") {
    return <div className={className}>{chips}</div>;
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Layout tanlang</p>
      {chips}
      <p className="text-xs text-muted-foreground">{activeMeta.subtitle}</p>
    </div>
  );
}

export function HomeGiLayoutPreviewStrip({
  active,
  className,
}: {
  active?: HomeGiLayoutId;
  className?: string;
}) {
  return (
    <HomeGiLayoutPicker
      active={active ?? "1"}
      variant="compact"
      className={className}
      linkTo="/"
    />
  );
}
