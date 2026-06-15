import { motion } from "framer-motion";
import { Loader2, ScanFace, Sparkles, Wand2 } from "lucide-react";
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
    <div className="relative h-full w-full overflow-hidden bg-neutral-950">
      <motion.img
        src={previewUrl}
        alt=""
        className="absolute inset-0 h-full w-full object-cover object-top"
        initial={{ scale: 1.04, filter: "blur(8px)" }}
        animate={{ scale: 1.08, filter: "blur(0px)" }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      />
      <div className="absolute inset-0 bg-black/25" />
      <div className="absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-black/90 via-black/50 to-transparent" />

      <div className="absolute inset-x-5 bottom-[14%] z-[1]">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          className="overflow-hidden rounded-[22px] border border-white/12 bg-white/[0.08] shadow-[0_20px_60px_-12px_rgba(0,0,0,0.65)] backdrop-blur-2xl"
        >
          <div className="flex items-center gap-4 px-5 py-4">
            <div className="relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-white/12">
              <ScanFace className="h-6 w-6 text-white" strokeWidth={1.75} />
              <motion.span
                className="absolute inset-0 rounded-2xl border border-white/35"
                animate={{ scale: [1, 1.18, 1], opacity: [0.7, 0, 0.7] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "easeOut" }}
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[15px] font-bold leading-tight text-white">
                {t("aiStylePage.faceChecking")}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-white/65">
                {t("aiStylePage.galleryValidatingHint")}
              </p>
            </div>
          </div>

          <div className="h-px bg-white/10" />

          <div className="px-5 py-3.5">
            <div className="h-1 overflow-hidden rounded-full bg-white/12">
              <motion.div
                className="h-full w-[38%] rounded-full bg-white"
                animate={{ x: ["-120%", "320%"] }}
                transition={{ duration: 1.35, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>
            <div className="mt-3 flex items-center justify-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-white/90"
                  animate={{ opacity: [0.2, 1, 0.2], scale: [0.85, 1, 0.85] }}
                  transition={{ duration: 1.1, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
                />
              ))}
            </div>
          </div>
        </motion.div>
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
  label?: string;
};

export function AiStyleAnalyzeCta({ analyzing, validating, onAnalyze, label }: AnalyzeCtaProps) {
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
      {analyzing
        ? (label ?? t("aiStylePage.analyzing"))
        : t("aiStylePage.analyzeCta")}
    </button>
  );
}

type TryOnCtaProps = {
  loading: boolean;
  validating?: boolean;
  disabled?: boolean;
  onTryOn: () => void;
};

export function AiStyleTryOnCta({ loading, validating, disabled, onTryOn }: TryOnCtaProps) {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      onClick={onTryOn}
      disabled={loading || validating || disabled}
      className={cn(
        "flex w-full items-center justify-center gap-2 rounded-2xl bg-foreground px-5 py-4 text-sm font-bold text-background active:scale-[0.98] disabled:opacity-60",
      )}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wand2 className="h-4 w-4" />}
      {loading ? t("aiStylePage.tryOnGenerating") : t("aiStylePage.tryOnMe")}
    </button>
  );
}
