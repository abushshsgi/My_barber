"use client";

import { Check, Copy, Download, Instagram, Loader2, X } from "lucide-react";
import { useCallback, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { copyTextToClipboard, downloadImageFile } from "@/lib/ai-style-image";
import { cn } from "@/lib/utils";

const INSTAGRAM_URL = "https://instagram.com";
const DEFAULT_FILENAME = "morf-ai-story.png";

export type InstagramStorySharePayload = {
  /** Unique Morf AI result / look share URL */
  shareLink: string;
  /** Story graphic (data URL or absolute image URL) */
  imageUrl: string;
  /** Download filename — default morf-ai-story.png */
  filename?: string;
};

type InstagramShareModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
};

/**
 * Copy link + download story image, then open instructional modal.
 * Call from a button: `await handleInstagramStoryShare(...); setOpen(true)`.
 */
export async function handleInstagramStoryShare({
  shareLink,
  imageUrl,
  filename = DEFAULT_FILENAME,
}: InstagramStorySharePayload): Promise<void> {
  const link = shareLink.trim();
  const image = imageUrl.trim();
  if (!link) throw new Error("shareLink required");
  if (!image) throw new Error("imageUrl required");

  // Parallel: clipboard + download (download must stay in user-gesture tick where possible).
  const copyPromise = copyTextToClipboard(link);
  const downloadPromise = downloadImageFile(image, filename);
  await Promise.all([copyPromise, downloadPromise]);
}

/** Dark glassmorphism instructional overlay for Instagram Story share. */
export function InstagramShareModal({ open, onOpenChange, className }: InstagramShareModalProps) {
  const { t } = useTranslation();

  if (!open) return null;

  const steps = [
    t("aiStylePage.instagramStory.step1", {
      defaultValue: "Tayyor natija shabloni qurilmangizga yuklab olindi.",
    }),
    t("aiStylePage.instagramStory.step2", {
      defaultValue: "Shaxsiy havola buferga nusxalandi.",
    }),
    t("aiStylePage.instagramStory.step3", {
      defaultValue:
        "Instagram’da Story oching, yuklangan shablonni qo‘ying va «Link» sticker orqali havolani joylang.",
    }),
  ] as const;

  return (
    <div
      className="fixed inset-0 z-[300] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label={t("common.close")}
        className="absolute inset-0 bg-black/70 backdrop-blur-md"
        onClick={() => onOpenChange(false)}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="instagram-share-title"
        className={cn(
          "relative z-10 w-full max-w-md overflow-hidden rounded-2xl",
          "border border-white/10 bg-zinc-950/90 text-zinc-50 shadow-2xl",
          "backdrop-blur-xl",
          "animate-in fade-in-0 zoom-in-95 slide-in-from-bottom-4 duration-200",
          className,
        )}
      >
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-pink-500/25 via-purple-500/10 to-transparent"
          aria-hidden
        />

        <button
          type="button"
          onClick={() => onOpenChange(false)}
          className="absolute right-3 top-3 z-10 grid size-9 place-items-center rounded-full border border-white/10 bg-white/5 text-zinc-300 transition hover:bg-white/10 hover:text-white"
          aria-label={t("common.close")}
        >
          <X className="size-4" strokeWidth={2.25} />
        </button>

        <div className="relative px-5 pb-5 pt-6 sm:px-6">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-zinc-300">
            <Instagram className="size-3.5" />
            Morf AI
          </div>

          <h2 id="instagram-share-title" className="text-xl font-bold tracking-tight text-white">
            {t("aiStylePage.instagramStory.title", {
              defaultValue: "Instagram Story’ga ulashish",
            })}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-zinc-400">
            {t("aiStylePage.instagramStory.subtitle", {
              defaultValue: "Tayyor natija shabloni yuklandi — endi Instagram’da Story yarating.",
            })}
          </p>

          <ol className="mt-5 space-y-3">
            {steps.map((label, index) => (
              <li
                key={index}
                className="flex gap-3 rounded-2xl border border-white/8 bg-white/[0.04] px-3.5 py-3"
              >
                <span className="grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-pink-500 to-purple-600 text-[11px] font-bold text-white">
                  {index === 0 ? (
                    <Download className="size-3.5" />
                  ) : index === 1 ? (
                    <Copy className="size-3.5" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                </span>
                <p className="pt-0.5 text-sm leading-snug text-zinc-200">{label}</p>
              </li>
            ))}
          </ol>

          <a
            href={INSTAGRAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl",
              "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600",
              "text-sm font-bold text-white shadow-lg shadow-fuchsia-500/20",
              "transition hover:brightness-110 active:scale-[0.98]",
            )}
          >
            <Instagram className="size-4" />
            {t("aiStylePage.instagramStory.openInstagram", {
              defaultValue: "Instagram’ni ochish",
            })}
          </a>

          <button
            type="button"
            onClick={() => onOpenChange(false)}
            className="mt-2.5 flex min-h-11 w-full items-center justify-center rounded-2xl border border-white/10 bg-transparent text-sm font-semibold text-zinc-400 transition hover:bg-white/5 hover:text-zinc-200"
          >
            {t("common.close", { defaultValue: "Yopish" })}
          </button>
        </div>
      </div>
    </div>
  );
}

type InstagramStoryShareButtonProps = InstagramStorySharePayload & {
  className?: string;
  disabled?: boolean;
  /** Called before share (e.g. create look-share URL). Return final payload. */
  resolvePayload?: () => Promise<InstagramStorySharePayload>;
  children?: ReactNode;
};

/**
 * One-shot button: prepare share → download + copy → open instructional modal.
 */
export function InstagramStoryShareButton({
  shareLink,
  imageUrl,
  filename,
  className,
  disabled,
  resolvePayload,
  children,
}: InstagramStoryShareButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const onClick = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    try {
      const payload = resolvePayload
        ? await resolvePayload()
        : { shareLink, imageUrl, filename };
      await handleInstagramStoryShare(payload);
      setOpen(true);
    } finally {
      setBusy(false);
    }
  }, [busy, filename, imageUrl, resolvePayload, shareLink]);

  return (
    <>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => void onClick()}
        className={cn(
          "inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl",
          "bg-gradient-to-r from-pink-500 via-fuchsia-500 to-purple-600",
          "px-4 text-[13px] font-bold text-white touch-manipulation",
          "active:scale-[0.98] disabled:opacity-50",
          className,
        )}
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Instagram className="h-4 w-4" />}
        {children ??
          t("aiStylePage.instagramStory.cta", {
            defaultValue: "Instagram Story'ga ulashish",
          })}
      </button>
      <InstagramShareModal open={open} onOpenChange={setOpen} />
    </>
  );
}
