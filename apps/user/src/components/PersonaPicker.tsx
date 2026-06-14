import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getPersonaRefImageUrl,
  listReadyExplorePersonas,
  type ExplorePersona,
  type ExplorePersonaId,
} from "@/lib/explore-personas";

type Props = {
  value: ExplorePersonaId;
  onChange: (personaId: ExplorePersonaId) => void;
};

export function PersonaPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const readyPersonas = listReadyExplorePersonas();
  const activePersona = readyPersonas.find((persona) => persona.id === value);

  if (readyPersonas.length === 0) return null;

  return (
    <section className="mt-4" aria-labelledby="explore-persona-label">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p
            id="explore-persona-label"
            className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground"
          >
            {t("explorePage.personaLabel")}
          </p>
          {activePersona ? (
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {t("explorePage.personaActive", {
                name: activePersona.label,
                code: activePersona.code,
              })}
            </p>
          ) : null}
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          {readyPersonas.length}
        </span>
      </div>

      <div
        role="radiogroup"
        aria-label={t("explorePage.personaLabel")}
        className="no-scrollbar -mx-5 mt-3 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-1"
      >
        {readyPersonas.map((persona) => {
          const active = persona.id === value;
          return (
            <PersonaChip
              key={persona.id}
              persona={persona}
              active={active}
              onSelect={() => onChange(persona.id)}
            />
          );
        })}
      </div>
    </section>
  );
}

function PersonaChip({
  persona,
  active,
  onSelect,
}: {
  persona: ExplorePersona;
  active: boolean;
  onSelect: () => void;
}) {
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    buttonRef.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [active]);

  return (
    <button
      ref={buttonRef}
      type="button"
      role="radio"
      aria-checked={active}
      aria-label={`${persona.label} (${persona.code})`}
      onClick={onSelect}
      className={cn(
        "group shrink-0 snap-center snap-always text-left transition-all active:scale-[0.97]",
        "flex w-[84px] flex-col gap-1.5 rounded-2xl p-1.5",
        active
          ? "bg-audience-men ring-2 ring-foreground shadow-sm"
          : "bg-surface/70 hover:bg-surface",
      )}
    >
      <div
        className={cn(
          "relative aspect-[3/4] overflow-hidden rounded-xl bg-muted",
          active ? "ring-1 ring-foreground/20" : "ring-1 ring-border/70",
        )}
      >
        <img
          src={getPersonaRefImageUrl(persona.id)}
          alt={persona.label}
          loading="lazy"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
        />

        {active ? (
          <span className="absolute bottom-1.5 right-1.5 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background shadow-md">
            <Check className="h-3 w-3" strokeWidth={3} aria-hidden />
          </span>
        ) : null}
      </div>

      <div className="min-w-0 px-0.5 text-center">
        <p className="truncate text-[11px] font-bold leading-tight">{persona.label}</p>
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
