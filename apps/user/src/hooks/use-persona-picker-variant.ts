import { useCallback, useState } from "react";

export type PersonaPickerVariantId = "a" | "b" | "c" | "d" | "e";

export const PERSONA_PICKER_VARIANTS: {
  id: PersonaPickerVariantId;
  label: string;
  hint: string;
}[] = [
  { id: "a", label: "A", hint: "Portrait kartochka" },
  { id: "b", label: "B", hint: "Story ring" },
  { id: "c", label: "C", hint: "Segment bar" },
  { id: "d", label: "D", hint: "Hero spotlight" },
  { id: "e", label: "E", hint: "Compact pill" },
];

export const PERSONA_PICKER_VARIANT_STORAGE_KEY = "mysaloon.explore.personaPickerVariant";

function readStoredVariant(): PersonaPickerVariantId {
  if (typeof window === "undefined") return "a";
  const stored = window.localStorage.getItem(PERSONA_PICKER_VARIANT_STORAGE_KEY);
  if (stored === "a" || stored === "b" || stored === "c" || stored === "d" || stored === "e") {
    return stored;
  }
  return "a";
}

export function usePersonaPickerVariant() {
  const [variantId, setVariantIdState] = useState<PersonaPickerVariantId>(readStoredVariant);

  const setVariantId = useCallback((next: PersonaPickerVariantId) => {
    setVariantIdState(next);
    window.localStorage.setItem(PERSONA_PICKER_VARIANT_STORAGE_KEY, next);
  }, []);

  return { variantId, setVariantId };
}
