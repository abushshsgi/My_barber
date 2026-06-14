import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  EXPLORE_PERSONAS,
  getPersonaRefImageUrl,
  hasPersonaReference,
  type ExplorePersonaId,
} from "@/lib/explore-personas";

type Props = {
  value: ExplorePersonaId;
  onChange: (personaId: ExplorePersonaId) => void;
};

export function PersonaPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const activePersona = EXPLORE_PERSONAS.find((persona) => persona.id === value);

  return (
    <div className="mt-4">
      <p className="mb-2 text-[10px] font-bold uppercase tracking-wide text-muted-foreground">
        {t("explorePage.personaLabel")}
      </p>
      <div
        role="radiogroup"
        aria-label={t("explorePage.personaLabel")}
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {EXPLORE_PERSONAS.map((persona) => {
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
      {activePersona ? (
        <p className="mt-2 text-[10px] text-muted-foreground">
          {t("explorePage.personaActive", {
            name: activePersona.label,
            code: activePersona.code,
          })}
        </p>
      ) : null}
    </div>
  );
}

function PersonaChip({
  persona,
  active,
  onSelect,
}: {
  persona: (typeof EXPLORE_PERSONAS)[number];
  active: boolean;
  onSelect: () => void;
}) {
  const [imgFailed, setImgFailed] = useState(false);
  const showRef = hasPersonaReference(persona.id) && !imgFailed;

  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        "relative shrink-0 rounded-2xl border p-1.5 transition-all active:scale-[0.98]",
        active ? "border-foreground bg-surface ring-2 ring-foreground" : "border-border bg-background",
      )}
    >
      <div className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-muted">
        {showRef ? (
          <img
            src={getPersonaRefImageUrl(persona.id)}
            alt={persona.label}
            loading="lazy"
            decoding="async"
            onError={() => setImgFailed(true)}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        ) : (
          <span className="text-lg font-bold text-muted-foreground">{persona.label.slice(0, 1)}</span>
        )}
        {active ? (
          <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-foreground text-background">
            <Check className="h-2.5 w-2.5" strokeWidth={3} />
          </span>
        ) : null}
      </div>
      <p className="mt-1 max-w-[56px] truncate text-center text-[10px] font-bold">{persona.label}</p>
      <p className="text-center text-[9px] font-semibold text-muted-foreground">{persona.code}</p>
    </button>
  );
}
