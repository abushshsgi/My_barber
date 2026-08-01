import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Download, Loader2, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MorfAiShareNudge } from "@/components/ai-style/MorfAiShareNudge";
import { MorphBeforeAfter } from "@/components/ai-style/MorphBeforeAfter";
import { useMorfAiStoryShare } from "@/components/ai-style/useMorfAiStoryShare";
import { createMorphAiLookShare } from "@/lib/api";
import { shareAiStyleLink, downloadAiStyleImage } from "@/lib/ai-style-image";
import { getActiveUserId } from "@/lib/face-profile";
import { trackMorphShare } from "@/lib/ga";
import { resolveMediaUrl, toShareImageSource } from "@/lib/media-url";
import { buildTelegramShareUrl, pickMorphShareText } from "@/lib/morph-share-copy";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  refreshMorphAiGenerationsCache,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";

export const Route = createFileRoute("/ai-style_/history")({
  head: () => ({
    meta: [
      { title: "Morf AI tarixi — mysaloon.uz" },
      {
        name: "description",
        content: "Morf AI try-on natijalari — before/after bilan.",
      },
    ],
  }),
  component: AiStyleHistoryPage,
});

type HistoryCard = {
  id: string;
  styleId: string;
  title: string;
  thumb: string;
  before?: string;
  after: string;
  at: string;
};

