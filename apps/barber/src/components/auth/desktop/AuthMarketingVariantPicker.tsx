import type { AuthMarketingVariant } from "@/lib/auth-marketing-variant";
import { AUTH_MARKETING_VARIANTS } from "@/lib/auth-marketing-variant";
import { cn } from "@/lib/utils";

type Props = {
  value: AuthMarketingVariant;
  onChange: (variant: AuthMarketingVariant) => void;
};

/** Chap marketing panel — 5 layout (desktop, signup). */
export function AuthMarketingVariantPicker({ value, onChange }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] hidden justify-start px-4 md:flex">
      <div className="pointer-events-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-400">Chap panel · 5 layout</p>
        <div className="flex flex-wrap gap-1">
          {AUTH_MARKETING_VARIANTS.map((v) => {
            const active = value === v.id;
            return (
              <button
                key={v.id}
                type="button"
                title={v.desc}
                onClick={() => onChange(v.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1.5 text-left transition-colors",
                  active ? "bg-primary text-primary-foreground" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
                )}
              >
                <span className="block text-[10px] font-bold">{v.label}</span>
                <span className="mt-0.5 block max-w-[80px] truncate text-[8px] opacity-80">{v.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
