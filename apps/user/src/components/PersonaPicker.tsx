import { useTranslation } from "react-i18next";
import { listReadyExplorePersonas, type ExplorePersonaId } from "@/lib/explore-personas";
import { PersonaVariantA } from "./persona-picker/variants";

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
    <div className="mt-4">
      <PersonaVariantA
        value={value}
        onChange={onChange}
        readyPersonas={readyPersonas}
        activePersona={activePersona}
        label={t("explorePage.personaLabel")}
        activeCaption={
          activePersona
            ? t("explorePage.personaActive", {
                name: activePersona.label,
                code: activePersona.code,
              })
            : undefined
        }
      />
    </div>
  );
}
