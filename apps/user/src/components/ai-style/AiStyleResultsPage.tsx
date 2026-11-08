import { useNavigate } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight, Loader2, MessageCircle, Palette, Share2, Sparkles } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { FaceAnalysisRings } from "@/components/ai-style/FaceAnalysisRings";
import { AiStyleMoreStyles } from "@/components/ai-style/AiStyleMoreStyles";
import { AiStyleShareSheet } from "@/components/ai-style/AiStyleShareSheet";
import {
  isCatalogStyleId,
  resolveTryOnPreview,
  tryOnCacheKey,
  type AiAnalysisResult,
  type AiSuggestion,
} from "@/components/ai-style/ai-style-shared";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import type { Audience } from "@/lib/mock-data";
import { stashMorphStudioDraft } from "@/lib/morf-ai-studio-session";
import { cn } from "@/lib/utils";

function shuffle<T>(items: T[]): T[] {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
}

type Props = {
  result: AiAnalysisResult;
  photo: string | null;
  tryOnByStyle: Record<string, string>;
  tryOnLoadingId: string | null;
  menPersonaId?: ExplorePersonaId | null;
  audience?: Audience;
  onBack: () => void;
  onGenerateTryOn: (styleId: string, personaId?: ExplorePersonaId, title?: string) => void;
};

