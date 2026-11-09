import { Copy, Download, Loader2, X } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { copyTextToClipboard, downloadAiStyleImage } from "@/lib/ai-style-image";
import { createMorphAiLookShare } from "@/lib/api";
import { trackMorphShare } from "@/lib/ga";
import { toShareImageSource } from "@/lib/media-url";
import {
  buildFacebookShareUrl,
  buildTelegramShareUrl,
  INSTAGRAM_WEB_URL,
  pickMorphShareText,
  TIKTOK_WEB_URL,
} from "@/lib/morph-share-copy";
import { publicAppUrl } from "@/lib/public-origin";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
  styleId: string;
  title: string;
  previewImage: string;
};

type NetworkKey = "instagram" | "telegram" | "tiktok" | "facebook";

const NETWORKS: { key: NetworkKey; label: string; color: string }[] = [
  { key: "instagram", label: "Instagram", color: "#E1306C" },
  { key: "telegram", label: "Telegram", color: "#2AABEE" },
  { key: "tiktok", label: "TikTok", color: "#111111" },
  { key: "facebook", label: "Facebook", color: "#1877F2" },
];

export function AiStyleShareSheet({ open, onClose, styleId, title, previewImage }: Props) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState<string | null>(null);
  const [link, setLink] = useState("");
  const [shareText, setShareText] = useState("");
  const [mounted, setMounted] = useState(false);

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

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) return;
    setShareText(pickMorphShareText(t, { style: title }));
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open, t, title]);

  useEffect(() => {
    if (!open) return;
    void ensureLink();
  }, [ensureLink, open]);

  if (!open || !mounted) return null;

  const telegramHref = link ? buildTelegramShareUrl(link, shareText) : "https://t.me/share/url";
  const facebookHref = link ? buildFacebookShareUrl(link) : "https://www.facebook.com/";
  const hrefFor = (key: NetworkKey) => {
    if (key === "instagram") return INSTAGRAM_WEB_URL;
    if (key === "telegram") return telegramHref;
    if (key === "facebook") return facebookHref;
    return TIKTOK_WEB_URL;
  };

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

  return createPortal(
    <>
      <div className="fixed inset-0 z-[89] bg-black/45" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t("aiStylePage.shareFriendsTitle", { defaultValue: "Do‘stlarga ulashish" })}
        className="fixed inset-x-0 bottom-0 z-[90] mx-auto flex w-full max-w-lg flex-col overflow-y-auto rounded-t-[28px] bg-white px-[clamp(16px,4.5vw,24px)] pt-3 shadow-[0_-12px_40px_rgba(0,0,0,0.16)] max-h-[min(34rem,calc(100dvh-0.75rem))] lg:bottom-4 lg:max-w-md lg:rounded-[28px]"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <div className="mx-auto mb-3 h-1 w-10 shrink-0 rounded-full bg-black/15" />
        <div className="mb-1 flex items-center justify-between gap-3">
          <h3 className="min-w-0 truncate text-[clamp(16px,4.4vw,18px)] font-extrabold text-[#0A0A0A]">
            {t("aiStylePage.shareFriendsTitle", { defaultValue: "Do‘stlarga ulashish" })}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="grid size-9 shrink-0 place-items-center rounded-full bg-neutral-100"
            aria-label={t("common.close")}
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <p className="mb-4 text-[clamp(12px,3.4vw,14px)] text-neutral-500">
          {t("aiStylePage.shareFriendsHint", { defaultValue: "Ushbu lookni ulashing" })}
        </p>

        <div className="grid grid-cols-4 gap-[clamp(6px,2vw,12px)]">
          {NETWORKS.map((net) => (
            <a
              key={net.key}
              href={hrefFor(net.key)}
              target="_blank"
              rel="noopener noreferrer"
              aria-disabled={Boolean(busy)}
              onClick={(event) => {
                event.preventDefault();
                if (busy) return;
                void run(net.key, async () => {
                  const url = await ensureLink();
                  const text = shareText || pickMorphShareText(t, { style: title });
                  if (net.key === "telegram") {
                    trackMorphShare("telegram_shared", { surface: "preview", styleId });
                    window.open(buildTelegramShareUrl(url, text), "_blank", "noopener,noreferrer");
                    return;
                  }
                  if (net.key === "facebook") {
                    window.open(buildFacebookShareUrl(url), "_blank", "noopener,noreferrer");
                    return;
                  }
                  await copyTextToClipboard(`${text}\n${url}`);
                  window.open(
                    net.key === "instagram" ? INSTAGRAM_WEB_URL : TIKTOK_WEB_URL,
                    "_blank",
                    "noopener,noreferrer",
                  );
                  toast.success(t("aiStylePage.linkCopied"));
                });
              }}
              className={cn(
                "flex min-w-0 flex-col items-center gap-1.5",
                busy && busy !== net.key && "pointer-events-none opacity-60",
              )}
            >
              <span
                className="grid size-[clamp(46px,13vw,56px)] place-items-center rounded-full text-white"
                style={{ background: net.color }}
              >
                {busy === net.key ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <NetworkIcon network={net.key} />
                )}
              </span>
              <span className="max-w-full truncate text-[clamp(10px,2.8vw,12px)] font-semibold text-[#0A0A0A]">
                {net.label}
              </span>
            </a>
          ))}
        </div>

        <a
          href={link || INSTAGRAM_WEB_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 block truncate rounded-2xl bg-neutral-100 px-3 py-3 text-center text-[clamp(11px,3vw,13px)] font-semibold text-[#0A0A0A]"
          onClick={(event) => {
            if (link) return;
            event.preventDefault();
            void run("copy", async () => {
              const url = await ensureLink();
              await copyTextToClipboard(url);
              toast.success(t("aiStylePage.linkCopied"));
            });
          }}
        >
          {link || t("aiStylePage.copyLink", { defaultValue: "Havola tayyorlanmoqda" })}
        </a>

        <div className="mt-3 grid grid-cols-2 gap-2">
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
            className="inline-flex min-h-[clamp(44px,12vw,48px)] items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-2 text-[clamp(13px,3.4vw,14px)] font-bold"
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
            className="inline-flex min-h-[clamp(44px,12vw,48px)] items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-2 text-[clamp(13px,3.4vw,14px)] font-bold"
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
    </>,
    document.body,
  );
}

