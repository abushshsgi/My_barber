import type { ReactNode } from "react";
import { Maximize2, Minimize2, Minus, Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { SalonMapHandle } from "@/components/map/SalonMap";
import { cn } from "@/lib/utils";

type Props = {
  expanded: boolean;
  mapHandle: SalonMapHandle | null;
  onExpand: () => void;
  onCollapse: () => void;
};

function ControlBtn({
  onClick,
  disabled,
  label,
  className,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "pointer-events-auto flex items-center justify-center bg-foreground text-background shadow-[0_6px_24px_rgba(0,0,0,0.22)] transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50",
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Xarita ustida — 2GIS canvas dan tashqarida, fixed */
export function MapDesktopMapControls({ expanded, mapHandle, onExpand, onCollapse }: Props) {
  const { t } = useTranslation();

  return (
    <div className="pointer-events-none fixed right-4 top-[4.75rem] z-[500] hidden flex-col items-end gap-2 lg:flex xl:right-6">
      <ControlBtn
        onClick={expanded ? onCollapse : onExpand}
        label={expanded ? t("map.collapseMap") : t("map.expandMap")}
        className="h-11 gap-2 rounded-xl px-3.5"
      >
        {expanded ? (
          <Minimize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        ) : (
          <Maximize2 className="h-4 w-4 shrink-0" strokeWidth={2.4} />
        )}
        <span className="text-[12px] font-bold">
          {expanded ? t("map.collapseMap") : t("map.expandMap")}
        </span>
      </ControlBtn>

      <div className="pointer-events-auto flex flex-col overflow-hidden rounded-xl shadow-[0_6px_24px_rgba(0,0,0,0.22)]">
        <ControlBtn
          onClick={() => mapHandle?.zoomIn()}
          disabled={!mapHandle}
          label={t("map.zoomIn")}
          className="h-11 w-11 rounded-none border-b border-background/15"
        >
          <Plus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
        <ControlBtn
          onClick={() => mapHandle?.zoomOut()}
          disabled={!mapHandle}
          label={t("map.zoomOut")}
          className="h-11 w-11 rounded-none"
        >
          <Minus className="h-4 w-4" strokeWidth={2.8} />
        </ControlBtn>
      </div>
    </div>
  );
}
