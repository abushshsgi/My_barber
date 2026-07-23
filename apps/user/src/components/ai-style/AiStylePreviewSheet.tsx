import { Link, useNavigate } from "@tanstack/react-router";
import {
  Bookmark,
  CalendarPlus,
  ChevronLeft,
  Download,
  LayoutGrid,
  Loader2,
  Palette,
  Share2,
  Sparkles,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import type { AiAnalysisResult } from "@/components/ai-style/ai-style-shared";
import { isCatalogStyleId } from "@/components/ai-style/ai-style-shared";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import type { ExplorePersonaId } from "@/lib/explore-personas";
import { createMorphAiLookShare } from "@/lib/api";
import { downloadAiStyleImage, shareAiStyleLink } from "@/lib/ai-style-image";
import { pickMorphShareText } from "@/lib/morph-share-copy";
import { stashMorphStudioDraft } from "@/lib/morph-ai-studio-session";
import { cn } from "@/lib/utils";

type Suggestion = AiAnalysisResult["suggestions"][number];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  suggestion: Suggestion | null;
  previewImage?: string;
  /** Original selfie — required for personal before/after share. */
  selfiePhoto?: string | null;
  saved: boolean;
  tryOnLoading?: boolean;
  onToggleSave: (styleId: string, meta: { title: string; previewImage?: string }) => void;
  onGenerateTryOn?: (styleId: string, personaId?: ExplorePersonaId, title?: string) => void;
  onTryMoreStyles?: () => void;
};

function ActionRow({
  icon,
  label,
  onClick,
  disabled,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  disabled?: boolean;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-[10px] font-bold transition-colors touch-manipulation",
        active ? "bg-black text-white" : "bg-neutral-100 text-black",
        disabled && "opacity-50",
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </button>
  );
}

