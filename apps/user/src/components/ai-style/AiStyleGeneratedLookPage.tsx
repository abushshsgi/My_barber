import { ChevronLeft, Download, Loader2, Share2 } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { AiStyleShareSheet } from "@/components/ai-style/AiStyleShareSheet";
import { downloadAiStyleImage } from "@/lib/ai-style-image";

type Props = {
  title: string;
  styleId: string;
  image: string;
  onBack: () => void;
};

export function AiStyleGeneratedLookPage({ title, styleId, image, onBack }: Props) {
  const { t } = useTranslation();
  const [shareOpen, setShareOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mounted]);

  const onDownload = async () => {
    setDownloading(true);
    try {
      const slug = title.replace(/[^a-z0-9]+/gi, "-").toLowerCase() || "look";
      await downloadAiStyleImage(image, `morf-ai-${slug}.jpg`);
      toast.success(t("aiStylePage.downloaded"));
    } catch {
      toast.error(t("aiStylePage.downloadFailed"));
    } finally {
      setDownloading(false);
    }
  };

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div
        className="flex shrink-0 items-center gap-2 px-[clamp(10px,3vw,16px)] pb-2"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 shrink-0 place-items-center rounded-full bg-white/94"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.4} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[clamp(15px,4.2vw,18px)] font-extrabold text-white">
          {title}
        </h1>
      </div>

      <div className="relative min-h-0 flex-1">
        <img
          src={image}
          alt={title}
          className="absolute inset-0 h-full w-full object-cover object-[center_16%] sm:object-[center_20%]"
        />
      </div>

      <div
        className="mx-auto grid w-full max-w-lg shrink-0 grid-cols-2 gap-[clamp(8px,2vw,12px)] px-[clamp(12px,4vw,20px)] pt-3"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex min-h-[clamp(46px,12vw,52px)] items-center justify-center gap-2 rounded-[18px] bg-white px-2 text-[clamp(14px,3.8vw,16px)] font-bold text-[#0A0A0A]"
        >
          <Share2 className="h-4 w-4 shrink-0" />
          {t("aiStylePage.share")}
        </button>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void onDownload()}
          className="inline-flex min-h-[clamp(46px,12vw,52px)] items-center justify-center gap-2 rounded-[18px] bg-white px-2 text-[clamp(14px,3.8vw,16px)] font-bold text-[#0A0A0A] disabled:opacity-70"
        >
          {downloading ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          ) : (
            <Download className="h-4 w-4 shrink-0" />
          )}
          {t("aiStylePage.download")}
        </button>
      </div>

      {shareOpen ? (
        <AiStyleShareSheet
          open
          onClose={() => setShareOpen(false)}
          styleId={styleId}
          title={title}
          previewImage={image}
        />
      ) : null}
    </div>,
    document.body,
  );
}
