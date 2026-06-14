import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { getPersonaRefImageUrl, type ExplorePersona, type ExplorePersonaId } from "@/lib/explore-personas";

export type PersonaVariantProps = {
  value: ExplorePersonaId;
  onChange: (personaId: ExplorePersonaId) => void;
  readyPersonas: ExplorePersona[];
  activePersona?: ExplorePersona;
  label: string;
  activeCaption?: string;
};

export function useScrollActiveIntoView(active: boolean) {
  const ref = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!active) return;
    ref.current?.scrollIntoView({
      inline: "center",
      block: "nearest",
      behavior: "smooth",
    });
  }, [active]);

  return ref;
}

export function PersonaPhoto({
  persona,
  className,
  imgClassName,
}: {
  persona: ExplorePersona;
  className?: string;
  imgClassName?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden bg-muted", className)}>
      <img
        src={getPersonaRefImageUrl(persona.id)}
        alt={persona.label}
        loading="lazy"
        decoding="async"
        className={cn("absolute inset-0 h-full w-full object-cover object-top", imgClassName)}
      />
    </div>
  );
}
