import {
  type DesktopUiVariant,
  DESKTOP_UI_VARIANTS,
  desktopVariantMeta,
} from "@/lib/desktop-variant";
import { cn } from "@/lib/utils";

type Props = {
  value: DesktopUiVariant;
  onChange: (variant: DesktopUiVariant) => void;
};

export function DesktopVariantPicker({ value, onChange }: Props) {
  const activeIndex = DESKTOP_UI_VARIANTS.indexOf(value) + 1;

  return (
    <div className="fixed bottom-6 left-1/2 z-50 w-[min(560px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border border-border bg-background/95 p-3 shadow-[0_8px_40px_rgba(0,0,0,0.12)] backdrop-blur-md">
      <div className="flex items-center justify-between gap-2 px-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
          Desktop UI variant
        </p>
        <span className="rounded-full bg-foreground px-2 py-0.5 text-[10px] font-bold text-background">
          {activeIndex}/3
        </span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {DESKTOP_UI_VARIANTS.map((id) => {
          const active = value === id;
          const meta = desktopVariantMeta[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onChange(id)}
              className={cn(
                "rounded-xl border px-2 py-2 text-left transition-colors",
                active ? "border-foreground bg-surface" : "border-transparent bg-surface/50 hover:bg-surface",
              )}
            >
              <p className="text-[11px] font-bold">{meta.label}</p>
              <p className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground">{meta.hint}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
