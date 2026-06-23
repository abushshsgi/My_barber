import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { AUTH_DESKTOP_VARIANTS } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

type Props = {
  value: AuthDesktopVariant;
  onChange: (variant: AuthDesktopVariant) => void;
};

/** Desktop /auth — layout tanlash (vaqtinchalik preview). */
export function AuthDesktopVariantPicker({ value, onChange }: Props) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-6 z-[60] hidden justify-center px-4 md:flex"
      aria-label="Desktop auth layout preview"
    >
      <div className="pointer-events-auto flex max-w-full flex-col items-center gap-2">
        <p className="rounded-full bg-zinc-900/80 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-zinc-300 backdrop-blur-md">
          Desktop layout preview — yoqqanini tanlang
        </p>
        <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-zinc-950/90 p-1.5 shadow-2xl backdrop-blur-xl">
          {AUTH_DESKTOP_VARIANTS.map((variant) => {
            const active = value === variant.id;
            return (
              <button
                key={variant.id}
                type="button"
                title={variant.desc}
                onClick={() => onChange(variant.id)}
                className={cn(
                  "rounded-xl px-3 py-2 text-left transition-colors",
                  active
                    ? "bg-amber-400 text-zinc-950"
                    : "text-zinc-300 hover:bg-white/10 hover:text-white",
                )}
              >
                <span className="block text-[11px] font-bold leading-none">{variant.label}</span>
                <span
                  className={cn(
                    "mt-0.5 block text-[9px] font-medium leading-tight",
                    active ? "text-zinc-800/80" : "text-zinc-500",
                  )}
                >
                  {variant.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
