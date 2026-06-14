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

/** A — Portrait kartochkalar, gorizontal scroll */
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

/** B — Instagram story uslubi, doira ring */
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

/** C — AudienceSwitch kabi segment bar */
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

/** D — Katta hero + kichik thumb row */
export function PersonaVariantD(props: PersonaVariantProps) {
  const { value, onChange, readyPersonas, activePersona, label, activeCaption } = props;
  const hero = activePersona ?? readyPersonas[0];

  return (
    <section>
      <VariantHeader label={label} activeCaption={activeCaption} count={readyPersonas.length} />
      {hero ? (
        <div className="relative mt-3 overflow-hidden rounded-3xl bg-surface">
          <PersonaPhoto persona={hero} className="aspect-[16/10] w-full" />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/75 via-foreground/10 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-4 text-background">
            <p className="text-lg font-bold">{hero.label}</p>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-background/75">{hero.code}</p>
          </div>
        </div>
      ) : null}
      <div role="radiogroup" aria-label={label} className="mt-3 flex justify-center gap-3">
        {readyPersonas.map((persona) => {
          const active = persona.id === value;
          return (
            <button
              key={persona.id}
              type="button"
              role="radio"
              aria-checked={active}
              aria-label={persona.label}
              onClick={() => onChange(persona.id)}
              className={cn(
                "rounded-full p-0.5 transition-all active:scale-95",
                active ? "ring-2 ring-foreground" : "ring-1 ring-border opacity-70 hover:opacity-100",
              )}
            >
              <PersonaPhoto persona={persona} className="h-12 w-12 rounded-full" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** E — Compact pill, avatar + nom bir qatorda */
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

export const PERSONA_VARIANT_RENDERERS = {
  a: PersonaVariantA,
  b: PersonaVariantB,
  c: PersonaVariantC,
  d: PersonaVariantD,
  e: PersonaVariantE,
} as const;
