import { createFileRoute, Link } from "@tanstack/react-router";
import { format, parseISO } from "date-fns";
import { ChevronLeft, Download, Loader2, Share2, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { MorphBeforeAfter } from "@/components/ai-style/MorphBeforeAfter";
import { refreshAiStyleHistoryCache } from "@/lib/api";
import { downloadAiStyleImage, shareAiStyleImage } from "@/lib/ai-style-image";
import {
  FACE_HISTORY_UPDATED_EVENT,
  getActiveUserId,
  type FaceProfileHistoryEntry,
} from "@/lib/face-profile";
import {
  loadMorphAiGenerations,
  MORPH_AI_GALLERY_UPDATED_EVENT,
  type MorphAiGeneration,
} from "@/lib/morph-ai-gallery";

export const Route = createFileRoute("/ai-style_/history")({
  head: () => ({
    meta: [
      { title: "Morf AI tarixi — mysaloon.uz" },
      {
        name: "description",
        content: "Barcha Morf AI selfie va generatsiya rasmlari — before/after bilan.",
      },
    ],
  }),
  component: AiStyleHistoryPage,
});

type HistoryCard =
  | {
      kind: "generation";
      id: string;
      styleId: string;
      title: string;
      thumb: string;
      before?: string;
      after: string;
      at: string;
    }
  | {
      kind: "selfie";
      id: string;
      title: string;
      thumb: string;
      before: string;
      after?: string;
      at: string;
    };

function buildShareUrl(styleId: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "https://mysaloon.uz";
  return `${origin}/morf-ai/look/${encodeURIComponent(styleId)}`;
}

function AiStyleHistoryPage() {
  const { t } = useTranslation();
  const [selfies, setSelfies] = useState<FaceProfileHistoryEntry[]>([]);
  const [gens, setGens] = useState<MorphAiGeneration[]>(() => loadMorphAiGenerations());
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<HistoryCard | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const userId = getActiveUserId();

  useEffect(() => {
    let cancelled = false;
    const refresh = async () => {
      const list = await refreshAiStyleHistoryCache();
      if (!cancelled) {
        setSelfies(list);
        setGens(loadMorphAiGenerations());
        setLoading(false);
      }
    };
    void refresh();
    const onUpdate = () => {
      void refresh();
      setGens(loadMorphAiGenerations());
    };
    window.addEventListener(FACE_HISTORY_UPDATED_EVENT, onUpdate);
    window.addEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    return () => {
      cancelled = true;
      window.removeEventListener(FACE_HISTORY_UPDATED_EVENT, onUpdate);
      window.removeEventListener(MORPH_AI_GALLERY_UPDATED_EVENT, onUpdate);
    };
  }, [userId]);

  const cards = useMemo(() => {
    const fromGens: HistoryCard[] = gens.map((g) => ({
      kind: "generation",
      id: `gen-${g.id}`,
      styleId: g.styleId,
      title: g.title,
      thumb: g.previewImage,
      before: g.beforeImage,
      after: g.previewImage,
      at: g.createdAt,
    }));
    const genBefore = new Set(gens.map((g) => g.beforeImage).filter(Boolean));
    const fromSelfies: HistoryCard[] = selfies
      .filter((s) => !genBefore.has(s.photoDataUrl))
      .map((s) => ({
        kind: "selfie",
        id: `selfie-${s.id}`,
        title: s.faceShapeKey
          ? t(`aiStylePage.faceShapes.${s.faceShapeKey}`, { defaultValue: s.faceShapeKey })
          : t("aiStylePage.selfieAlt", { defaultValue: "Selfie" }),
        thumb: s.photoDataUrl,
        before: s.photoDataUrl,
        at: s.scannedAt,
      }));
    return [...fromGens, ...fromSelfies].sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [gens, selfies, t]);

  const handleDownload = async () => {
    if (!active) return;
    const src = active.kind === "generation" ? active.after : active.thumb;
    if (!src) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setDownloading(true);
    try {
      const slug = active.title.replace(/[^a-z0-9-]+/gi, "-").toLowerCase() || "morf-ai";
      await downloadAiStyleImage(src, `morf-ai-${slug}.jpg`);
      toast.success(t("aiStylePage.downloaded"));
    } catch {
      toast.error(t("aiStylePage.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!active) return;
    const src = active.kind === "generation" ? active.after : active.thumb;
    if (!src) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setSharing(true);
    try {
      const pageUrl =
        active.kind === "generation" && active.styleId
          ? buildShareUrl(active.styleId)
          : typeof window !== "undefined"
            ? `${window.location.origin}/ai-style`
            : undefined;
      const shareTitle = t("aiStylePage.shareLook.shareText", {
        style: active.title,
        defaultValue: "{{style}} — Morf AI da sinab ko‘rdim. Sen ham sinab ko‘r!",
      });
      const result = await shareAiStyleImage(shareTitle, src, pageUrl);
      if (result === "copied") toast.success(t("aiStylePage.linkCopied"));
      else if (result === "shared") toast.success(t("aiStylePage.shared"));
    } catch {
      toast.error(t("aiStylePage.shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  return (
    <div
      className="min-h-[100dvh] bg-[#0b0b0b] text-white"
      style={{ paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))" }}
    >
      <div
        className="px-5 pb-4"
        style={{ paddingTop: "max(1rem, env(safe-area-inset-top))" }}
      >
        <Link
          to="/ai-style"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-bold text-white backdrop-blur-md touch-manipulation"
        >
          <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
          {t("common.back")}
        </Link>
        <div className="mt-5">
          <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
            <Sparkles className="h-3.5 w-3.5" />
            {t("aiStylePage.title")}
          </p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight">
            {t("aiStylePage.historyPageTitle", { defaultValue: "Tahlil tarixi" })}
          </h1>
          <p className="mt-1 text-sm text-white/60">
            {t("aiStylePage.historyPageSubtitle", {
              defaultValue: "Barcha selfie va generatsiyalar — before/after uchun bosing",
            })}
          </p>
        </div>
      </div>

      <div className="px-5">
        {loading ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] animate-pulse rounded-2xl bg-white/10" />
            ))}
          </div>
        ) : cards.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-white/20 bg-white/[0.04] px-5 py-10 text-center">
            <p className="text-base font-semibold">{t("aiStylePage.historyEmpty")}</p>
            <p className="mt-2 text-sm text-white/55">{t("aiStylePage.historyEmptyHint")}</p>
            <Link
              to="/ai-style"
              className="mt-6 inline-flex rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
            >
              {t("aiStylePage.uploadTitle")}
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3 md:grid-cols-4">
            {cards.map((card) => (
              <button
                key={card.id}
                type="button"
                onClick={() => setActive(card)}
                className="group overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] text-left touch-manipulation active:scale-[0.98]"
              >
                <div className="aspect-[3/4] overflow-hidden bg-white/5">
                  <img
                    src={card.thumb}
                    alt=""
                    className="h-full w-full object-cover object-top transition-transform duration-300 group-active:scale-[1.03]"
                  />
                </div>
                <div className="px-2.5 py-2">
                  <p className="truncate text-xs font-bold">{card.title}</p>
                  <p className="mt-0.5 text-[10px] font-semibold tabular-nums text-white/45">
                    {formatHistoryDate(card.at)}
                  </p>
                  {card.kind === "generation" && card.before ? (
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-white/55">
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
            <div className="fixed inset-0 z-[280] flex flex-col bg-black/95">
              <div
                className="flex items-center justify-between px-4 pb-3"
                style={{ paddingTop: "max(0.85rem, env(safe-area-inset-top))" }}
              >
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-2 text-sm font-bold text-white touch-manipulation"
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
                  {t("common.back")}
                </button>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  className="grid size-11 place-items-center rounded-full bg-white/10 text-white touch-manipulation"
                  aria-label={t("common.close")}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
                {active.kind === "generation" && active.before ? (
                  <div className="w-full max-w-md">
                    <MorphBeforeAfter
                      beforeSrc={active.before}
                      afterSrc={active.after}
                      title={active.title}
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-md overflow-hidden rounded-[24px]">
                    <img
                      src={active.thumb}
                      alt=""
                      className="aspect-[3/4] w-full object-cover object-top"
                    />
                    <p className="mt-3 text-center text-sm font-bold text-white">{active.title}</p>
                    <p className="mt-1 text-center text-xs text-white/55">
                      {active.kind === "generation"
                        ? t("aiStylePage.beforeAfter.noBefore", {
                            defaultValue: "Before selfie saqlanmagan — yangi try-on qiling",
                          })
                        : formatHistoryDate(active.at)}
                    </p>
                  </div>
                )}

                <div className="grid w-full max-w-md grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    disabled={downloading}
                    onClick={() => void handleDownload()}
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black touch-manipulation active:scale-[0.98] disabled:opacity-50"
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
                    className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-white/20 bg-white/10 text-sm font-bold text-white touch-manipulation active:scale-[0.98] disabled:opacity-50"
                  >
                    {sharing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Share2 className="h-4 w-4" />
                    )}
                    {t("aiStylePage.share")}
                  </button>
                </div>
                {active.kind === "generation" ? (
                  <p className="max-w-md text-center text-[11px] text-white/50">
                    {t("aiStylePage.shareLook.shareHint", {
                      defaultValue:
                        "Ulashsangiz, do‘stingiz chiroyli sahifa ochadi va o‘zida sinab ko‘rish uchun ro‘yxatdan o‘tadi — keyin Morf AI try-on ochiladi.",
                    })}
                  </p>
                ) : null}
              </div>
            </div>,
            document.body,
          )
        : null}
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
