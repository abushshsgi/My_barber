import { cn } from "@/lib/utils";

export type HomeLayoutVariant = "v1" | "v2" | "v3";

const STORAGE_KEY = "mysaloon.homeLayout";

export function readHomeLayoutVariant(): HomeLayoutVariant {
  if (typeof window === "undefined") return "v1";
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved === "v1" || saved === "v2" || saved === "v3") return saved;
  return "v1";
}

export function persistHomeLayoutVariant(variant: HomeLayoutVariant) {
  localStorage.setItem(STORAGE_KEY, variant);
}

const OPTIONS: { id: HomeLayoutVariant; label: string; hint: string }[] = [
  { id: "v1", label: "V1", hint: "Banner + chap kartochkalar · xarita" },
  { id: "v2", label: "V2", hint: "Filter · xarita yuqorida · discovery" },
  { id: "v3", label: "V3", hint: "Hero + xarita bir qator" },
];

type Props = {
  value: HomeLayoutVariant;
  onChange: (variant: HomeLayoutVariant) => void;
};

export function HomeLayoutSwitcher({ value, onChange }: Props) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-400/60 bg-amber-50/50 px-4 py-3 dark:bg-amber-950/20">
      <p className="text-xs font-bold uppercase tracking-[0.14em] text-amber-800 dark:text-amber-200">
        Layout tanlash (vaqtincha)
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        {OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            title={opt.hint}
            className={cn(
              "rounded-xl px-4 py-2 text-left text-sm font-semibold transition",
              value === opt.id
                ? "bg-foreground text-background shadow-sm"
                : "bg-background text-foreground ring-1 ring-border hover:bg-surface",
            )}
          >
            {opt.label}
            <span className="mt-0.5 block text-[11px] font-normal opacity-75">{opt.hint}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