function AiStyleHistoryPage() {
  const { t } = useTranslation();
  const [gens, setGens] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());
  const [loading, setLoading] = useState(() => loadMorphAiGenerations().length === 0);
  const [active, setActive] = useState<HistoryCard | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const { sharing: igSharing, shareToStory, storyModal } = useMorfAiStoryShare("history");
  const userId = getActiveUserId();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshMorphAiGenerationsCache();
      if (!cancelled) {
        setGens(list);
        setLoading(false);
      }
    };
    void refresh();
    const onUpdate = () => {
      setGens(loadMorphAiGenerations());
      void refresh();
    };
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    };
  }, [userId]);

  const cards = useMemo((): HistoryCard[] => {
    const seen = new Set<string>();
    const unique: HistoryCard[] = [];
    for (const g of gens) {
      if (!g.previewImage) continue;
      const key = g.id || `${g.styleId}:${g.previewImage.slice(0, 64)}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const after = resolveMediaUrl(g.previewImage) ?? g.previewImage;
      const before = g.beforeImage ? (resolveMediaUrl(g.beforeImage) ?? g.beforeImage) : undefined;
      unique.push({
        id: `gen-${g.id}`,
        styleId: g.styleId,
        title: g.title,
        thumb: after,
        before,
        after,
        at: g.createdAt,
      });
    }
    return unique.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  }, [gens]);

  const handleDownload = async () => {
    if (!active?.after) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setDownloading(true);
    try {
      const slug = active.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "morf-ai";
      await downloadAiStyleImage(active.after, `morf-ai-${slug}.jpg`);
      toast.success(t("aiStylePage.downloaded"));
    } catch {
      toast.error(t("aiStylePage.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!active?.after) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setSharing(true);
    try {
      // Share landing shows result only; before kept optional for future.
      const created = await createMorphAiLookShare({
        style_id: active.styleId,
        title: active.title,
        after_image: toShareImageSource(active.after),
      });
      const pageUrl =
        created.share_page_url ||
        `${typeof window !== "undefined" ? window.location.origin : "https://mysaloon.uz"}/morf-ai/share/${encodeURIComponent(created.id)}`;
      const shareTitle = pickMorphShareText(t, {
        style: active.title,
        name: created.sharer_name || "",
      });
      const result = await shareAiStyleLink(shareTitle, pageUrl);
      trackMorphShare("link_shared", {
        surface: "history",
        styleId: active.styleId,
        shareId: created.id,
      });
      if (result === "copied") toast.success(t("aiStylePage.linkCopied"));
      else if (result === "shared") toast.success(t("aiStylePage.shared"));
    } catch {
      toast.error(t("aiStylePage.shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  const handleInstagramShare = () => {
    if (!active?.after) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    void shareToStory({ styleId: active.styleId, title: active.title, imageUrl: active.after });
  };

  const handleTelegramShare = async () => {
    if (!active?.after) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setSharing(true);
    try {
      const created = await createMorphAiLookShare({
        style_id: active.styleId,
        title: active.title,
        after_image: toShareImageSource(active.after),
      });
      const pageUrl =
        created.share_page_url ||
        `${typeof window !== "undefined" ? window.location.origin : "https://mysaloon.uz"}/morf-ai/share/${encodeURIComponent(created.id)}`;
      const shareTitle = pickMorphShareText(t, {
        style: active.title,
        name: created.sharer_name || "",
      });
      trackMorphShare("telegram_shared", {
        surface: "history",
        styleId: active.styleId,
        shareId: created.id,
      });
      window.open(buildTelegramShareUrl(pageUrl, shareTitle), "_blank", "noopener,noreferrer");
    } catch {
      toast.error(t("aiStylePage.shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-background text-foreground"
      style={{ paddingBottom: "max(1.25rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="border-b border-border/70 bg-background/95 px-4 pb-3 backdrop-blur-md md:px-6"
        style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
      >
        <div className="mx-auto flex max-w-5xl items-center gap-3">
          <Link
            to="/ai-style"
            className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold touch-manipulation"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
            {t("common.back")}
          </Link>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
              <Sparkles className="h-3 w-3" />
              Morf AI
            </p>
            <h1 className="truncate text-[17px] font-bold tracking-tight md:text-lg">
              {t("aiStylePage.historyPageTitle", { defaultValue: "Try-on tarixi" })}
            </h1>
          </div>
        </div>
        <p className="mx-auto mt-1.5 max-w-5xl text-[12px] text-muted-foreground md:text-[13px]">
          {t("aiStylePage.historyPageSubtitle", {
            defaultValue: "Faqat generatsiya natijalari — before/after uchun bosing",
          })}
        </p>
      </div>

      <div className="mx-auto max-w-5xl px-4 pt-4 md:px-6">
        {loading && cards.length === 0 ? (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-surface" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-surface/50 px-5 py-10 text-center">
            <p className="text-[15px] font-semibold">{t("aiStylePage.historyEmpty")}</p>
            <p className="mt-1.5 text-[13px] text-muted-foreground">
              {t("aiStylePage.historyEmptyHint")}
            </p>
            <Link
              to="/ai-style"
              className="mt-5 inline-flex rounded-full bg-foreground px-5 py-2.5 text-[13px] font-bold text-background"
            >
              {t("aiStylePage.uploadTitle")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2.5 pb-6 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {cards.map((card, index) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActive(card)}
                className="group cursor-pointer overflow-hidden rounded-2xl border border-border bg-surface text-left transition-colors duration-200 hover:border-foreground/25 touch-manipulation active:scale-[0.98]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-muted/40">
                  <img
                    src={card.thumb}
                    alt=""
                    loading={index < 8 ? "eager" : "lazy"}
                    decoding="async"
                    fetchPriority={index < 4 ? "high" : "auto"}
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-active:scale-[1.02]"
                  />
                </div>
                <div className="px-2 py-1.5">
                  <p className="truncate text-[11px] font-bold md:text-xs">{card.title}</p>
                  <p className="mt-0.5 text-[10px] font-medium tabular-nums text-muted-foreground">
                    {formatHistoryDate(card.at)}
                  </p>
                  {card.before ? (
                    <p className="mt-0.5 text-[9px] font-bold uppercase tracking-wide text-muted-foreground">
                      Before / After
                    </p>
                  ) : null}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {active && typeof document !== "undefined"
        ? createPortal(
            <div className="fixed inset-0 z-[280] flex flex-col bg-background/98 backdrop-blur-sm">
              <div
                className="mx-auto flex w-full max-w-lg items-center justify-between px-4 pb-2"
                style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
              >
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="inline-flex min-h-10 items-center gap-1 rounded-full border border-border bg-surface px-3 py-1.5 text-[13px] font-semibold touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.25} />
                  {t("common.back")}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="grid size-10 place-items-center rounded-full border border-border bg-surface touch-manipulation"
                  aria-label={t("common.close")}
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mx-auto flex min-h-0 w-full max-w-lg flex-1 flex-col items-center justify-start gap-3 overflow-y-auto px-4 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
                {active.before ? (
                  <div className="w-full">
                    <MorphBeforeAfter
                      beforeSrc={active.before}
                      afterSrc={active.after}
                      title={active.title}
                    />
                  </div>
                ) : (
                  <div className="w-full overflow-hidden rounded-2xl border border-border">
                    <img
                      src={active.thumb}
                      alt=""
                      className="aspect-[3/4] w-full object-cover object-top"
                    />
                    <p className="px-3 py-2 text-center text-[13px] font-bold">{active.title}</p>
                  </div>
                )}

                <MorfAiShareNudge
                  onShare={handleInstagramShare}
                  onTelegramShare={() => void handleTelegramShare()}
                  sharing={igSharing || sharing}
                  className="w-full"
                />
                <div className="grid w-full grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void handleDownload()}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-2xl bg-foreground text-[13px] font-bold text-background transition-opacity duration-200 hover:opacity-90 touch-manipulation active:scale-[0.98] disabled:opacity-50"
                  >
                    {downloading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    {t("aiStylePage.download")}
                  </button>
                  <button
                    type="button"
                    disabled={sharing}
                    onClick={() => void handleShare()}
                    className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-2xl border border-border bg-surface text-[13px] font-bold transition-colors duration-200 hover:border-foreground/25 touch-manipulation active:scale-[0.98] disabled:opacity-50"
                  >
                    {sharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {t("aiStylePage.share")}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
      {storyModal}
    </div>
  );
}

function formatHistoryDate(iso: string) {
  try {
    return format(parseISO(iso), "dd.MM.yyyy HH:mm");
  } catch {
    return iso;
  }
}
