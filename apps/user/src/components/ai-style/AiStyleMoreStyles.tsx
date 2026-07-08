import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import {
  computeStyleMatchPercent,
  resolveTryOnPreview,
  tryOnCacheKey,
} from "@/components/ai-style/ai-style-shared";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { getTrendCoverUrl } from "@/lib/cover-images";
import {
  EXPLORE_PERSONAS,
  getPersonaStyleImageUrl,
  hasPersonaStyleAsset,
  listReadyExplorePersonas,
  type ExplorePersonaId,
} from "@/lib/explore-personas";
import {
  type HairstyleEntry,
} from "@/lib/hairstyles/catalog";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

export type MoreStyleItem = {
  entry: HairstyleEntry;
  personaId: ExplorePersonaId;
  cacheKey: string;
};

function MoreStyleCard({
  item,
  preview,
  match,
  loading,
  busy,
  onGenerate,
  onOpenPreview,
}: {
  item: MoreStyleItem;
  preview?: string;
  match?: number;
  loading: boolean;
  busy: boolean;
  onGenerate: (styleId: string, personaId: ExplorePersonaId) => void;
  onOpenPreview?: (item: MoreStyleItem, match: number) => void;
}) {
  const { t } = useTranslation();
  const personaLabel = EXPLORE_PERSONAS.find((persona) => persona.id === item.personaId)?.label ?? item.personaId;
  const [fallbackSrc, setFallbackSrc] = useState(() =>
    getPersonaStyleImageUrl(item.personaId, item.entry.slug),
  );
  const imageSrc = preview || fallbackSrc;

  return (
    <button
      type="button"
      disabled={busy && !preview}
      onClick={() => {
        if (preview && match != null) {
          onOpenPreview?.(item, match);
          return;
        }
        if (!loading) onGenerate(item.entry.id, item.personaId);
      }}
      className={cn(
        "min-w-0 text-left transition-opacity active:opacity-90",
        busy && !loading && !preview && "opacity-50",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
        <img
          src={imageSrc}
          alt={item.entry.titleUz}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setFallbackSrc(getTrendCoverUrl(item.entry.slug))}
        />

        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span className="px-2 text-center text-[10px] font-semibold text-white">
              {t("aiStylePage.tryOnGenerating")}
            </span>
          </div>
        ) : preview ? (
          <>
            <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-black">
              {t("aiStylePage.tryOnBadge")}
            </span>
            {match != null ? (
              <span className="absolute right-2 top-2 rounded-full bg-black px-2 py-0.5 text-[9px] font-bold text-white">
                {t("aiStylePage.matchPct", { value: match })}
              </span>
            ) : null}
          </>
        ) : (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-xl bg-black py-2 text-[10px] font-bold text-white">
            <Sparkles className="h-3 w-3" />
            {t("aiStylePage.tryOnMe")}
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-bold text-black">{item.entry.titleUz}</p>
      <p className="truncate text-[10px] font-semibold text-neutral-500">{personaLabel}</p>
    </button>
  );
}

export function AiStyleMoreStyles({
  audience,
  excludeIds,
  result,
  tryOnByStyle = {},
  tryOnLoadingId,
  onGenerateTryOn,
  onOpenPreview,
}: {
  audience: Audience;
  excludeIds: string[];
  result: AiAnalysisResult;
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string, personaId?: ExplorePersonaId) => void;
  onOpenPreview?: (item: MoreStyleItem, match: number) => void;
}) {
  const { t } = useTranslation();
  const { data: list = [], isLoading } = useHairstyles(audience, null, {
    ignoreAgeGroup: true,
  });

  const suggestionMatchById = useMemo(() => {
    const map = new Map<string, number>();
    for (const suggestion of result.suggestions) {
      map.set(suggestion.id, suggestion.match);
    }
    return map;
  }, [result.suggestions]);

  const resolveMatch = (entry: HairstyleEntry): number =>
    suggestionMatchById.get(entry.id) ??
    computeStyleMatchPercent(entry, result.faceShapeKey, result.hairTypeKey);

  const items = useMemo(() => {
    const exclude = new Set(excludeIds);
    const personas = listReadyExplorePersonas();
    const out: MoreStyleItem[] = [];

    for (const persona of personas) {
      for (const entry of list) {
        if (exclude.has(entry.id)) continue;
        if (!hasPersonaStyleAsset(persona.id, entry.slug)) continue;
        out.push({
          entry,
          personaId: persona.id,
          cacheKey: tryOnCacheKey(entry.id, persona.id),
        });
      }
    }

    return out.sort((a, b) => {
      const personaOrder =
        personas.findIndex((persona) => persona.id === a.personaId) -
        personas.findIndex((persona) => persona.id === b.personaId);
      if (personaOrder !== 0) return personaOrder;
      return a.entry.titleUz.localeCompare(b.entry.titleUz, "uz");
    });
  }, [list, excludeIds]);

  if (!onGenerateTryOn) return null;

  return (
    <div id="ai-style-more-styles" className="mt-8 space-y-3 pt-2">
      <div>
        <h3 className="text-sm font-bold text-black">{t("aiStylePage.moreStylesTitle")}</h3>
        <p className="mt-1 text-[11px] text-neutral-500">{t("aiStylePage.moreStylesHint")}</p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 gap-3">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="animate-pulse">
              <div className="aspect-[3/4] rounded-2xl bg-neutral-100" />
              <div className="mt-2 h-3 w-2/3 rounded bg-neutral-100" />
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="text-xs text-neutral-500">{t("aiStylePage.moreStylesEmpty")}</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {items.map((item) => {
            const preview = resolveTryOnPreview(tryOnByStyle, item.entry.id, item.personaId);
            const match = preview ? resolveMatch(item.entry) : undefined;
            return (
              <MoreStyleCard
                key={item.cacheKey}
                item={item}
                preview={preview}
                match={match}
                loading={tryOnLoadingId === item.cacheKey}
                busy={Boolean(tryOnLoadingId)}
                onGenerate={onGenerateTryOn}
                onOpenPreview={onOpenPreview}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