function NetworkIcon({ network }: { network: NetworkKey }) {
  if (network === "instagram") {
    return (
      <svg viewBox="0 0 24 24" className="size-[clamp(20px,5.6vw,26px)]" aria-hidden>
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.6" fill="none" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" />
      </svg>
    );
  }
  if (network === "telegram") {
    return (
      <svg viewBox="0 0 24 24" className="size-[clamp(20px,5.6vw,26px)]" aria-hidden>
        <path
          fill="currentColor"
          d="M20.8 4.4 3.6 11c-.9.3-.9.9-.2 1.1l4.4 1.4 1.7 5.2c.2.6.1.8.7.8.4 0 .6-.2.8-.4l2.1-2 4.4 3.2c.8.4 1.4.2 1.6-.7l2.8-13.2c.3-1.1-.4-1.6-1.1-1.2Zm-3.2 3.1-6.7 6.1-.3 2.6-1.2-3.7 8.2-5Z"
        />
      </svg>
    );
  }
  if (network === "tiktok") {
    return (
      <svg viewBox="0 0 24 24" className="size-[clamp(20px,5.6vw,26px)]" aria-hidden>
        <path
          fill="currentColor"
          d="M14.2 3.2c.5 2.6 2 4.3 4.5 4.6v2.6c-1.5 0-2.9-.5-4.1-1.3v6.7c0 3.4-2.7 6.1-6.3 6.1S2 19.2 2 15.8c0-3.3 2.6-6 5.9-6.1v2.7c-1.6.2-2.8 1.5-2.8 3.1 0 1.7 1.4 3.1 3.2 3.1s3.1-1.4 3.1-3.1V3.2h2.8Z"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" className="size-[clamp(20px,5.6vw,26px)]" aria-hidden>
      <path
        fill="currentColor"
        d="M14.2 8.2V6.6c0-.8.4-1.2 1.2-1.2H17V3h-2.3C12.1 3 11 4.5 11 6.7v1.5H9v2.6h2V21h3.2v-9.2h2.2l.4-2.6h-2.6Z"
      />
    </svg>
  );
}
