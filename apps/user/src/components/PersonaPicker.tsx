import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import {
  PERSONA_PICKER_VARIANTS,
  usePersonaPickerVariant,
  type PersonaPickerVariantId,
} from "@/hooks/use-persona-picker-variant";
import { listReadyExplorePersonas, type ExplorePersonaId } from "@/lib/explore-personas";
import { PERSONA_VARIANT_RENDERERS } from "./persona-picker/variants";

type Props = {
  value: ExplorePersonaId;
  onChange: (personaId: ExplorePersonaId) => void;
};

export function PersonaPicker({ value, onChange }: Props) {
  const { t } = useTranslation();
  const { variantId, setVariantId } = usePersonaPickerVariant();
  const readyPersonas = listReadyExplorePersonas();
  const activePersona = readyPersonas.find((persona) => persona.id === value);

  if (readyPersonas.length === 0) return null;

  const VariantView = PERSONA_VARIANT_RENDERERS[variantId];
  const variantProps = {
    value,
    onChange,
    readyPersonas,
    activePersona,
    label: t("explorePage.personaLabel"),
    activeCaption: activePersona
      ? t("explorePage.personaActive", {
          name: activePersona.label,
          code: activePersona.code,
        })
      : undefined,
  };

  return (
    <div className="mt-4">
      <PersonaVariantLab value={variantId} onChange={setVariantId} />
      <VariantView {...variantProps} />
    </div>
  );
}

function PersonaVariantLab({
  value,
  onChange,
}: {
  value: PersonaPickerVariantId;
  onChange: (id: PersonaPickerVariantId) => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-4 rounded-2xl border border-dashed border-foreground/25 bg-surface/40 p-3">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {t("explorePage.personaVariantLab")}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">{t("explorePage.personaVariantHint")}</p>
      <div
        role="radiogroup"
        aria-label={t("explorePage.personaVariantLab")}
        className="mt-2.5 grid grid-cols-5 gap-1.5"
      >
        {PERSONA_PICKER_VARIANTS.map((variant) => {
          const active = variant.id === value;
          return (
            <button
              key={variant.id}
              type="button"
              role="radio"
              aria-checked={active}
              title={variant.hint}
              onClick={() => onChange(variant.id)}
              className={cn(
                "rounded-xl border px-1 py-2 text-center transition-all active:scale-[0.97]",
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-background hover:bg-surface",
              )}
            >
              <span className="block text-xs font-bold">{variant.label}</span>
              <span className={cn("mt-0.5 block text-[8px] font-semibold leading-tight", active ? "text-background/75" : "text-muted-foreground")}>
                {variant.hint}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
