import { Maximize2, Minimize2 } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  expanded: boolean;
  onExpand: () => void;
  onCollapse: () => void;
  className?: string;
};

export function MapDesktopMapFrame({
  children,
  expanded,
  onExpand,
  onCollapse,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "flex min-h-0 min-w-0 flex-1 flex-col",
        expanded ? "absolute inset-0 z-50 bg-background" : "bg-surface/30 p-4 xl:p-5",
        className,
      )}
    >
      <div
        className={cn(
          "relative flex min-h-0 flex-1 flex-col overflow-hidden bg-background",
          expanded
            ? "h-full rounded-none border-0 shadow-none"
            : "rounded-[22px] border border-border/70 shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]",
        )}
      >
        <div className="absolute inset-0">{children}</div>

        <div className="absolute right-4 top-4 z-30">
          {expanded ? (
            <button
              type="button"
              onClick={onCollapse}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-[13px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition hover:bg-surface active:scale-[0.98]"
              aria-label={t("map.collapseMap")}
            >
              <Minimize2 className="h-4 w-4" strokeWidth={2.4} />
              {t("map.collapseMap")}
            </button>
          ) : (
            <button
              type="button"
              onClick={onExpand}
              className="flex items-center gap-2 rounded-xl border border-border/60 bg-background px-3.5 py-2.5 text-[13px] font-bold shadow-[0_4px_20px_rgba(0,0,0,0.14)] transition hover:bg-surface active:scale-[0.98]"
              aria-label={t("map.expandMap")}
            >
              <Maximize2 className="h-4 w-4" strokeWidth={2.4} />
              {t("map.expandMap")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
