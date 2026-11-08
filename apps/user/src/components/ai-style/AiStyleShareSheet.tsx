import { Copy, Download, Loader2, X } from "lucide-react";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useMorfAiStoryShare } from "@/components/ai-style/useMorfAiStoryShare";
import { copyTextToClipboard, downloadAiStyleImage } from "@/lib/ai-style-image";
import { createMorphAiLookShare } from "@/lib/api";
import { trackMorphShare } from "@/lib/ga";
import { toShareImageSource } from "@/lib/media-url";
import { buildTelegramShareUrl, pickMorphShareText } from "@/lib/morph-share-copy";
import { publicAppUrl } from "@/lib/public-origin";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  styleId: string;
  title: string;
  previewImage: string;
};

export function AiStyleShareSheet({ open, onClose, styleId, title, previewImage }: Props) {
  const { t } = useTranslation();
  const { sharing: storySharing, shareToStory, storyModal } = useMorfAiStoryShare("preview");
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState("");

  const ensureLink = useCallback(async () => {
    if (link) return link;
    try {
      const created = await createMorphAiLookShare({
        style_id: styleId,
        title,
        after_image: toShareImageSource(previewImage),
      });
      const pageUrl =
        created.share_page_url || publicAppUrl(`/morf-ai/share/${encodeURIComponent(created.id)}`);
      setLink(pageUrl);
      return pageUrl;
    } catch {
      const fallback = publicAppUrl(`/morf-ai/look/${encodeURIComponent(styleId)}`);
      setLink(fallback);
      return fallback;
    }
  }, [link, previewImage, styleId, title]);

  if (!open) return null;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    try {
      await fn();
    } catch {
      toast.error(t("aiStylePage.shareFailed"));
    } finally {
      setBusy(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-[240] bg-black/40" onClick={onClose} />
      <div
        className="fixed inset-x-0 bottom-0 z-[241] rounded-t-[28px] bg-white px-5 pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.12)]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-black/15" />
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="text-[17px] font-extrabold text-[#0A0A0A]">
            {t("aiStylePage.shareFriendsTitle", { defaultValue: "Do‘stlarga ulashish" })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-8 place-items-center rounded-full bg-neutral-100"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-5 text-[13px] text-neutral-500">
          {t("aiStylePage.shareFriendsHint", { defaultValue: "Ushbu lookni ulashing" })}
        </p>

        <div className="grid grid-cols-4 gap-3">
          {(
            [
              { key: "instagram", label: "Instagram", color: "#E1306C" },
              { key: "telegram", label: "Telegram", color: "#2AABEE" },
              { key: "tiktok", label: "TikTok", color: "#111111" },
              { key: "facebook", label: "Facebook", color: "#1877F2" },
            ] as const
          ).map((net) => (
            <button
              key={net.key}
              type="button"
              disabled={Boolean(busy) || storySharing}
              onClick={() =>
                void run(net.key, async () => {
                  const url = await ensureLink();
                  const text = pickMorphShareText(t, { style: title });
                  if (net.key === "instagram") {
                    await shareToStory({ styleId, title, imageUrl: previewImage });
                    return;
                  }
                  if (net.key === "telegram") {
                    trackMorphShare("telegram_shared", { surface: "preview", styleId });
                    window.open(buildTelegramShareUrl(url, text), "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (net.key === "facebook") {
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
                      "_blank",
                      "noopener,noreferrer",
                    );
                    return;
                  }
                  await copyTextToClipboard(`${text}\n${url}`);
                  window.open("https://www.tiktok.com/", "_blank", "noopener,noreferrer");
                  toast.success(t("aiStylePage.linkCopied"));
                })
              }
              className="flex flex-col items-center gap-2"
            >
              <span
                className="grid size-12 place-items-center rounded-full text-[11px] font-extrabold text-white"
                style={{ background: net.color }}
              >
                {busy === net.key ? <Loader2 className="h-4 w-4 animate-spin" /> : net.label.slice(0, 2)}
              </span>
              <span className="text-[11px] font-semibold text-[#0A0A0A]">{net.label}</span>
            </button>
          ))}
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("copy", async () => {
                const url = await ensureLink();
                await copyTextToClipboard(url);
                toast.success(t("aiStylePage.linkCopied"));
              })
            }
            className={cn(
              "inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-neutral-100 text-sm font-bold",
            )}
          >
            {busy === "copy" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />}
            {t("aiStylePage.copyLink", { defaultValue: "Nusxa" })}
          </button>
          <button
            type="button"
            disabled={Boolean(busy)}
            onClick={() =>
              void run("download", async () => {
                const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "look";
                await downloadAiStyleImage(previewImage, `morf-ai-${slug}.jpg`);
                toast.success(t("aiStylePage.downloaded"));
              })
            }
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-neutral-100 text-sm font-bold"
          >
            {busy === "download" ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            {t("aiStylePage.download")}
          </button>
        </div>
      </div>
      {storyModal}
    </>
  );
}
