import type { AuthDesktopVariant } from "@/lib/auth-desktop-variant";
import { AUTH_DESKTOP_VARIANTS } from "@/lib/auth-desktop-variant";
import { cn } from "@/lib/utils";

type Props = {
  value: AuthDesktopVariant;
  onChange: (variant: AuthDesktopVariant) => void;
};

export function AuthDesktopVariantPicker({ value, onChange }: Props) {
  const linear = AUTH_DESKTOP_VARIANTS.filter((v) => v.family === "linear");
  const figma = AUTH_DESKTOP_VARIANTS.filter((v) => v.family === "figma");
  const framer = AUTH_DESKTOP_VARIANTS.filter((v) => v.family === "framer");
  const supabase = AUTH_DESKTOP_VARIANTS.filter((v) => v.family === "supabase");

  const renderGroup = (title: string, items: typeof AUTH_DESKTOP_VARIANTS) => (
    <div className="flex flex-col gap-1">
      <p className="px-1 text-[9px] font-bold uppercase tracking-[0.14em] text-zinc-500">{title}</p>
      <div className="flex flex-wrap gap-1">
        {items.map((variant) => {
          const active = value === variant.id;
          return (
            <button
              key={variant.id}
              type="button"
              title={variant.desc}
              onClick={() => onChange(variant.id)}
              className={cn(
                "rounded-lg px-2.5 py-1.5 text-left transition-colors",
                active ? "bg-white text-zinc-900" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700",
              )}
            >
              <span className="block text-[10px] font-bold">{variant.label}</span>
              <span className="mt-0.5 block max-w-[88px] truncate text-[8px] opacity-70">{variant.desc}</span>
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[60] hidden justify-center px-3 md:flex">
      <div className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-white/10 bg-zinc-950/95 p-3 shadow-2xl backdrop-blur-xl">
        <p className="mb-2 text-center text-[10px] font-bold uppercase tracking-widest text-zinc-400">
          10 variant · vector + effektlar
        </p>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {renderGroup("Linear", linear)}
          {renderGroup("Figma", figma)}
          {renderGroup("Framer", framer)}
          {renderGroup("Supabase", supabase)}
        </div>
      </div>
    </div>
  );
}
