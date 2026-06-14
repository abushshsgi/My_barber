import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ExplorePersona } from "@/lib/explore-personas";
import { PersonaPhoto, useScrollActiveIntoView, type PersonaVariantProps } from "./shared";

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

function ScrollCardChip({
  persona,
  active,
  onSelect,
}: {
  persona: ExplorePersona;
  active: boolean;
  onSelect: () => void;
}) {
  const ref = useScrollActiveIntoView(active);

  return (
    <button
      ref={ref}
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${persona.label} (${persona.code})`}
      onClick={onSelect}
      className={cn(
        "group relative shrink-0 snap-center text-left transition-all active:scale-[0.97]",
        "flex w-[84px] flex-col gap-1.5 rounded-2xl p-1.5",
        active ? "bg-audience-men ring-2 ring-foreground shadow-sm" : "bg-surface/70 hover:bg-surface",
      )}
    >
      <PersonaPhoto
        persona={persona}
        className={cn(
          "aspect-[3/4] rounded-xl",
          active ? "ring-1 ring-foreground/20" : "ring-1 ring-border/70",
        )}
        imgClassName="transition-transform duration-300 group-hover:scale-[1.03]"
      />
      {active ? (
        <span className="absolute bottom-[42px] right-2.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow-md">
          <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
        </span>
      ) : null}
      <div className="min-w-0 px-0.5 text-center">
        <p className="truncate text-[11px] font-bold">{persona.label}</p>
        <p
          className={cn(
            "mt-0.5 text-[9px] font-bold uppercase tracking-[0.14em]",
            active ? "text-foreground/55" : "text-muted-foreground",
          )}
        >
          {persona.code}
        </p>
      </div>
    </button>
  );
}

export function PersonaVariantA(props: PersonaVariantProps) {
  const { value, onChange, readyPersonas, label, activeCaption } = props;

  return (
    <section aria-labelledby="explore-persona-label">
      <VariantHeader label={label} activeCaption={activeCaption} count={readyPersonas.length} />
      <div
        role="radiogroup"
        aria-label={label}
        className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1"
      >
        {readyPersonas.map((persona) => (
          <ScrollCardChip
            key={persona.id}
            persona={persona}
            active={persona.id === value}
            onSelect={() => onChange(persona.id)}
          />
        ))}
      </div>
    </section>
  );
}