export function AiStyleResultsPage({
  result,
  photo,
  tryOnByStyle,
  tryOnLoadingId,
  menPersonaId,
  audience,
  onBack,
  onGenerateTryOn,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [shareOpen, setShareOpen] = useState(false);

  const featured = useMemo(() => result.suggestions.slice(0, 3), [result.suggestions]);
  const others = useMemo(() => shuffle(result.suggestions.slice(3)), [result.suggestions]);

  const active = featured[index] ?? featured[0] ?? null;
  const activePreview = active
    ? resolveTryOnPreview(tryOnByStyle, active.id, menPersonaId)
    : undefined;
  const activeLoading =
    Boolean(active) && tryOnLoadingId === tryOnCacheKey(active!.id, menPersonaId);

  const goTo = (next: number) => {
    const clamped = Math.max(0, Math.min(next, featured.length - 1));
    setIndex(clamped);
    const root = scrollerRef.current;
    if (!root) return;
    root.scrollTo({ left: clamped * root.clientWidth, behavior: "smooth" });
  };

  const openStudio = () => {
    if (!activePreview || !active) return;
    stashMorphStudioDraft({
      image: activePreview,
      baseImage: activePreview,
      beforeImage: photo || undefined,
      styleId: active.id,
      styleTitle: active.title,
      source: "tryon",
    });
    void navigate({ to: "/ai-style/studio" });
  };

  const onCardAction = (item: AiSuggestion) => {
    const preview = resolveTryOnPreview(tryOnByStyle, item.id, menPersonaId);
    if (preview) {
      setShareOpen(true);
      return;
    }
    if (!isCatalogStyleId(item.id)) return;
    onGenerateTryOn(item.id, undefined, item.title);
  };

  return (
    <div className="relative min-h-[100dvh] bg-[#FAFAFA]">
      <div className="overflow-y-auto pb-[max(28px,env(safe-area-inset-bottom))]">
        {featured.length > 0 ? (
          <section className="bg-white pb-4">
            <div className="relative">
              <div
                ref={scrollerRef}
                className="flex snap-x snap-mandatory overflow-x-auto no-scrollbar"
                onScroll={(event) => {
                  const el = event.currentTarget;
                  const next = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
                  if (next !== index) setIndex(Math.max(0, Math.min(next, featured.length - 1)));
                }}
              >
                {featured.map((item, i) => {
                  const preview = resolveTryOnPreview(tryOnByStyle, item.id, menPersonaId);
                  const loading = tryOnLoadingId === tryOnCacheKey(item.id, menPersonaId);
                  return (
                    <article key={item.id} className="relative w-full shrink-0 snap-center bg-black">
                      <div className="relative min-h-[min(72dvh,640px)] w-full">
                        <img
                          key={preview || item.imageUrl}
                          src={preview || item.imageUrl}
                          alt=""
                          fetchPriority="high"
                          decoding="sync"
                          className="absolute inset-0 h-full w-full bg-neutral-100 object-contain object-center"
                        />
                        {loading ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
                            <Loader2 className="h-8 w-8 animate-spin text-white" />
                            <p className="text-xs font-semibold text-white">
                              {t("aiStylePage.tryOnGenerating")}
                            </p>
                          </div>
                        ) : null}
                        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/70 to-transparent px-4 pb-5 pt-24">
                          <div className="mb-3 flex items-end justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-white/80">
                                {preview && !loading
                                  ? t("aiStylePage.tryOnBadge")
                                  : `#${i + 1}`}
                              </p>
                              <h2 className="truncate text-[22px] font-extrabold text-white">
                                {item.title}
                              </h2>
                            </div>
                            <span className="shrink-0 rounded-full bg-white px-2.5 py-1 text-[12px] font-extrabold text-black">
                              {t("aiStylePage.matchPct", { value: Math.round(item.match) })}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={loading}
                            onClick={() => onCardAction(item)}
                            className="flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-bold text-[#0A0A0A] active:opacity-90 disabled:opacity-70"
                          >
                            {loading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : preview ? (
                              <Share2 className="h-4 w-4" />
                            ) : (
                              <Sparkles className="h-4 w-4" />
                            )}
                            {preview ? t("aiStylePage.share") : t("aiStylePage.generateCta")}
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>

              <div
                className="pointer-events-none absolute inset-x-0 top-0 z-10 flex items-center justify-between px-3"
                style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
              >
                <button
                  type="button"
                  onClick={onBack}
                  className="pointer-events-auto grid size-8 place-items-center rounded-full bg-white/94"
                  aria-label={t("common.back")}
                >
                  <ChevronLeft className="h-[18px] w-[18px] text-[#0A0A0A]" strokeWidth={2.4} />
                </button>
                <span className="rounded-full bg-white/94 px-3 py-1.5 text-[12px] font-extrabold text-[#0A0A0A]">
                  {t("aiStylePage.recsCount", {
                    count: featured.length,
                    defaultValue: `${featured.length} ta tavsiya`,
                  })}
                </span>
                <span className="size-8" />
              </div>

              {index > 0 ? (
                <button
                  type="button"
                  onClick={() => goTo(index - 1)}
                  className="absolute left-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95"
                  aria-label={t("common.back")}
                >
                  <ChevronLeft className="h-5 w-5 text-[#0A0A0A]" />
                </button>
              ) : null}
              {index < featured.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goTo(index + 1)}
                  className="absolute right-2 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-white/95"
                >
                  <ChevronRight className="h-5 w-5 text-[#0A0A0A]" />
                </button>
              ) : null}
            </div>

            {featured.length > 1 ? (
              <div className="mt-3 flex justify-center gap-1.5">
                {featured.map((item, i) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => goTo(i)}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      i === index ? "w-5 bg-black" : "w-1.5 bg-neutral-300",
                    )}
                  />
                ))}
              </div>
            ) : null}

            {active?.reason ? (
              <p className="mt-3 px-4 text-[14px] leading-relaxed text-[#111]">{active.reason}</p>
            ) : null}

            {activePreview ? (
              <button
                type="button"
                onClick={openStudio}
                className="mx-4 mt-3 flex min-h-12 w-[calc(100%-2rem)] items-center justify-center gap-2 rounded-2xl bg-[#F5F5F5] text-sm font-bold text-[#0A0A0A]"
              >
                <Palette className="h-[18px] w-[18px]" />
                {t("aiStylePage.studio.openCta")}
              </button>
            ) : null}
          </section>
        ) : null}

        <section className="bg-white px-4 py-5">
          <h3 className="text-[15px] font-extrabold tracking-tight text-[#0A0A0A]">
            {t("aiStylePage.analysisTitle")}
          </h3>
          <div className="mt-3">
            <FaceAnalysisRings result={result} />
          </div>
          <button
            type="button"
            onClick={() => void navigate({ to: "/ai-style/chat" })}
            className="mt-3 flex min-h-12 w-full items-center gap-2.5 rounded-[14px] bg-[#F5F5F5] px-3.5 text-left"
          >
            <MessageCircle className="h-[17px] w-[17px] text-[#0A0A0A]" />
            <span className="flex-1 text-[14px] font-bold text-[#0A0A0A]">
              {t("aiStylePage.aiChatAdvice", { defaultValue: "AI chat — maslahat olish" })}
            </span>
            <ChevronRight className="h-4 w-4 text-[#8E8E93]" />
          </button>
        </section>

        {others.length > 0 ? (
          <section className="bg-white px-4 pb-6 pt-2">
            <h3 className="text-[15px] font-extrabold text-[#0A0A0A]">
              {t("aiStylePage.moreStylesTitle")}
            </h3>
            <p className="mt-1 text-[13px] text-neutral-500">
              {t("aiStylePage.moreStylesNextHint", {
                defaultValue: "Yuzingizga keyingi mos keladigan uslublar",
              })}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {others.map((item, i) => {
                const preview = resolveTryOnPreview(tryOnByStyle, item.id, menPersonaId);
                const loading = tryOnLoadingId === tryOnCacheKey(item.id, menPersonaId);
                return (
                  <button
                    key={item.id}
                    type="button"
                    disabled={Boolean(tryOnLoadingId) && !preview}
                    onClick={() => {
                      if (preview) {
                        const featuredIndex = featured.findIndex((s) => s.id === item.id);
                        if (featuredIndex >= 0) goTo(featuredIndex);
                        else onGenerateTryOn(item.id, undefined, item.title);
                        return;
                      }
                      onGenerateTryOn(item.id, undefined, item.title);
                    }}
                    className="min-w-0 text-left"
                  >
                    <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-neutral-100">
                      <img
                        src={preview || item.imageUrl}
                        alt=""
                        className="h-full w-full object-contain object-center"
                      />
                      {loading ? (
                        <div className="absolute inset-0 grid place-items-center bg-black/50">
                          <Loader2 className="h-5 w-5 animate-spin text-white" />
                        </div>
                      ) : (
                        <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-xl bg-black py-2 text-[10px] font-bold text-white">
                          <Sparkles className="h-3 w-3" />
                          {preview ? t("aiStylePage.tryOnBadge") : t("aiStylePage.tryOnMe")}
                        </span>
                      )}
                    </div>
                    <p className="mt-2 truncate text-xs font-bold text-black">
                      #{i + 4} {item.title}
                    </p>
                  </button>
                );
              })}
            </div>
          </section>
        ) : audience ? (
          <section className="bg-white px-4 pb-6 pt-2">
            <AiStyleMoreStyles
              audience={audience}
              excludeIds={result.suggestions.map((s) => s.id)}
              result={result}
              tryOnByStyle={tryOnByStyle}
              tryOnLoadingId={tryOnLoadingId}
              onGenerateTryOn={onGenerateTryOn}
            />
          </section>
        ) : null}
      </div>

      {shareOpen && activePreview && active ? (
        <AiStyleShareSheet
          open
          onClose={() => setShareOpen(false)}
          styleId={active.id}
          title={active.title}
          previewImage={activePreview}
        />
      ) : null}
    </div>
  );
}
