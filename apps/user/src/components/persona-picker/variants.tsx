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

export function PersonaVariantC(props: PersonaVariantProps) {
  const { value, onChange, readyPersonas, label, activeCaption } = props;

  return (
    <section>
      <VariantHeader label={label} activeCaption={activeCaption} count={readyPersonas.length} />
      <div
        role="radiogroup"
        aria-label={label}
        className={cn(
          "mt-3 grid gap-1.5 rounded-2xl border border-border bg-surface p-1",
          readyPersonas.length === 3 ? "grid-cols-3" : "grid-cols-2",
        )}
      >
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
                "relative flex flex-col items-center gap-1.5 rounded-xl px-1 py-2.5 transition-all active:scale-[0.98]",
                active ? "bg-audience-men ring-2 ring-foreground" : "bg-background/80 hover:bg-background",
              )}
            >
              <PersonaPhoto persona={persona} className="h-11 w-11 rounded-full ring-1 ring-border/60" />
              <span className="text-[11px] font-bold leading-tight">{persona.label}</span>
              <span className="text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                {persona.code}
              </span>
              {active ? (
                <span className="absolute right-1 top-1 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background">
                  <Check className="h-2.5 w-2.5" strokeWidth={3} />
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </section>
  );
}
