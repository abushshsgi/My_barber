import { motion } from "framer-motion";
import { Loader2, ScanFace, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type PhotoInputProps = {
  fileRef: React.RefObject<HTMLInputElement | null>;
  onFile: (file: File | null | undefined) => void;
};

export function AiStylePhotoInput({ fileRef, onFile }: PhotoInputProps) {
  return (
    <input
      ref={fileRef}
      type="file"
      accept="image/jpeg,image/png,image/webp"
      hidden
      onChange={(e) => onFile(e.target.files?.[0])}
    />
  );
}

export function GalleryValidatingHero({ previewUrl }: { previewUrl: string }) {
  const { t } = useTranslation();

  return (
    <div className="relative h-full w-full overflow-hidden bg-black">
      <motion.img
        src={previewUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
        initial={{ scale: 1.08, opacity: 0.5 }}
        animate={{ scale: 1, opacity: 0.55 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-black/45" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_28%,rgba(0,0,0,0.55)_100%)]" />

      <motion.div
        className="pointer-events-none absolute inset-x-8 h-px bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_16px_rgba(255,255,255,0.85)]"
        animate={{ top: ["18%", "78%", "18%"] }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 grid place-items-center">
        <motion.div
          className="relative h-[min(52vw,220px)] w-[min(40vw,170px)]"
          animate={{ scale: [1, 1.03, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <motion.div
            className="absolute inset-0 rounded-[50%] border-2 border-dashed border-white/70"
            animate={{ opacity: [0.45, 1, 0.45] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute -inset-3 rounded-[50%] border border-white/25"
            animate={{ scale: [1, 1.08, 1], opacity: [0.35, 0.7, 0.35] }}
            transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          />
          <span className="absolute left-0 top-0 h-6 w-6 border-l-2 border-t-2 border-white" />
          <span className="absolute right-0 top-0 h-6 w-6 border-r-2 border-t-2 border-white" />
          <span className="absolute bottom-0 left-0 h-6 w-6 border-b-2 border-l-2 border-white" />
          <span className="absolute bottom-0 right-0 h-6 w-6 border-b-2 border-r-2 border-white" />
          <div className="absolute inset-0 grid place-items-center">
            <ScanFace className="h-10 w-10 text-white/90" strokeWidth={1.5} />
          </div>
        </motion.div>
      </div>

      <div className="absolute inset-x-0 bottom-[28%] z-[1] flex flex-col items-center gap-3 px-6 text-center text-white">
        <Loader2 className="h-6 w-6 animate-spin text-white/90" />
        <p className="text-base font-bold drop-shadow-md">{t("aiStylePage.faceChecking")}</p>
        <p className="max-w-[240px] text-xs text-white/80">{t("aiStylePage.galleryValidatingHint")}</p>
      </div>
    </div>
  );
}

export function AiStyleScanLine() {
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-6 h-px bg-foreground/80 shadow-[0_0_10px_rgba(0,0,0,0.25)]"
      animate={{ y: [32, 420, 32] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
  );
}

type AnalyzeCtaProps = {
  analyzing: boolean;
  validating?: boolean;
  onAnalyze: () => void;
};

export function AiStyleAnalyzeCta({ analyzing, validating, onAnalyze }: AnalyzeCtaProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onAnalyze}
      disabled={analyzing || validating}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60",
      )}
    >
      {analyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
      {analyzing ? t("aiStylePage.analyzing") : t("aiStylePage.analyzeCta")}
    </button>
  );
}
