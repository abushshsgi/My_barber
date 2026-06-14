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

function StoryRingChip({
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
      aria-label={persona.label}
      onClick={onSelect}
      className="flex w-[72px] shrink-0 flex-col items-center gap-2 active:scale-95"
    >
      <span
        className={cn(
          "grid h-[68px] w-[68px] place-items-center rounded-full p-[3px]",
          active
            ? "bg-gradient-to-tr from-foreground via-foreground/70 to-foreground/35"
            : "bg-border/80",
        )}
      >
        <PersonaPhoto persona={persona} className="h-full w-full rounded-full ring-2 ring-background" />
      </span>
      <span
        className={cn(
          "max-w-[72px] truncate text-[11px] font-bold",
          active ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {persona.label}
      </span>
    </button>
  );
}

export function PersonaVariantB(props: PersonaVariantProps) {
  const { value, onChange, readyPersonas, label, activeCaption } = props;

  return (
    <section>
      <VariantHeader label={label} activeCaption={activeCaption} count={readyPersonas.length} />
      <div role="radiogroup" aria-label={label} className="no-scrollbar -mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1">
        {readyPersonas.map((persona) => (
          <StoryRingChip
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
