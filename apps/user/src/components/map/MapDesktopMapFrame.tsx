import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SalonMapHandle } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  expanded: boolean;
  mapHandle: SalonMapHandle | null;
  onExpand: () => void;
  onCollapse: () => void;
  className?: string;
};

function MapControlButton({
  onClick,
  disabled,
  label,
  children,
  className,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex items-center justify-center bg-background text-foreground transition hover:bg-surface active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

export function MapDesktopMapFrame({
  children,
  expanded,
  mapHandle,
  onExpand,
  onCollapse,
  className,
}: Props) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "relative flex min-h-0 min-w-0 flex-col",
        expanded
          ? "fixed inset-y-0 right-0 z-[60] w-full bg-background lg:left-[240px]"
          : "min-w-0 flex-1 bg-surface/30 p-4 xl:p-5",
        className,
      )}
    >
      {/* O'ng tomonda: kattalashtirish + zoom — xarita canvas tashqarisida */}
      <div className="pointer-events-none absolute right-5 top-6 z-[100] flex flex-col items-end gap-2 xl:right-6">
        <MapControlButton
          onClick={expanded ? onCollapse : onExpand}
          label={expanded ? t("map.collapseMap") : t("map.expandMap")}
          className="pointer-events-auto h-11 gap-2 rounded-xl border border-border/70 px-3.5 shadow-[0_4px_20px_rgba(0,0,0,0.14)]"
        >
          {expanded ? (
            <Minimize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
          ) : (
            <Maximize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
          )}
          <span className="text-[12px] font-bold">
            {expanded ? t("map.collapseMap") : t("map.expandMap")}
          </span>
        </MapControlButton>

        <div className="pointer-events-auto flex w-11 flex-col overflow-hidden rounded-xl border border-border/70 bg-background shadow-[0_4px_20px_rgba(0,0,0,0.14)]">
          <MapControlButton
            onClick={() => mapHandle?.zoomIn()}
            disabled={!mapHandle}
            label={t("map.zoomIn")}
            className="h-11 w-11 border-b border-border/60"
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
          </MapControlButton>
          <MapControlButton
            onClick={() => mapHandle?.zoomOut()}
            disabled={!mapHandle}
            label={t("map.zoomOut")}
            className="h-11 w-11"
          >
            <Minus className="h-4 w-4" strokeWidth={2.6} />
          </MapControlButton>
        </div>
      </div>

      <div
        className={cn(
          "relative isolate z-0 flex min-h-0 w-full flex-1 flex-col overflow-hidden bg-background",
          expanded
            ? "h-full rounded-none"
            : "rounded-[22px] border border-border/70 shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]",
        )}
      >
        <div className="absolute inset-0 z-0">{children}</div>
      </div>
    </div>
  );
}
