import { ChevronLeft, Download, Loader2, Share2 } from "lucide-react";
import { useState } from "react";
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

  return (
    <div className="fixed inset-0 z-[260] flex flex-col bg-black">
      <div
        className="flex items-center gap-3 px-3 pb-2"
        style={{ paddingTop: "max(10px, env(safe-area-inset-top))" }}
      >
        <button
          type="button"
          onClick={onBack}
          className="grid size-9 place-items-center rounded-full bg-white/94"
          aria-label={t("common.back")}
        >
          <ChevronLeft className="h-5 w-5 text-[#0A0A0A]" strokeWidth={2.4} />
        </button>
        <h1 className="min-w-0 flex-1 truncate text-[16px] font-extrabold text-white">{title}</h1>
      </div>

      <div className="relative min-h-0 flex-1">
        <img src={image} alt={title} className="absolute inset-0 h-full w-full object-contain" />
      </div>

      <div
        className="grid grid-cols-2 gap-2 px-4 pt-3"
        style={{ paddingBottom: "max(16px, env(safe-area-inset-bottom))" }}
      >
        <button
          type="button"
          onClick={() => setShareOpen(true)}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-bold text-[#0A0A0A]"
        >
          <Share2 className="h-4 w-4" />
          {t("aiStylePage.share")}
        </button>
        <button
          type="button"
          disabled={downloading}
          onClick={() => void onDownload()}
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-[18px] bg-white text-[15px] font-bold text-[#0A0A0A] disabled:opacity-70"
        >
          {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
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
    </div>
  );
}