export function AiStylePreviewSheet({
  open,
  onOpenChange,
  suggestion,
  previewImage,
  selfiePhoto,
  saved,
  tryOnLoading,
  onToggleSave,
  onGenerateTryOn,
  onTryMoreStyles,
}: Props) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [sharing, setSharing] = useState(false);
  const [downloading, setDownloading] = useState(false);

  if (!suggestion) return null;

  const imageSrc = previewImage || suggestion.imageUrl;
  const canTryOn = Boolean(onGenerateTryOn && isCatalogStyleId(suggestion.id));
  const lookUrl =
    typeof window !== "undefined" && isCatalogStyleId(suggestion.id)
      ? `${window.location.origin}/morf-ai/look/${suggestion.id}`
      : undefined;

  const goBack = () => onOpenChange(false);

  const openStudio = () => {
    if (!previewImage) return;
    stashMorphStudioDraft({
      image: previewImage,
      beforeImage: selfiePhoto || undefined,
      styleId: suggestion.id,
      styleTitle: suggestion.title,
      source: "tryon",
    });
    onOpenChange(false);
    void navigate({ to: "/ai-style/studio" });
  };

  const handleDownload = async () => {
    if (!imageSrc) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setDownloading(true);
    try {
      const slug = suggestion.id.replace(/[^a-z0-9-]+/gi, "-");
      await downloadAiStyleImage(imageSrc, `mybarber-${slug}.jpg`);
      toast.success(t("aiStylePage.downloaded"));
    } catch {
      toast.error(t("aiStylePage.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    if (!imageSrc) {
      toast.error(t("aiStylePage.previewNoImage"));
      return;
    }
    setSharing(true);
    try {
      if (previewImage) {
        const created = await createMorphAiLookShare({
          style_id: suggestion.id,
          title: suggestion.title,
          after_image: previewImage,
        });
        const pageUrl =
          created.share_page_url ||
          `${window.location.origin}/morf-ai/share/${encodeURIComponent(created.id)}`;
        const shareTitle = pickMorphShareText(t, {
          style: suggestion.title,
          name: created.sharer_name || "",
        });
        const result = await shareAiStyleLink(shareTitle, pageUrl);
        if (result === "copied") toast.success(t("aiStylePage.linkCopied"));
        else if (result === "shared") toast.success(t("aiStylePage.shared"));
        return;
      }

      // Fallback: viral style look page (no personal result yet).
      if (!lookUrl) {
        toast.error(t("aiStylePage.shareFailed"));
        return;
      }
      const lookShareTitle = pickMorphShareText(t, { style: suggestion.title });
      const result = await shareAiStyleLink(lookShareTitle, lookUrl);
      if (result === "copied") toast.success(t("aiStylePage.linkCopied"));
      else if (result === "shared") toast.success(t("aiStylePage.shared"));
    } catch {
      toast.error(t("aiStylePage.shareFailed"));
    } finally {
      setSharing(false);
    }
  };

  const handleSave = () => {
    onToggleSave(suggestion.id, { title: suggestion.title, previewImage: imageSrc });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        hideClose
        className="max-h-[94dvh] overflow-y-auto rounded-t-[28px] border-0 px-0 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-0"
      >
        <SheetTitle className="sr-only">{suggestion.title}</SheetTitle>
        <SheetDescription className="sr-only">
          {t("aiStylePage.previewDesc", {
            defaultValue: "Generatsiya qilingan uslubni ko‘rish, yuklab olish yoki ulashish",
          })}
        </SheetDescription>

        <div className="relative min-h-[min(52dvh,460px)] bg-neutral-100">
          {imageSrc ? (
            <img
              src={imageSrc}
              alt=""
              className="h-full min-h-[min(52dvh,460px)] w-full object-cover object-top"
            />
          ) : (
            <div className="flex min-h-[min(52dvh,460px)] items-center justify-center text-sm text-neutral-500">
              {t("aiStylePage.previewNoImage")}
            </div>
          )}

          {tryOnLoading ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/50">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
              <p className="text-sm font-semibold text-white">{t("aiStylePage.tryOnGenerating")}</p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={goBack}
            className="absolute left-4 z-20 inline-flex min-h-11 items-center gap-1.5 rounded-full bg-black/55 px-3.5 py-2 text-sm font-bold text-white shadow-lg backdrop-blur-md ring-1 ring-white/20 touch-manipulation active:scale-95"
            style={{ top: "max(0.85rem, env(safe-area-inset-top))" }}
            aria-label={t("common.back")}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2.5} />
            {t("common.back")}
          </button>

          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/60 to-transparent px-5 pb-5 pt-24">
            <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">
              {previewImage ? t("aiStylePage.tryOnBadge") : t("aiStylePage.viewStyle")}
            </p>
            <h2 className="mt-1 text-2xl font-bold text-white">{suggestion.title}</h2>
            <p className="mt-1 text-sm text-white/80">
              {t("aiStylePage.matchPct", { value: suggestion.match })}
            </p>
          </div>
        </div>

        <div className="space-y-4 px-5 pt-4">
          {previewImage ? (
            <button
              type="button"
              onClick={openStudio}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white touch-manipulation active:opacity-90"
            >
              <Palette className="h-4 w-4" />
              {t("aiStylePage.studio.openCta", { defaultValue: "AI Studio" })}
            </button>
          ) : null}

          <button
            type="button"
            onClick={goBack}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-border bg-neutral-50 py-3.5 text-sm font-bold text-foreground touch-manipulation active:opacity-90"
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={2.5} />
            {t("aiStylePage.previewBack", { defaultValue: "Natijalarga qaytish" })}
          </button>

          <div className="grid grid-cols-4 gap-2">
            <ActionRow
              icon={downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              label={t("aiStylePage.download")}
              onClick={() => void handleDownload()}
              disabled={!imageSrc || downloading}
            />
            <ActionRow
              icon={sharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
              label={t("aiStylePage.share")}
              onClick={() => void handleShare()}
              disabled={!imageSrc || sharing}
            />
            <ActionRow
              icon={<Bookmark className={cn("h-4 w-4", saved && "fill-current")} />}
              label={saved ? t("aiStylePage.saved") : t("aiStylePage.save")}
              onClick={handleSave}
              active={saved}
            />
            <ActionRow
              icon={<LayoutGrid className="h-4 w-4" />}
              label={t("aiStylePage.tryMoreStyles")}
              onClick={() => {
                onOpenChange(false);
                onTryMoreStyles?.();
              }}
            />
          </div>

          {canTryOn && !previewImage ? (
            <button
              type="button"
              disabled={tryOnLoading}
              onClick={() => onGenerateTryOn?.(suggestion.id, undefined, suggestion.title)}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-neutral-100 py-3.5 text-sm font-bold text-black active:opacity-90 disabled:opacity-50 touch-manipulation"
            >
              {tryOnLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {t("aiStylePage.tryOnMe")}
            </button>
          ) : null}

          {suggestion.salonId ? (
            <Link
              to="/booking/$salonId"
              params={{ salonId: suggestion.salonId }}
              className="flex w-full items-center justify-center gap-2 rounded-2xl bg-black py-3.5 text-sm font-bold text-white active:opacity-90"
            >
              <CalendarPlus className="h-4 w-4" />
              {t("aiStylePage.bookCta")}
            </Link>
          ) : null}

          {isCatalogStyleId(suggestion.id) ? (
            <Link
              to="/explore/$styleId"
              params={{ styleId: suggestion.id }}
              className="block text-center text-xs font-bold text-neutral-500 underline underline-offset-2"
            >
              {t("aiStylePage.viewStylePage")}
            </Link>
          ) : null}
        </div>
      </SheetContent>
    </Sheet>
  );
}
