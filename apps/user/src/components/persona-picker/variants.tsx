import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { PersonaPhoto, type PersonaVariantProps } from "./shared";

function VariantHeader({
  label,
  activeCaption,
  count,
}: {
  label: string;
  activeCaption?: string;
  count: number;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
        {activeCaption ? (
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{activeCaption}</p>
        ) : null}
      </div>
      <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

export function PersonaVariantE(props: PersonaVariantProps) {
  const { value, onChange, readyPersonas, label, activeCaption } = props;

  return (
    <section>
      <VariantHeader label={label} activeCaption={activeCaption} count={readyPersonas.length} />
      <div role="radiogroup" aria-label={label} className="mt-3 flex flex-col gap-2">
        {readyPersonas.map((persona) => {
          const active = persona.id === value;
          return (
            <button
              key={persona.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(persona.id)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all active:scale-[0.99]",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-surface",
              )}
            >
              <PersonaPhoto persona={persona} className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{persona.label}</p>
                <p
                  className={cn(
                    "text-[10px] font-bold uppercase tracking-wide",
                    active ? "text-background/70" : "text-muted-foreground",
                  )}
                >
                  {persona.code}
                </p>
              </div>
              <span
                className={cn(
                  "grid h-6 w-6 shrink-0 place-items-center rounded-full",
                  active ? "bg-background/15" : "bg-surface",
                )}
              >
                {active ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
