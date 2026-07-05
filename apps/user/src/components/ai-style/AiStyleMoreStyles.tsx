import { Loader2, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useExplorePersona } from "@/hooks/use-explore-persona";
import { useHairstyles } from "@/hooks/use-hairstyles";
import { getTrendCoverUrl } from "@/lib/cover-images";
import {
  getHairstyleDisplayUrl,
  hasDisplayableHairstyleImage,
  type HairstyleEntry,
} from "@/lib/hairstyles/catalog";
import { hasPersonaStyleAsset } from "@/lib/explore-personas";
import type { Audience } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

function MoreStyleCard({
  entry,
  preview,
  loading,
  busy,
  onGenerate,
}: {
  entry: HairstyleEntry;
  preview?: string;
  loading: boolean;
  busy: boolean;
  onGenerate: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  const [fallbackSrc, setFallbackSrc] = useState(() => getHairstyleDisplayUrl(entry));
  const imageSrc = preview || fallbackSrc;

  return (
    <button
      type="button"
      disabled={busy}
      onClick={() => {
        if (!preview && !loading) onGenerate(entry.id);
      }}
      className={cn(
        "min-w-0 text-left transition-opacity active:opacity-90",
        busy && !loading && "opacity-50",
        preview && "cursor-default",
      )}
    >
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
        <img
          src={imageSrc}
          alt={entry.titleUz}
          loading="lazy"
          className="h-full w-full object-cover object-top"
          onError={() => setFallbackSrc(getTrendCoverUrl(entry.slug))}
        />

        {loading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/50 backdrop-blur-[1px]">
            <Loader2 className="h-5 w-5 animate-spin text-white" />
            <span className="px-2 text-center text-[10px] font-semibold text-white">
              {t("aiStylePage.tryOnGenerating")}
            </span>
          </div>
        ) : preview ? (
          <span className="absolute left-2 top-2 rounded-full bg-white px-2 py-0.5 text-[9px] font-bold text-black">
            {t("aiStylePage.tryOnBadge")}
          </span>
        ) : (
          <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-xl bg-black py-2 text-[10px] font-bold text-white">
            <Sparkles className="h-3 w-3" />
            {t("aiStylePage.tryOnMe")}
          </span>
        )}
      </div>
      <p className="mt-2 truncate text-xs font-bold text-black">{entry.titleUz}</p>
    </button>
  );
}

export function AiStyleMoreStyles({
  audience,
  excludeIds,
  tryOnByStyle = {},
  tryOnLoadingId,
  onGenerateTryOn,
}: {
  audience: Audience;
  excludeIds: string[];
  tryOnByStyle?: Record<string, string>;
  tryOnLoadingId?: string | null;
  onGenerateTryOn?: (styleId: string) => void;
}) {
  const { t } = useTranslation();
  const { personaId } = useExplorePersona();
  const { data: list = [], isLoading } = useHairstyles(audience, personaId);

  const items = useMemo(() => {
    const exclude = new Set(excludeIds);
    return list.filter((entry) => {
      if (exclude.has(entry.id)) return false;
      if (!hasDisplayableHairstyleImage(entry)) return false;
      if (entry.audience === "men" && personaId) {
        return hasPersonaStyleAsset(personaId, entry.slug);
      }
      return true;
    });
  }, [list, excludeIds, personaId]);

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
          {items.map((entry) => (
            <MoreStyleCard
              key={entry.id}
              entry={entry}
              preview={tryOnByStyle[entry.id]}
              loading={tryOnLoadingId === entry.id}
              busy={Boolean(tryOnLoadingId)}
              onGenerate={onGenerateTryOn}
            />
          ))}
        </div>
      )}
    </div>
  );
}
