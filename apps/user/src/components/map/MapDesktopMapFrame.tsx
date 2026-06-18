import { Maximize2, Minus, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";
import type { SalonMapHandle } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  mapHandle: SalonMapHandle | null;
  onFitAll?: () => void;
  className?: string;
};

export function MapDesktopMapFrame({ children, mapHandle, onFitAll, className }: Props) {
  const { t } = useTranslation();

  return (
    <div className={cn("flex min-h-0 min-w-0 flex-1 flex-col bg-surface/30 p-4 xl:p-5", className)}>
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-border/70 bg-background shadow-[0_10px_40px_rgba(0,0,0,0.08)] ring-1 ring-black/[0.04]">
        <div className="absolute inset-0">{children}</div>

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-14 bg-gradient-to-b from-background/70 to-transparent" />

        <div className="pointer-events-none absolute right-4 top-4 z-20 flex flex-col gap-2">
          <button
            type="button"
            disabled={!mapHandle}
            onClick={() => mapHandle?.zoomIn()}
            className="pointer-events-auto flex items-center gap-2 rounded-xl border border-border/60 bg-background/95 px-3 py-2 text-[13px] font-bold shadow-[0_4px_16px_rgba(0,0,0,0.1)] backdrop-blur-sm transition hover:bg-background active:scale-[0.98] disabled:opacity-50"
            aria-label={t("map.zoomIn")}
          >
            <Plus className="h-4 w-4" strokeWidth={2.6} />
            {t("map.zoomIn")}
          </button>

          <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl border border-border/60 bg-background/95 shadow-[0_4px_16px_rgba(0,0,0,0.1)] backdrop-blur-sm">
            <button
              type="button"
              disabled={!mapHandle}
              onClick={() => mapHandle?.zoomOut()}
              className="flex h-10 w-10 items-center justify-center transition hover:bg-surface active:scale-[0.98] disabled:opacity-50"
              aria-label={t("map.zoomOut")}
            >
              <Minus className="h-4 w-4" strokeWidth={2.6} />
            </button>
            {onFitAll ? (
              <button
                type="button"
                disabled={!mapHandle}
                onClick={onFitAll}
                className="flex h-10 w-10 items-center justify-center border-t border-border/50 transition hover:bg-surface active:scale-[0.98] disabled:opacity-50"
                aria-label={t("map.fitAll")}
              >
                <Maximize2 className="h-4 w-4" strokeWidth={2.4} />
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
