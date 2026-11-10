import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";
import { resolveMediaUrl } from "@/lib/media-url";

export type WomenExplorePersona = {
  id: string;
  label: string;
  code: string;
  reference_url: string;
};

type Props = {
  personas: WomenExplorePersona[];
  value: string | null;
  onChange: (personaId: string) => void;
};

export function WomenPersonaPicker({ personas, value, onChange }: Props) {
  const { t } = useTranslation();
  const active = personas.find((persona) => persona.id === value) ?? personas[0];
  if (!personas.length || !active) return null;

  return (
    <section className="mt-4">
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
            {t("explorePage.personaLabel")}
          </p>
          <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
            {t("explorePage.personaActive", { name: active.label, code: active.code })}
          </p>
        </div>
        <span className="shrink-0 rounded-full border border-border bg-surface px-2.5 py-1 text-[10px] font-bold text-muted-foreground">
          {personas.length}
        </span>
      </div>
      <div
        role="radiogroup"
        aria-label={t("explorePage.personaLabel")}
        className="no-scrollbar -mx-5 mt-3 flex gap-4 overflow-x-auto px-5 pb-1"
      >
        {personas.map((persona) => {
          const selected = persona.id === active.id;
          const src = resolveMediaUrl(persona.reference_url) || persona.reference_url;
          return (
            <button
              key={persona.id}
              type="button"
              role="radio"
              aria-checked={selected}
              aria-label={persona.label}
              onClick={() => onChange(persona.id)}
              className="flex w-[72px] shrink-0 flex-col items-center gap-2"
            >
              <span
                className={cn(
                  "grid h-[68px] w-[68px] place-items-center rounded-full p-[3px]",
                  selected
                    ? "bg-gradient-to-tr from-foreground via-foreground/70 to-foreground/35"
                    : "bg-border/80",
                )}
              >
                <span className="relative block h-full w-full overflow-hidden rounded-full bg-muted ring-2 ring-background">
                  <img
                    src={src}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover object-top"
                  />
                </span>
              </span>
              <span
                className={cn(
                  "max-w-[72px] truncate text-[11px] font-bold",
                  selected ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {persona.label}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
