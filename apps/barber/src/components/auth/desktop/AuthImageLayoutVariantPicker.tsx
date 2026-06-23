import type { AuthImageLayoutVariant } from "@/lib/auth-image-layout-variant";
import { AUTH_IMAGE_LAYOUT_VARIANTS } from "@/lib/auth-image-layout-variant";
import { cn } from "@/lib/utils";

type Props = {
  value: AuthImageLayoutVariant;
  onChange: (variant: AuthImageLayoutVariant) => void;
};

export function AuthImageLayoutVariantPicker({ value, onChange }: Props) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] hidden justify-center px-3 md:flex">
      <div className="pointer-events-auto max-h-[34vh] w-full max-w-3xl overflow-y-auto rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          Rasm layout · 10 variant
        </p>
        <div className="flex flex-wrap justify-center gap-1">
          {AUTH_IMAGE_LAYOUT_VARIANTS.map((v) => {
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
                <span className="mt-0.5 block max-w-[72px] truncate text-[8px] opacity-80">{v.desc}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
